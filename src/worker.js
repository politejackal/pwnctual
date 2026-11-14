// The server side of pwnctual: GitHub sign-in, profiles and saved progress.
// Every other path is a static file from web/ and never reaches this code.
import { COURSE } from "../web/course-data.js";

const SESSION_DAYS = 30;
const LESSONS = new Map(
  COURSE.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => [`${c.id}/${m.id}/${l.id}`, l]))),
);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/auth/github") return signIn(request, env, url);
      if (path === "/auth/callback") return await callback(request, env, url);
      if (path === "/auth/logout" && request.method === "POST") return await logout(request, env);
      if (path === "/api/me") return await me(request, env);
      if (path === "/api/progress" && request.method === "POST") return await progress(request, env);
      if (path === "/api/submit" && request.method === "POST") return await submit(request, env);
      if (path.startsWith("/api/users/")) return await profile(env, decodeURIComponent(path.slice(11)));
      if (path.startsWith("/u/")) return env.ASSETS.fetch(new Request(new URL("/profile", url), request));
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err);
      return json({ error: "Something went wrong" }, 500);
    }
  },
};

// ---- Sign in with GitHub ----

function signIn(request, env, url) {
  const state = randomToken();
  const back = safePath(url.searchParams.get("return"));
  const github = new URL("https://github.com/login/oauth/authorize");
  github.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  github.searchParams.set("redirect_uri", `${url.origin}/auth/callback`);
  github.searchParams.set("state", state);
  github.searchParams.set("allow_signup", "true");
  return redirect(github.toString(), [cookie("oauth", `${state}|${back}`, 600, url)]);
}

async function callback(request, env, url) {
  const [state, back] = (readCookie(request, "oauth") || "").split("|");
  const clear = cookie("oauth", "", 0, url);
  if (!state || url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    return redirect("/", [clear]);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: url.searchParams.get("code"),
      redirect_uri: `${url.origin}/auth/callback`,
    }),
  });
  const { access_token } = await tokenRes.json();
  if (!access_token) return redirect("/", [clear]);

  const userRes = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${access_token}`, accept: "application/vnd.github+json", "user-agent": "pwnctual" },
  });
  if (!userRes.ok) return redirect("/", [clear]);
  const gh = await userRes.json();

  const now = Date.now();
  // GitHub usernames can be renamed and reused: whoever owns a name now gets it
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET login = login || '~' || id WHERE login = ? AND id != ?").bind(gh.login, gh.id),
    env.DB.prepare(
      `INSERT INTO users (id, login, name, avatar, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET login = excluded.login, name = excluded.name, avatar = excluded.avatar`,
    ).bind(gh.id, gh.login, gh.name || null, gh.avatar_url || null, now),
  ]);

  const token = randomToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), gh.id, now + SESSION_DAYS * 864e5).run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();

  return redirect(back || "/", [clear, cookie("sid", token, SESSION_DAYS * 86400, url)]);
}

async function logout(request, env) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const token = readCookie(request, "sid");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, [cookie("sid", "", 0, new URL(request.url))]);
}

// ---- The signed-in user and their progress ----

async function currentUser(request, env) {
  const token = readCookie(request, "sid");
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.id, u.login, u.name, u.avatar, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await sha256(token), Date.now()).first();
}

async function doneList(env, userId) {
  const { results } = await env.DB.prepare("SELECT lesson FROM completions WHERE user_id = ?").bind(userId).all();
  return results.map((r) => r.lesson);
}

async function me(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ user: null });
  return json({ user: publicUser(user), done: await doneList(env, user.id) });
}

// Mark reading lessons done or not done. Also used once to bring over progress saved before signing in.
async function progress(request, env) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Not signed in" }, 401);
  const body = await request.json().catch(() => ({}));
  // Challenges only count with the right flag, through /api/submit
  const add = [].concat(body.add || []).filter((k) => LESSONS.has(k) && !LESSONS.get(k).challenge);
  const remove = [].concat(body.remove || []).filter((k) => LESSONS.has(k) && !LESSONS.get(k).challenge);
  const now = Date.now();
  const stmts = [
    ...add.map((k) => env.DB.prepare("INSERT OR IGNORE INTO completions (user_id, lesson, at) VALUES (?, ?, ?)").bind(user.id, k, now)),
    ...remove.map((k) => env.DB.prepare("DELETE FROM completions WHERE user_id = ? AND lesson = ?").bind(user.id, k)),
  ];
  if (stmts.length) await env.DB.batch(stmts);
  return json({ done: await doneList(env, user.id) });
}

// Check a challenge flag here, on the server
async function submit(request, env) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Not signed in" }, 401);
  const { lesson, flag } = await request.json().catch(() => ({}));
  const l = LESSONS.get(lesson);
  if (!l || !l.challenge || typeof flag !== "string") return json({ error: "Unknown challenge" }, 400);
  if ((await sha256(flag.trim())) !== l.challenge.flagHash) return json({ correct: false });
  await env.DB.prepare("INSERT OR IGNORE INTO completions (user_id, lesson, at) VALUES (?, ?, ?)")
    .bind(user.id, lesson, Date.now()).run();
  return json({ correct: true });
}

// ---- Public profiles: /u/<login> ----

async function profile(env, login) {
  const user = await env.DB.prepare("SELECT id, login, name, avatar, created_at FROM users WHERE login = ?").bind(login).first();
  if (!user) return json({ error: "No such user" }, 404);
  const { results } = await env.DB.prepare("SELECT lesson, at FROM completions WHERE user_id = ? ORDER BY at").bind(user.id).all();
  return json({ user: publicUser(user), done: results.filter((r) => LESSONS.has(r.lesson)) });
}

const publicUser = (u) => ({ login: u.login, name: u.name, avatar: u.avatar, joined: u.created_at });

// ---- Helpers ----

function json(data, status = 200, cookies = []) {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  cookies.forEach((c) => headers.append("set-cookie", c));
  return new Response(JSON.stringify(data), { status, headers });
}

function redirect(location, cookies = []) {
  const headers = new Headers({ location, "cache-control": "no-store" });
  cookies.forEach((c) => headers.append("set-cookie", c));
  return new Response(null, { status: 302, headers });
}

function cookie(name, value, maxAge, url) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function readCookie(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

// Only pages on this site may change someone's progress. Other sites can't send JSON with
// the cookie: SameSite=Lax keeps it off cross-site POSTs, and a JSON body needs CORS, which we don't allow.
function sameOrigin(request) {
  return (request.headers.get("content-type") || "").startsWith("application/json");
}

// Where to go after signing in: only a path on this site
function safePath(p) {
  return p && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") && !p.includes("|") ? p : "/";
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
