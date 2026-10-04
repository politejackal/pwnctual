from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
### Tricky Filenames: The Dash (`-`)

In Linux, command flags usually begin with a dash (e.g., `ls -l`). If a file
is literally named `-`, commands like `cat -` will fail because the shell
thinks you are passing it an incomplete flag.

**The Solution:** Use paths to tell the shell exactly where the file is.

- `.` (dot): Represents your current directory.
- `/` (slash): Separates directories.
- `./`: Means "right here in this directory."

To read a file named `-`:

```bash
cat ./-
```

### Tricky Filenames: Spaces

The shell interprets spaces as separators between different commands, flags,
or files. If you try to read a file named `my password.txt` by typing
`cat my password.txt`, the shell will look for one file named `my` and a
second file named `password.txt`.

- **Method 1 (Escaping):** Use a backslash (`\`) immediately before the space
  to tell the shell the space is part of the name.
- **Method 2 (Quoting):** Wrap the entire filename in quotes.

```bash
cat my\ password.txt
cat "my password.txt"
```

### Searching for Files (`find`)

When you know the name of a file but not where it is located, use the `find`
command.

```bash
find [where to start looking] -name [filename]
```

Example: to find a file named `secret.txt`, starting from your current
directory and going into every directory inside it, and every directory
inside those, until it finds the file:

```bash
find . -name secret.txt
```

### Searching Inside Files (`grep`)

When you need to find a specific word or phrase hidden inside a massive file,
use the `grep` command. It prints only the lines containing your target word.

```bash
grep "search_term" filename
```

Example: to find the line containing the word "password" inside a file called
`data.txt`:

```bash
grep "password" data.txt
```

### Mission 2

- **Target:** [OverTheWire (Bandit Level 1 → Level 2)](https://overthewire.org/wargames/bandit/bandit2.html)
- **Objective:** Log in as `bandit1` with the password you found in Mission 1
  and read the file holding the next password.

### Mission 3

- **Target:** [OverTheWire (Bandit Level 2 → Level 3)](https://overthewire.org/wargames/bandit/bandit3.html)
- **Objective:** Log in as `bandit2` and read the file holding the next
  password.
"""

CHAPTER = Chapter(
    "finding-needles", "Finding Needles",
    "Read files with tricky names, find files you can't see, and search inside files for the line you need.",
    notes=NOTES,
    challenges=[
        Challenge("bandit-2", "Mission 2: Bandit Level 1 → 2", f"{BANDIT}/bandit2.html",
                  "Read a file whose name the shell mistakes for something else."),
        Challenge("bandit-3", "Mission 3: Bandit Level 2 → 3", f"{BANDIT}/bandit3.html",
                  "Read a file whose name has spaces in it."),
    ],
)
