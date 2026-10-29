# pwnctual

A defensive security wargame. Each level is a small C or Python program with a real
vulnerability. You download it, fix it on your own computer, and run the included
`check.sh`. It prints PASS or FAIL.

- **Functional tests** check that the program still does its job.
- **Attack tests** feed it hostile input (oversized lines, format strings and so on). C is built
  with `-fsanitize=address,undefined`, so a memory bug fails the test even if it doesn't crash.

Players can work in GitHub Codespaces (every level is in
[pwnctual-levels](https://github.com/politejackal/pwnctual-levels), with gcc set up, on the
player's own free Codespaces hours) or download a level and work on their own computer.

The site is static. Nothing runs on a server, and there are no accounts: progress is a
checkbox saved in your browser.

## Layout

| Path | What it is |
| --- | --- |
| `web/` | The site (Cloudflare Pages). Plain HTML, CSS and JS, plus a bundled CodeMirror 6 viewer in `web/vendor/`. |
| `editor/` | Source for the CodeMirror bundle. Rebuild with `npm run build:editor`. |
| `levels/` | One folder per level. |
| `scripts/build-levels.mjs` | Turns `levels/` into `web/levels/`: the JSON each page reads and the zip players download. |
| `scripts/build-levels-repo.mjs` | Builds [pwnctual-levels](https://github.com/politejackal/pwnctual-levels), the repo players open in GitHub Codespaces. |

## Level format

```
levels/c-01-greeting/
  level.json        title, description, hints, difficulty, language (shown on the page)
  files/            exactly what goes in the zip
    vuln.c          the vulnerable program (also shown on the page)
    Makefile        builds with the sanitizers
    check.sh        builds, runs the tests, prints PASS or FAIL
    README.md       instructions, including WSL setup for Windows
  solution.c        a reference fix (not in this repo)
```

The zip unpacks to a folder named after the level. `check.sh` keeps its executable bit.

Before publishing a level, check that `check.sh` fails on the original code and passes on a fix:

```bash
npm run build:levels
cd "$(mktemp -d)" && unzip -q ~/path/to/pwnctual/web/levels/c-01-greeting.zip && cd c-01-greeting
./check.sh                       # must print FAIL
cp ~/path/to/solution.c vuln.c
./check.sh                       # must print PASS
```

## Run it locally

```bash
npm install
npm run dev                      # builds the levels, serves http://127.0.0.1:8788
```

## Deploy

```bash
npm run deploy                   # builds everything, uploads web/ to Cloudflare Pages
```

After adding or changing a level, update the Codespaces repo too:

```bash
node scripts/build-levels-repo.mjs ../pwnctual-levels
cd ../pwnctual-levels && git add -A && git commit -m "Update levels" && git push
```
