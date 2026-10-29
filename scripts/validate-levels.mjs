// Checks every level against a running runner:
//   - the vulnerable code must pass the functional tests and fail at least one attack test
//   - the reference solution must pass everything
//
//   RUNNER_URL=https://runner.pwnctual.com RUNNER_KEY=... npm run validate-levels
// Defaults to a local runner on 127.0.0.1:8080 with the key from api/.dev.vars.example.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const RUNNER_URL = (process.env.RUNNER_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");
const RUNNER_KEY = process.env.RUNNER_KEY ?? "dev-key-dev-key-dev-key-dev-key-1234";

async function grade(levelId, code) {
  const res = await fetch(`${RUNNER_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RUNNER_KEY}` },
    body: JSON.stringify({ levelId, code }),
  });
  if (!res.ok) throw new Error(`runner returned ${res.status}: ${await res.text()}`);
  return res.json();
}

const summary = r => r.compileError !== undefined
  ? "compile error"
  : `functional ${r.functional.passed}/${r.functional.total}, attack ${r.attack.passed}/${r.attack.total}`;

let failed = false;
for (const dir of (await readdir(join(root, "levels"))).sort()) {
  const base = join(root, "levels", dir);
  const meta = JSON.parse(await readFile(join(base, "level.json"), "utf8"));
  const ext = meta.language === "c" ? "c" : "py";
  const vulnerable = await readFile(join(base, `vulnerable.${ext}`), "utf8");
  const solution = await readFile(join(base, `solution.${ext}`), "utf8");

  const v = await grade(dir, vulnerable);
  const s = await grade(dir, solution);
  const problems = [];
  if (meta.id !== dir) problems.push(`level.json id "${meta.id}" doesn't match folder name`);
  if (v.compileError !== undefined) problems.push(`vulnerable code doesn't compile:\n${v.compileError}`);
  else {
    if (v.functional.passed !== v.functional.total) problems.push("vulnerable code fails functional tests (they should only test normal behaviour)");
    if (v.attack.passed === v.attack.total) problems.push("vulnerable code passes every attack test (the attacks don't catch the bug)");
  }
  if (!s.passed) problems.push(`solution doesn't pass: ${JSON.stringify(s)}`);

  console.log(`${problems.length ? "FAIL" : "ok  "} ${dir}`);
  console.log(`     vulnerable: ${summary(v)}${v.attack ? "  " + v.attack.failures.map(f => `#${f.test} ${f.reason}`).join("; ") : ""}`);
  console.log(`     solution:   ${summary(s)}`);
  for (const p of problems) console.log(`     - ${p}`);
  failed ||= problems.length > 0;
}
process.exit(failed ? 1 : 0);
