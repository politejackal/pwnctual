// pwnctual runner: receives { levelId, code } from the Worker, runs the level's
// hidden tests in throwaway containers, and returns pass/fail.
//
// Listens on 127.0.0.1 only. HTTPS comes from a Cloudflare Tunnel in front of it.
//
//   RUNNER_KEY=...  LEVELS_DIR=/srv/pwnctual/levels  node runner/server.mjs
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { grade, loadLevel } from "./grade.mjs";
import { createDockerExecutor } from "./exec-docker.mjs";
import { createLocalExecutor } from "./exec-local.mjs";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "127.0.0.1";
const LEVELS_DIR = process.env.LEVELS_DIR ?? new URL("../levels", import.meta.url).pathname;
const KEY = process.env.RUNNER_KEY ?? "";
const MAX_CODE_BYTES = 64 * 1024;
const MAX_RUNNING = Number(process.env.MAX_RUNNING ?? 2); // submissions graded at the same time
const MAX_WAITING = Number(process.env.MAX_WAITING ?? 20);

if (KEY.length < 32) {
  console.error("Set RUNNER_KEY to a random string of at least 32 characters.");
  process.exit(1);
}

const executor = process.env.RUNNER_EXECUTOR === "local" ? createLocalExecutor() : createDockerExecutor();

// A simple queue: at most MAX_RUNNING gradings at once, at most MAX_WAITING in line.
let running = 0;
const waiting = [];
async function withSlot(fn) {
  if (running >= MAX_RUNNING) {
    if (waiting.length >= MAX_WAITING) return null;
    await new Promise(resolve => waiting.push(resolve));
  }
  running++;
  try {
    return { value: await fn() };
  } finally {
    running--;
    waiting.shift()?.();
  }
}

function authorised(req) {
  const given = Buffer.from(req.headers.authorization?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(KEY);
  return given.length === want.length && timingSafeEqual(given, want);
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, executor: executor.name, running, waiting: waiting.length });
    }
    if (!authorised(req)) return send(res, 401, { error: "Bad or missing API key" });
    if (req.method !== "POST" || req.url !== "/run") return send(res, 404, { error: "Not found" });

    const raw = await readBody(req, MAX_CODE_BYTES * 2);
    if (raw === null) return send(res, 413, { error: "Request too large" });
    let body;
    try { body = JSON.parse(raw); } catch { return send(res, 400, { error: "Body must be JSON" }); }
    const { levelId, code } = body ?? {};
    if (typeof levelId !== "string" || typeof code !== "string") {
      return send(res, 400, { error: "Send { levelId, code }" });
    }
    if (Buffer.byteLength(code) > MAX_CODE_BYTES) return send(res, 413, { error: "Code is too long (64 KB max)" });

    const level = await loadLevel(LEVELS_DIR, levelId);
    if (!level) return send(res, 404, { error: "No such level" });

    const started = Date.now();
    const slot = await withSlot(() => grade(executor, level, code));
    if (!slot) return send(res, 503, { error: "Too many submissions waiting. Try again shortly." });
    console.log(`${levelId} passed=${slot.value.passed} ${Date.now() - started}ms`);
    send(res, 200, slot.value);
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "Runner error" });
  }
}).listen(PORT, HOST, () => {
  console.log(`pwnctual runner on http://${HOST}:${PORT} (executor: ${executor.name}, levels: ${LEVELS_DIR})`);
});
