// Runs a submission against a level's hidden tests and turns the results into
// messages that are safe to show: what went wrong, never the test itself.
import { mkdtemp, writeFile, rm, chmod, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { signalFromExitCode } from "./exec-docker.mjs";

export const LIMITS = {
  cpuSeconds: 2,
  wallSeconds: 5, // catches programs that sleep or block instead of using CPU
  memoryMb: 256,
  outputBytes: 64 * 1024, // per stream
  fileBytes: 1024 * 1024, // largest file a program may write in /tmp
};

// Memory bugs get reported even when they don't happen to crash.
// -fno-sanitize-recover makes UBSan stop the program instead of only printing.
const C_FLAGS = ["-g", "-fsanitize=address,undefined", "-fno-sanitize-recover=all", "-fno-omit-frame-pointer"];

const SANITIZER = /(AddressSanitizer|UndefinedBehaviorSanitizer|LeakSanitizer)[^\n]*|runtime error:[^\n]*|stack smashing detected|buffer overflow detected/;

const SIGNALS = {
  6: "aborted",
  7: "bus error",
  8: "floating point exception",
  9: "killed",
  11: "segmentation fault",
  24: "CPU time limit",
};

export async function loadLevel(levelsDir, id) {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    const dir = join(levelsDir, id);
    const meta = JSON.parse(await readFile(join(dir, "level.json"), "utf8"));
    const tests = JSON.parse(await readFile(join(dir, "tests.json"), "utf8"));
    return { ...meta, tests };
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export function expandText(spec) {
  if (typeof spec === "string") return spec;
  return (spec.prefix ?? "") + spec.repeat.repeat(spec.count) + (spec.suffix ?? "");
}

export async function grade(executor, level, code) {
  const job = { id: randomUUID().slice(0, 12), dir: await mkdtemp(join(tmpdir(), "pwnctual-job-")) };
  // The containers run as nobody and need to read (and, while compiling, write) this dir
  await chmod(job.dir, 0o777);
  try {
    let command;
    if (level.language === "c") {
      await writeFile(join(job.dir, "main.c"), code, { mode: 0o644 });
      const cc = await executor.compile(job, C_FLAGS);
      if (cc.timedOut) return { passed: false, compileError: "Compiling took too long." };
      if (cc.exitCode !== 0) {
        return { passed: false, compileError: (cc.stderr + cc.stdout).replaceAll("/work/", "").slice(0, 4000) };
      }
      command = ["/work/main"];
    } else if (level.language === "python") {
      await writeFile(join(job.dir, "main.py"), code, { mode: 0o644 });
      command = ["python3", "/work/main.py"];
    } else {
      throw new Error(`Unknown language ${level.language}`);
    }

    // Tests run one after another so one submission can't hog the machine
    const run = async (test, n) => judge(test, await executor.run(job, n, {
      command, stdin: expandText(test.stdin), limits: LIMITS,
    }), level.language);
    const functional = [];
    for (const [i, t] of level.tests.functional.entries()) functional.push(await run(t, `f${i}`));
    const attack = [];
    for (const [i, t] of level.tests.attack.entries()) attack.push(await run(t, `a${i}`));

    const summary = outcomes => ({
      passed: outcomes.filter(o => o.ok).length,
      total: outcomes.length,
      failures: outcomes.flatMap((o, i) => (o.ok ? [] : [{ test: i + 1, reason: o.reason }])),
    });
    const f = summary(functional);
    const a = summary(attack);
    return { passed: f.passed === f.total && a.passed === a.total, functional: f, attack: a };
  } finally {
    await rm(job.dir, { recursive: true, force: true });
  }
}

function judge(test, res, language) {
  // Docker itself failed (125: daemon error, 126/127: command couldn't run)
  if ([125, 126, 127].includes(res.exitCode) && !res.timedOut) {
    throw new Error(`Container failed to run: ${res.stderr.slice(0, 300)}`);
  }
  const sanitizer = res.stderr.match(SANITIZER);
  if (sanitizer) return { ok: false, reason: `Memory error detected (${sanitizerSummary(sanitizer[0])})` };
  if (res.timedOut) return { ok: false, reason: "Took longer than 5 seconds" };
  if (res.outputLimit) return { ok: false, reason: "Printed too much output" };
  const signal = signalFromExitCode(res.exitCode);
  if (signal === 24 || signal === 9) return { ok: false, reason: "Used more than 2 seconds of CPU" };
  if (signal) return { ok: false, reason: `Crashed (${SIGNALS[signal] ?? `signal ${signal}`})` };
  if (res.exitCode !== 0) {
    const exception = language === "python" && res.stderr.match(/^(\w+(?:Error|Exception)\w*)\b/m);
    return { ok: false, reason: exception ? `Uncaught ${exception[1]}` : `Exited with code ${res.exitCode}` };
  }
  if (test.expected !== undefined && normalise(res.stdout) !== normalise(expandText(test.expected))) {
    return { ok: false, reason: "Wrong output" };
  }
  return { ok: true };
}

// "AddressSanitizer: stack-buffer-overflow on address 0x..." -> "stack-buffer-overflow"
function sanitizerSummary(line) {
  const m = line.match(/Sanitizer: ([\w-]+)/);
  if (m) return m[1];
  if (line.startsWith("runtime error:")) return "undefined behaviour";
  return line.slice(0, 60);
}

function normalise(text) {
  return text.replace(/\r\n/g, "\n").split("\n").map(l => l.trimEnd()).join("\n").trimEnd();
}
