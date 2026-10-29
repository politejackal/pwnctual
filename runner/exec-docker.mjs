// Runs each step of a submission in a throwaway Docker container.
//
// Every container: no network, read-only root, /tmp as a small tmpfs, runs as
// nobody with no capabilities, can't gain privileges, and is removed on exit.
import { spawn } from "node:child_process";
import { collect } from "./collect.mjs";

const IMAGE = process.env.SANDBOX_IMAGE ?? "pwnctual-sandbox";

const COMMON = [
  "--rm",
  "--network", "none",
  "--read-only",
  "--cap-drop", "ALL",
  "--security-opt", "no-new-privileges",
  "--user", "65534:65534",
  "--cpus", "1",
  "--ulimit", "core=0",
  "--workdir", "/work",
];

export const RUN_ENV = {
  // Leak checking needs ptrace, which the container doesn't have, and the levels aren't about leaks
  ASAN_OPTIONS: "detect_leaks=0",
  UBSAN_OPTIONS: "print_stacktrace=1",
  PYTHONDONTWRITEBYTECODE: "1",
};

function docker(args, { stdin, timeoutMs, name, outputLimit }) {
  return new Promise(resolve => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    const kill = () => spawn("docker", ["kill", name], { stdio: "ignore" });
    const out = collect(child, { outputLimit, onLimit: kill });
    child.stdin.on("error", () => {});
    child.stdin.end(stdin ?? "");
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    child.on("close", code => {
      clearTimeout(timer);
      resolve({ ...out.result(), exitCode: code, timedOut });
    });
  });
}

export function createDockerExecutor() {
  return {
    name: "docker",

    // Compiles /work/main.c to /work/main. The job dir is the only writable mount.
    compile(job, flags) {
      const name = `pwn-${job.id}-cc`;
      return docker([
        "run", "--name", name, ...COMMON,
        "--memory", "512m", "--memory-swap", "512m", "--pids-limit", "64",
        "--tmpfs", "/tmp:rw,exec,size=64m",
        "-v", `${job.dir}:/work:rw`,
        IMAGE, "gcc", ...flags, "-o", "/work/main", "/work/main.c",
      ], { timeoutMs: 30_000, name, outputLimit: 64 * 1024 });
    },

    // Runs one test. The job dir is mounted read-only, so tests can't affect each other.
    run(job, n, { command, stdin, limits }) {
      const name = `pwn-${job.id}-${n}`;
      const env = Object.entries(RUN_ENV).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
      return docker([
        "run", "-i", "--name", name, ...COMMON, ...env,
        "--memory", `${limits.memoryMb}m`, "--memory-swap", `${limits.memoryMb}m`,
        "--pids-limit", "32",
        // Soft limit sends SIGXCPU, the hard limit a second later sends SIGKILL
        "--ulimit", `cpu=${limits.cpuSeconds}:${limits.cpuSeconds + 1}`,
        "--ulimit", `fsize=${limits.fileBytes}:${limits.fileBytes}`,
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
        "-v", `${job.dir}:/work:ro`,
        IMAGE, ...command,
      ], { stdin, timeoutMs: limits.wallSeconds * 1000, name, outputLimit: limits.outputBytes });
    },
  };
}

// Docker reports a signal death as 128 + signal number
export function signalFromExitCode(code) {
  return code > 128 && code < 160 ? code - 128 : null;
}
