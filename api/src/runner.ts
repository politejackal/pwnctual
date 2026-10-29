// Client for the pwnctual runner on the VM (see /runner). The runner holds the
// hidden tests, so the Worker only sends the level id and the code.

export interface RunnerEnv {
  RUNNER_URL: string;
  RUNNER_KEY: string;
}

export interface CategoryResult {
  passed: number;
  total: number;
  failures: { test: number; reason: string }[];
}

export interface GradeResult {
  passed: boolean;
  compileError?: string;
  functional?: CategoryResult;
  attack?: CategoryResult;
}

export class RunnerError extends Error {}

const TIMEOUT_MS = 90_000;

export async function gradeOnRunner(env: RunnerEnv, levelId: string, code: string): Promise<GradeResult> {
  if (!env.RUNNER_URL) throw new RunnerError("RUNNER_URL is not set");
  let res: Response;
  try {
    res = await fetch(`${env.RUNNER_URL.replace(/\/+$/, "")}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RUNNER_KEY}` },
      body: JSON.stringify({ levelId, code }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new RunnerError(`Runner unreachable: ${err}`);
  }
  if (res.status === 503) throw new RunnerError("Runner is busy");
  if (!res.ok) throw new RunnerError(`Runner returned HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
