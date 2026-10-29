# Greeting

pwnctual C level 1 · Easy · https://pwnctual.com

`vuln.c` reads a name from standard input and prints a greeting: `Ada` becomes
`Hello, Ada!`. Whoever wrote it assumed nobody has a name longer than 255
characters. Someone will try anyway.

Fix `vuln.c` so any input is handled safely. A name longer than 255 characters
should be cut down to its first 255 characters. Everything that works now has
to keep working.

## Files

| File | What it's for |
| --- | --- |
| `vuln.c` | The program. This is the only file you need to change. |
| `Makefile` | Builds `./vuln` with AddressSanitizer and UndefinedBehaviorSanitizer. |
| `check.sh` | Builds your code and runs the tests. Prints PASS or FAIL. |

## Check your fix

```bash
./check.sh
```

It runs two sets of tests:

- **Functional tests** feed it normal names. The output has to be right.
- **Attack tests** feed it names of 256, 300 and 10,000 characters. The
  program must not crash, trigger a sanitizer error, or print the wrong thing.

When you see `PASS`, go back to the level page and tick **I solved it**.

To try the program yourself:

```bash
make
echo "Ada" | ./vuln
```

The sanitizers make memory bugs visible. Without them, writing past the end of
a buffer often seems to work, which is exactly what makes it dangerous.

## Where to run it

### GitHub Codespaces (nothing to install)

Click **Open in Codespaces** on the level page. You get VS Code in your browser with gcc,
the sanitizers and every level already set up. It runs on your GitHub account's free
Codespaces hours. Skip the rest of this section.

### Your own computer

You need a C compiler (gcc or clang), `make` and `bash`.

#### Linux

- Debian or Ubuntu: `sudo apt install build-essential`
- Fedora: `sudo dnf install gcc make libasan libubsan`
- Arch: `sudo pacman -S base-devel`

#### macOS

```bash
xcode-select --install
```

This gives you clang, which `gcc` points to on macOS. The sanitizers work with it.

#### Windows

Use WSL (Windows Subsystem for Linux), which runs Ubuntu inside Windows:

1. Open PowerShell as administrator and run `wsl --install`.
2. Restart when it asks you to.
3. Open **Ubuntu** from the Start menu and choose a username and password.
4. In the Ubuntu window, install the tools:

   ```bash
   sudo apt update
   sudo apt install build-essential unzip
   ```

5. Copy the level from your Downloads folder into Ubuntu and unzip it. Replace
   `YourName` with your Windows user name:

   ```bash
   cp /mnt/c/Users/YourName/Downloads/c-01-greeting.zip ~
   cd ~
   unzip c-01-greeting.zip
   cd c-01-greeting
   ./check.sh
   ```

To edit `vuln.c` with a Windows editor, open `\\wsl$\Ubuntu\home\<your Ubuntu
user>\c-01-greeting` in File Explorer, or run `code .` if you use VS Code.

If `./check.sh` says `Permission denied`, run `chmod +x check.sh` once.
