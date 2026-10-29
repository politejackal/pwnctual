# pwnctual

A defensive security wargame. Each level is a small C or Python program with a real
vulnerability. You open it in GitHub Codespaces, fix it, and run the included `check.sh`.
It prints PASS or FAIL.

- **Functional tests** check that the program still does its job.
- **Attack tests** feed it hostile input (oversized lines, format strings and so on). C is built
  with `-fsanitize=address,undefined`, so a memory bug fails the test even if it doesn't crash.

Every level is in [pwnctual-levels](https://github.com/politejackal/pwnctual-levels), which
players open in GitHub Codespaces on their own free Codespaces hours, with gcc already set up.

Levels come in two categories, inside each language:

- **Bug fix** (`"category": "bugfix"`): the program gives the wrong result for normal input.
- **Break it and fix it** (`"category": "breakfix"`): it works for normal input, but some inputs break it.

The site is static. Nothing runs on a server, and there are no accounts: progress is a
checkbox saved in your browser.

## Layout

| Path | What it is |
| --- | --- |
| `web/` | The site: plain HTML, CSS and JS, served as static files by the `pwnctual` Worker on pwnctual.com. |
| `levels/` | One folder per level. |
| `scripts/build-levels.mjs` | Turns `levels/` into `web/levels/`, the JSON each page reads. |
| `scripts/build-levels-repo.mjs` | Builds [pwnctual-levels](https://github.com/politejackal/pwnctual-levels), the repo players open in GitHub Codespaces. |

## Level format

```
levels/c-01-phone-number/
  level.json        title, description, hints, language, category, difficulty, flagSha256
  files/            copied into the level's folder in pwnctual-levels
    vuln.c          the vulnerable program (the only file players edit)
    check.sh        builds with the sanitizers, runs the tests, prints PASS/FAIL and the flag
    checker/        test code check.sh uses, e.g. harness.c calling the level's functions
  solution.c        a reference fix (not in this repo)
```

`check.sh` prints a flag when every test passes. The site stores only its SHA-256
(`flagSha256` in `level.json`), so after changing a level's tests, run `check.sh` on the
reference fix and update the hash:

```bash
printf '%s' 'pwnctual{...}' | sha256sum
```

Before publishing a level, check that `check.sh` fails on the original code and passes on a fix:

```bash
cd levels/c-01-phone-number/files
./check.sh                       # must print FAIL
cp ../solution.c vuln.c; ./check.sh; git checkout vuln.c       # must print PASS
```

## Run it locally

```bash
npm install
npm run dev                      # builds the levels, serves http://127.0.0.1:8788
```

## Deploy

```bash
npm run deploy                   # builds the levels, deploys web/ to pwnctual.com
```

After adding or changing a level, update the Codespaces repo too:

```bash
npm run build:levels-repo
cd ../pwnctual-levels && git add -A && git commit -m "Update levels" && git push
```
