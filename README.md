# pwnctual

A defensive security wargame. Each level is a small C or Python program with a real
vulnerability. You open it in GitHub Codespaces, fix it, and run the included `check.sh`.
It prints PASS or FAIL.

- **Functional tests** check that the program still does its job.
- **Attack tests** feed it hostile input (oversized lines, format strings and so on). C is built
  with `-fsanitize=address,undefined`, so a memory bug fails the test even if it doesn't crash.

Every level is in [pwnctual-levels](https://github.com/politejackal/pwnctual-levels), which
players open in GitHub Codespaces on their own free Codespaces hours, with gcc already set up.

The site is static. Nothing runs on a server, and there are no accounts: progress is a
checkbox saved in your browser.

## Layout

| Path | What it is |
| --- | --- |
| `web/` | The site (Cloudflare Pages). Plain HTML, CSS and JS. |
| `levels/` | One folder per level. |
| `scripts/build-levels.mjs` | Turns `levels/` into `web/levels/`, the JSON each page reads. |
| `scripts/build-levels-repo.mjs` | Builds [pwnctual-levels](https://github.com/politejackal/pwnctual-levels), the repo players open in GitHub Codespaces. |

## Level format

```
levels/c-01-greeting/
  level.json        title, description, hints, difficulty, language (shown on the page)
  files/            copied into the level's folder in pwnctual-levels
    vuln.c          the vulnerable program
    Makefile        builds with the sanitizers
    check.sh        builds, runs the tests, prints PASS or FAIL
  solution.c        a reference fix (not in this repo)
```

Before publishing a level, check that `check.sh` fails on the original code and passes on a fix:

```bash
cd levels/c-01-greeting/files
./check.sh                       # must print FAIL
cp ../solution.c vuln.c && ./check.sh && git checkout vuln.c   # must print PASS
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
npm run build:levels-repo
cd ../pwnctual-levels && git add -A && git commit -m "Update levels" && git push
```
