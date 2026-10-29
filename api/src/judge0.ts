// Talks to a self-hosted Judge0 (https://github.com/judge0/judge0) over its
// batch API: create every run at once, then poll until all have finished.

export interface Judge0Env {
  JUDGE0_URL: string;
  JUDGE0_TOKEN: string;
}

export interface RunRequest {
  source: string;
  languageId: number;
  stdin: string;
  compilerOptions?: string;
}

export interface RunResult {
  statusId: number;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  exitCode: number | null;
}

// Hard limits for every run, whatever the level.
const LIMITS = {
  cpu_time_limit: 2, // seconds
  cpu_extra_time: 0.5,
  wall_time_limit: 5, // seconds, catches programs that sleep instead of spin
  memory_limit: 262144, // KB. AddressSanitizer needs headroom
  stack_limit: 64000, // KB
  max_processes_and_or_threads: 8,
  max_file_size: 64, // KB the program may write to disk
  enable_network: false,
  redirect_stderr_to_stdout: false,
  number_of_runs: 1,
};

const FIELDS = "token,status_id,stdout,stderr,compile_output,message,exit_code";
const POLL_INTERVAL_MS = 750;
const POLL_DEADLINE_MS = 30000;
// Judge0 keeps the full output; we only ever need the start of it.
const KEEP_OUTPUT_CHARS = 64 * 1024;

export class Judge0Error extends Error {}

export async function runBatch(env: Judge0Env, runs: RunRequest[]): Promise<RunResult[]> {
  if (!env.JUDGE0_URL) throw new Judge0Error("JUDGE0_URL is not set");
  const base = env.JUDGE0_URL.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", "X-Auth-Token": env.JUDGE0_TOKEN ?? "" };

  const created = await fetch(`${base}/submissions/batch?base64_encoded=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      submissions: runs.map(r => ({
        ...LIMITS,
        language_id: r.languageId,
        source_code: toBase64(r.source),
        stdin: toBase64(r.stdin),
        compiler_options: r.compilerOptions ?? null,
      })),
    }),
  });
  if (!created.ok) throw new Judge0Error(`Judge0 rejected the batch: HTTP ${created.status}`);
  const tokens = (await created.json()) as { token?: string }[];
  if (tokens.length !== runs.length || tokens.some(t => !t.token)) {
    throw new Judge0Error(`Judge0 rejected a submission: ${JSON.stringify(tokens).slice(0, 300)}`);
  }

  const query = tokens.map(t => t.token).join(",");
  const deadline = Date.now() + POLL_DEADLINE_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(`${base}/submissions/batch?tokens=${query}&base64_encoded=true&fields=${FIELDS}`, {
      headers,
    });
    if (!res.ok) throw new Judge0Error(`Judge0 poll failed: HTTP ${res.status}`);
    const { submissions } = (await res.json()) as { submissions: Judge0Submission[] };
    // 1 = In Queue, 2 = Processing
    if (submissions.every(s => s.status_id > 2)) {
      return submissions.map(s => ({
        statusId: s.status_id,
        stdout: fromBase64(s.stdout),
        stderr: fromBase64(s.stderr),
        compileOutput: fromBase64(s.compile_output),
        message: fromBase64(s.message),
        exitCode: s.exit_code,
      }));
    }
  }
  throw new Judge0Error("Judge0 took too long to finish the batch");
}

interface Judge0Submission {
  token: string;
  status_id: number;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  exit_code: number | null;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(b64: string | null): string {
  if (!b64) return "";
  // Judge0 wraps its base64 output at 60 characters
  const binary = atob(b64.replace(/\s+/g, ""));
  const bytes = Uint8Array.from(binary.slice(0, KEEP_OUTPUT_CHARS * 4), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes).slice(0, KEEP_OUTPUT_CHARS);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
