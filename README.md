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
| `levels/` | One folder per level. |
| `scripts/validate-levels.mjs` | Checks that every level is solvable and that its attacks catch the bug. |
| `dev/fake-judge0.mjs` | **Development only.** Imitates Judge0's API with your local gcc. Not a sandbox. |

## Level format

```
levels/c-01-greeting/
  level.json      title, description, hints, difficulty, language (shown to players)
  vulnerable.c    the code players start from (shown to players)
  tests.json      functional and attack tests (server only, not in this repo)
  solution.c      a reference fix (server only, not in this repo)
```

`tests.json` and `solution.*` are in `.gitignore` so the answers aren't public.
Keep them somewhere private. Deploys and `validate-levels` read them from your local folder.

Tests are `{ "stdin": ..., "expected": ... }`. Either value can be a plain string or
`{ "prefix", "repeat", "count", "suffix" }`, so a 10,000-character input stays one line.
`expected` is optional on attack tests.

New levels also need one line in `api/src/levels.ts`.

## How code runs

The Worker sends each submission to a self-hosted [Judge0](https://github.com/judge0/judge0)
over HTTPS, as one batch with one run per test. Every run gets 2 s of CPU, 5 s of wall time,
256 MB of memory, 64 KB of disk writes and no network. Submissions are limited to 64 KB of
code, 5 per minute and 60 per hour per user. New sessions are limited to 10 per hour per IP.
Hidden tests are bundled into the Worker and never sent to the browser.

## Run it locally

```bash
npm install
cp api/.dev.vars.example api/.dev.vars
npm run db:migrate:local
node dev/fake-judge0.mjs      # or point JUDGE0_URL in api/.dev.vars at a real Judge0
npm run dev:api               # http://127.0.0.1:8787
npm run dev:web               # http://127.0.0.1:8788
npm run validate-levels
```

## Judge0 server settings

Set these in `judge0.conf`:

```
AUTHN_TOKEN=<long random string>     # the Worker's JUDGE0_TOKEN secret
ENABLE_NETWORK=false
ALLOW_ENABLE_NETWORK=false
ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT=false
ALLOW_ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT=false
ALLOWED_LANGUAGES_FOR_COMPILER_OPTIONS=C
```

Put it behind HTTPS on a hostname (for example through Caddy, or a Cloudflare proxied DNS
record) so the Worker can reach it.

