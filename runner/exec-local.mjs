// DEVELOPMENT ONLY. NOT A SANDBOX.
// Runs gcc and python3 straight on this machine so the runner can be tested
// without Docker. Selected with RUNNER_EXECUTOR=local. Only run code you wrote.
import { spawn } from "node:child_process";
import { collect } from "./collect.mjs";
import { RUN_ENV } from "./exec-docker.mjs";

function run(cmd, args, { cwd, stdin, timeoutMs, outputLimit, env = {} }) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { cwd, env: { PATH: process.env.PATH, ...env } });
    const out = collect(child, { outputLimit, onLimit: () => child.kill("SIGKILL") });
    child.stdin.on("error", () => {});
    child.stdin.end(stdin ?? "");
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      // Report signals the way Docker does: 128 + signal number
      const signals = { SIGSEGV: 11, SIGFPE: 8, SIGABRT: 6, SIGKILL: 9, SIGXCPU: 24, SIGBUS: 7 };
      resolve({ ...out.result(), exitCode: signal ? 128 + (signals[signal] ?? 15) : code, timedOut });
    });
  });
}

export function createLocalExecutor() {
  console.warn("RUNNER_EXECUTOR=local: submissions run WITHOUT a sandbox. Development only.");
  return {
    name: "local",
    compile(job, flags) {
      return run("gcc", [...flags, "-o", "main", "main.c"], { cwd: job.dir, timeoutMs: 30_000, outputLimit: 64 * 1024 });
    },
    run(job, _n, { command, stdin, limits }) {
      const [cmd, ...args] = command.map(a => a.replace(/^\/work\//, "./"));
      return run(cmd === "./main" ? "./main" : cmd, args, {
        cwd: job.dir, stdin, timeoutMs: limits.wallSeconds * 1000, outputLimit: limits.outputBytes, env: RUN_ENV,
      });
    },
  };
}
