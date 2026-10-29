// DEVELOPMENT ONLY. NOT A SANDBOX.
// A stand-in for Judge0's batch API that compiles with the local gcc and runs
// programs directly on this machine, so the Worker can be tested end to end
// before the real Judge0 server exists. Only run code you wrote yourself.
//
//   JUDGE0_TOKEN=change-me node dev/fake-judge0.mjs
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 2358);
const TOKEN = process.env.JUDGE0_TOKEN ?? "change-me";
const LANGUAGES = { 50: "c", 71: "python" };
const jobs = new Map();

const b64 = s => (s == null ? null : Buffer.from(s).toString("base64").replace(/(.{60})/g, "$1\n"));
const unb64 = s => (s == null ? "" : Buffer.from(s, "base64").toString());

function run(cmd, args, { stdin = "", timeoutMs, cwd }) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { cwd, env: { PATH: process.env.PATH } });
    let stdout = "", stderr = "", timedOut = false;
    child.stdout.on("data", d => { if (stdout.length < 1e6) stdout += d; });
    child.stderr.on("data", d => { if (stderr.length < 1e6) stderr += d; });
    child.stdin.on("error", () => {});
    child.stdin.end(stdin);
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

async function judge(sub) {
  const dir = await mkdtemp(join(tmpdir(), "fake-judge0-"));
  try {
    const lang = LANGUAGES[sub.language_id];
    const source = unb64(sub.source_code);
    const stdin = unb64(sub.stdin);
    const timeoutMs = (sub.wall_time_limit ?? 5) * 1000;
    let res;
    if (lang === "c") {
      await writeFile(join(dir, "main.c"), source);
      const flags = (sub.compiler_options ?? "").split(/\s+/).filter(Boolean);
      const cc = await run("gcc", [...flags, "main.c", "-o", "main", "-lm"], { cwd: dir, timeoutMs: 20000 });
      if (cc.code !== 0) return { status_id: 6, compile_output: cc.stderr + cc.stdout };
      res = await run("./main", [], { cwd: dir, stdin, timeoutMs });
    } else if (lang === "python") {
      await writeFile(join(dir, "script.py"), source);
      res = await run("python3", ["script.py"], { cwd: dir, stdin, timeoutMs });
    } else {
      return { status_id: 13, message: `unknown language ${sub.language_id}` };
    }
    let status_id = 3;
    if (res.timedOut) status_id = 5;
    else if (res.signal === "SIGSEGV") status_id = 7;
    else if (res.signal === "SIGFPE") status_id = 9;
    else if (res.signal === "SIGABRT") status_id = 10;
    else if (res.signal) status_id = 12;
    else if (res.code !== 0) status_id = 11;
    return { status_id, stdout: res.stdout, stderr: res.stderr, exit_code: res.code };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.headers["x-auth-token"] !== TOKEN) return send(401, { error: "Authentication failed." });

  if (req.method === "POST" && url.pathname === "/submissions/batch") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { submissions } = JSON.parse(body);
    const tokens = submissions.map(sub => {
      const token = randomUUID();
      jobs.set(token, { token, status_id: 1 });
      judge(sub).then(r => jobs.set(token, { token, ...r }), e => jobs.set(token, { token, status_id: 13, message: String(e) }));
      return { token };
    });
    return send(201, tokens);
  }

  if (req.method === "GET" && url.pathname === "/submissions/batch") {
    const subs = (url.searchParams.get("tokens") ?? "").split(",").map(t => {
      const j = jobs.get(t) ?? { token: t, status_id: 13, message: "unknown token" };
      return {
        token: j.token, status_id: j.status_id, exit_code: j.exit_code ?? null,
        stdout: b64(j.stdout), stderr: b64(j.stderr), compile_output: b64(j.compile_output), message: b64(j.message),
      };
    });
    return send(200, { submissions: subs });
  }
  send(404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`fake Judge0 on http://127.0.0.1:${PORT} (dev only, not a sandbox)`));
