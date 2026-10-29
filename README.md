# pwnctual

A defensive security wargame. Each level is a small C or Python program with a real
vulnerability. You fix the code in the browser and submit it. The server compiles it, runs it
against hidden tests, and records your progress.

- **Functional tests** check that the program still does its job.
- **Attack tests** feed it hostile input (oversized lines, format strings and so on). C is built
  with `-fsanitize=address,undefined`, so a memory bug fails the test even if it doesn't crash.

Free and open source. No sign-up: the browser gets an anonymous session token.

## Layout

| Path | What it is |
| --- | --- |
| `web/` | The site (Cloudflare Pages). Plain HTML, CSS and JS, plus a bundled CodeMirror 6 editor in `web/vendor/`. |
| `editor/` | Source for the editor bundle. Rebuild with `npm run build:editor`. |
| `api/` | The API (Cloudflare Workers, TypeScript) and the D1 schema in `api/migrations/`. |
| `runner/` | The service on the VM that runs submissions in containers. Setup: [`runner/deploy/SETUP.md`](runner/deploy/SETUP.md). |
| `levels/` | One folder per level. |
| `scripts/validate-levels.mjs` | Checks that every level is solvable and that its attacks catch the bug. |

## Level format

```
levels/c-01-greeting/
  level.json      title, description, hints, difficulty, language (shown to players)
  vulnerable.c    the code players start from (shown to players)
  tests.json      functional and attack tests (server only, not in this repo)
  solution.c      a reference fix (server only, not in this repo)
```

`tests.json` and `solution.*` are in `.gitignore` so the answers aren't public.
Keep them somewhere private and copy them to the runner VM (see the setup guide).

Tests are `{ "stdin": ..., "expected": ... }`. Either value can be a plain string or
`{ "prefix", "repeat", "count", "suffix" }`, so a 10,000-character input stays one line.
`expected` is optional on attack tests.

New levels also need one line in `api/src/levels.ts`, and their folder copied to the runner VM.

## How code runs

The Worker sends `{ levelId, code }` to the runner on an Oracle Ampere VM, over HTTPS through
a Cloudflare Tunnel, with an API key. The runner holds the hidden tests. It compiles C with
`-fsanitize=address,undefined` and runs every test in a fresh container: no network, read-only
filesystem except `/tmp`, 2 s of CPU, 256 MB of memory, 64 KB of output. It returns pass/fail
per category and the Worker records progress in D1.

Submissions are limited to 64 KB of code, 5 per minute and 60 per hour per user. New sessions
are limited to 10 per hour per IP.

## Run it locally

Without Docker, the runner can run code directly on your machine. That is not a sandbox, so
only do it with code you wrote.

```bash
npm install
cp api/.dev.vars.example api/.dev.vars
npm run db:migrate:local
npm run dev:runner            # http://127.0.0.1:8080, RUNNER_EXECUTOR=local
npm run dev:api               # http://127.0.0.1:8787
npm run dev:web               # http://127.0.0.1:8788
npm run validate-levels
```
