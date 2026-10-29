// pwnctual API. Runs on Cloudflare Workers (free plan), stores users and
// progress in D1, and sends code to the pwnctual runner on the VM to be tested.
import { LEVELS, findLevel } from "./levels";
import { gradeOnRunner, RunnerError, type RunnerEnv } from "./runner";

interface Env extends RunnerEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

const MAX_CODE_BYTES = 64 * 1024;
const RATE_LIMITS = [
  { windowMs: 60_000, max: 5, message: "Too many submissions. Wait a minute and try again." },
  { windowMs: 3_600_000, max: 60, message: "Too many submissions this hour. Try again later." },
];
const NEW_USERS_PER_IP_PER_HOUR = 10;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(request, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      console.error(err);
      const message = err instanceof RunnerError
        ? "The code runner is unavailable right now. Try again in a few minutes."
        : "Something went wrong on our side.";
      return json({ error: message }, 503, cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method;

  if (method === "POST" && pathname === "/api/session") return createSession(request, env);

  if (method === "GET" && pathname === "/api/levels") {
    const solved = await solvedLevels(env, await currentUser(request, env));
    return json(LEVELS.map(l => ({
      id: l.id, title: l.title, language: l.language, difficulty: l.difficulty, solved: solved.has(l.id),
    })));
  }

  const levelMatch = pathname.match(/^\/api\/levels\/([a-z0-9-]+)(\/submit)?$/);
  if (levelMatch) {
    const level = findLevel(levelMatch[1]);
    if (!level) return json({ error: "No such level" }, 404);
    if (method === "GET" && !levelMatch[2]) {
      const solved = await solvedLevels(env, await currentUser(request, env));
      return json({ ...level, solved: solved.has(level.id) });
    }
    if (method === "POST" && levelMatch[2]) return submit(request, env, level.id);
  }

  return json({ error: "Not found" }, 404);
}

async function createSession(request: Request, env: Env): Promise<Response> {
  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") ?? "unknown");
  const now = Date.now();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM users WHERE ip_hash = ? AND created_at > ?",
  ).bind(ipHash, now - 3_600_000).first<{ n: number }>();
  if ((recent?.n ?? 0) >= NEW_USERS_PER_IP_PER_HOUR) {
    return json({ error: "Too many new sessions from your network. Try again later." }, 429);
  }
  const token = randomToken();
  await env.DB.prepare("INSERT INTO users (token_hash, ip_hash, created_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), ipHash, now).run();
  return json({ token });
}

async function submit(request: Request, env: Env, levelId: string): Promise<Response> {
  const userId = await currentUser(request, env);
  if (userId === null) return json({ error: "Missing or unknown session token" }, 401);

  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = body?.code;
  if (typeof code !== "string" || code.trim() === "") return json({ error: "Send your code as { code }" }, 400);
  if (new TextEncoder().encode(code).length > MAX_CODE_BYTES) {
    return json({ error: "Code is too long (64 KB max)" }, 413);
  }

  const now = Date.now();
  for (const limit of RATE_LIMITS) {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND created_at > ?",
    ).bind(userId, now - limit.windowMs).first<{ n: number }>();
    if ((row?.n ?? 0) >= limit.max) return json({ error: limit.message }, 429);
  }
  // Recorded before running, so firing many requests at once still counts each one.
  const inserted = await env.DB.prepare(
    "INSERT INTO submissions (user_id, level_id, created_at) VALUES (?, ?, ?) RETURNING id",
  ).bind(userId, levelId, now).first<{ id: number }>();

  const result = await gradeOnRunner(env, levelId, code);

  const writes = [
    env.DB.prepare("UPDATE submissions SET passed = ? WHERE id = ?").bind(result.passed ? 1 : 0, inserted!.id),
  ];
  if (result.passed) {
    writes.push(env.DB.prepare(
      "INSERT OR IGNORE INTO progress (user_id, level_id, solved_at) VALUES (?, ?, ?)",
    ).bind(userId, levelId, Date.now()));
  }
  await env.DB.batch(writes);
  return json(result);
}

async function currentUser(request: Request, env: Env): Promise<number | null> {
  const token = request.headers.get("Authorization")?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];
  if (!token) return null;
  const row = await env.DB.prepare("SELECT id FROM users WHERE token_hash = ?")
    .bind(await sha256(token)).first<{ id: number }>();
  return row?.id ?? null;
}

async function solvedLevels(env: Env, userId: number | null): Promise<Set<string>> {
  if (userId === null) return new Set();
  const { results } = await env.DB.prepare("SELECT level_id FROM progress WHERE user_id = ?")
    .bind(userId).all<{ level_id: string }>();
  return new Set(results.map(r => r.level_id));
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
