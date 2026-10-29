// Runs a submission against a level's hidden tests and turns Judge0's results
// into messages that are safe to show: what went wrong, never the test itself.
import { runBatch, type Judge0Env, type RunResult } from "./judge0";
import { expandText, type Level, type TestCase } from "./levels";

export interface GradeEnv extends Judge0Env {
  JUDGE0_LANGUAGE_C: string;
  JUDGE0_LANGUAGE_PYTHON: string;
}

// Memory bugs get reported even when they don't happen to crash.
// -fno-sanitize-recover makes UBSan stop the program instead of only printing.
const C_FLAGS = "-g -fsanitize=address,undefined -fno-sanitize-recover=all -fno-omit-frame-pointer";

// Leak checking needs ptrace, which the Judge0 sandbox doesn't allow, and
// the levels aren't about leaks. Appended to every C submission.
const C_ASAN_OPTIONS = `
#line 1 "pwnctual"
const char *__asan_default_options(void) { return "detect_leaks=0"; }
`;

const SANITIZER = /(AddressSanitizer|UndefinedBehaviorSanitizer|LeakSanitizer)[^\n]*|runtime error:[^\n]*|stack smashing detected|buffer overflow detected/;

export interface TestOutcome {
  ok: boolean;
  reason?: string;
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

export async function grade(env: GradeEnv, level: Level, code: string): Promise<GradeResult> {
  const isC = level.language === "c";
  const languageId = Number(isC ? env.JUDGE0_LANGUAGE_C : env.JUDGE0_LANGUAGE_PYTHON);
  const source = isC ? code + C_ASAN_OPTIONS : code;
  const cases = [...level.tests.functional, ...level.tests.attack];

  const results = await runBatch(env, cases.map(t => ({
    source,
    languageId,
    stdin: expandText(t.stdin),
    compilerOptions: isC ? C_FLAGS : undefined,
  })));

  // Status 6 = Compilation Error. Every run compiles the same code, so the first one is enough.
  const compileFail = results.find(r => r.statusId === 6);
  if (compileFail) {
    return { passed: false, compileError: cleanCompileOutput(compileFail.compileOutput) };
  }
  // 13 = Internal Error, 14 = Exec Format Error: a problem on our side, not the user's
  const broken = results.find(r => r.statusId === 13 || r.statusId === 14);
  if (broken) throw new Error(`Judge0 internal error: ${broken.message}`);

  const nFunctional = level.tests.functional.length;
  const functional = summarise(cases.slice(0, nFunctional), results.slice(0, nFunctional));
  const attack = summarise(cases.slice(nFunctional), results.slice(nFunctional));
  return {
    passed: functional.passed === functional.total && attack.passed === attack.total,
    functional,
    attack,
  };
}

function summarise(cases: TestCase[], results: RunResult[]): CategoryResult {
  const failures: CategoryResult["failures"] = [];
  results.forEach((res, i) => {
    const outcome = judge(cases[i], res);
    if (!outcome.ok) failures.push({ test: i + 1, reason: outcome.reason! });
  });
  return { passed: results.length - failures.length, total: results.length, failures };
}

function judge(test: TestCase, res: RunResult): TestOutcome {
  const sanitizer = res.stderr.match(SANITIZER);
  if (sanitizer) return { ok: false, reason: `Memory error detected (${sanitizerSummary(sanitizer[0])})` };
  switch (res.statusId) {
    case 5: return { ok: false, reason: "Took longer than 2 seconds" };
    case 7: return { ok: false, reason: "Crashed (segmentation fault)" };
    case 8: return { ok: false, reason: "Wrote too much to disk" };
    case 9: return { ok: false, reason: "Crashed (floating point exception)" };
    case 10: return { ok: false, reason: "Crashed (aborted)" };
    case 11: return { ok: false, reason: `Exited with code ${res.exitCode ?? "?"}` };
    case 12: return { ok: false, reason: "Crashed" };
  }
  if (test.expected !== undefined && normalise(res.stdout) !== normalise(expandText(test.expected))) {
    return { ok: false, reason: "Wrong output" };
  }
  return { ok: true };
}

// "AddressSanitizer: stack-buffer-overflow on address 0x7ff..." -> "stack-buffer-overflow"
function sanitizerSummary(line: string): string {
  const asan = line.match(/Sanitizer: ([\w-]+)/);
  if (asan) return asan[1];
  if (line.startsWith("runtime error:")) return "undefined behaviour";
  return line.slice(0, 60);
}

function normalise(text: string): string {
  return text.replace(/\r\n/g, "\n").split("\n").map(l => l.trimEnd()).join("\n").trimEnd();
}

function cleanCompileOutput(text: string): string {
  return text.slice(0, 4000);
}
