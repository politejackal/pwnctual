from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

WRITEUP = r"""
You just watched the lecture. This writeup is the version you can come back to:
the same ideas, written down, so you can look things up while you play.

### What you're about to do

[OverTheWire](https://overthewire.org) runs free hacking games called
*wargames*. We start with **Bandit**, the one made for absolute beginners. Each
level is a real Linux account on a real server. Somewhere in that account is
the password for the next level. Find it, log in as the next user, repeat.

You don't install anything special and you can't break anything. The worst
that can happen is you get stuck, and getting stuck is the whole point.

### The terminal and the shell

The **terminal** is the window you type into. The **shell** is the program
inside it that reads what you type and runs it. On the Bandit server the shell
is `bash`. When you see a prompt like this, it's waiting for you:

```bash
bandit0@bandit:~$
```

That prompt tells you *who* you are (`bandit0`), *which machine* you're on
(`bandit`) and *where* you are (`~`, your home folder).

Open a terminal on your own computer:

- **Windows:** open *PowerShell*. The `ssh` command is built in.
- **macOS:** open *Terminal* (search for it with Spotlight).
- **Linux:** open your terminal app. You already have `ssh`.

### SSH: logging in to another computer

`ssh` (Secure Shell) gives you a shell on a different computer, over the
network. Everything you type runs *there*, not on your machine.

```bash
ssh USER@HOST -p PORT
```

- `USER` is the account you log in as. In Bandit, that's the level: `bandit0`,
  `bandit1`, and so on.
- `HOST` is the server's address. The level page tells you which one.
- `-p PORT` picks the port. SSH normally uses port 22; Bandit uses a different
  one, and the level page tells you that too.

The first time you connect, `ssh` asks whether you trust the server's
fingerprint. Type `yes`. Then it asks for the password. **Nothing appears
while you type the password.** No dots, no stars. That's normal: type it (or
paste it) and press Enter.

To leave the server, type `exit` or press `Ctrl+D`.

### Finding your way around

Linux keeps everything in one big tree of folders (*directories*) that starts
at `/`. These are the commands you'll use constantly:

| Command | What it does |
|---|---|
| `pwd` | **p**rint **w**orking **d**irectory: where am I? |
| `ls` | **l**i**s**t what's in the current directory |
| `ls -la` | list everything, including hidden files, with details |
| `cd NAME` | **c**hange **d**irectory into `NAME` |
| `cd ..` | go up one level |
| `cd` | go back to your home directory |
| `cat FILE` | print a file's contents to the screen |
| `file FILE` | guess what kind of data is inside a file |
| `clear` | clear the screen (or `Ctrl+L`) |

Two shortcuts save you hours:

- **Tab completion:** type the start of a name and press `Tab`. The shell
  finishes it for you, and it handles awkward names correctly.
- **History:** press `↑` to bring back earlier commands.

### Options, arguments, and reading the manual

Most commands take **arguments** (what to work on) and **options** (how to
behave). Options usually start with a dash:

```bash
ls -l /etc        # option: -l   argument: /etc
```

When you don't know what a command does, ask it:

```bash
man ls            # the full manual page (press q to quit, / to search)
ls --help         # a shorter summary
```

Getting comfortable with `man` is one of the most useful habits you can build.
Real hackers read documentation all day.

### Names that fight back

Filenames on Linux can contain almost anything. Some characters mean something
special, either to the shell or to the program you're running:

- A **space** separates arguments. To the shell, `my file` is two things:
  `my` and `file`.
- A name that **starts with a dash** looks like an option to most programs.
- A name that **starts with a dot** is *hidden*: plain `ls` doesn't show it.

When a command doesn't do what you expect, stop and ask: *how does the shell
see what I typed?* Look up **quoting** and **escaping** (`man bash`, then
search for `QUOTING`), and remember that there's more than one way to write
the path to the same file.

### How Bandit levels work

1. Read the level page on OverTheWire. It tells you where the password is
   hidden and lists commands that might help.
2. SSH in as the current level's user.
3. Find the password for the next level.
4. `exit`, then SSH in as the next user with that password.

**Keep a notes file** on your own computer with every password you find. The
levels build on each other, and you'll want to come back.

### Play fair

- Don't post Bandit passwords or full solutions anywhere public. OverTheWire
  asks everyone not to, and it ruins the game for the next person.
- Be polite to the server: it's shared by thousands of people learning just
  like you.

Now open Level 0 and log in. When you finish a level, come back here and mark it
done.
"""

CHAPTER = Chapter(
    "first-contact", "First Contact",
    "Meet the terminal, log in to a real server with SSH, and clear your first Bandit levels.",
    video_id="33cANYTCsjg",
    writeup=WRITEUP,
    challenges=[
        Challenge("bandit-0", "Bandit Level 0", f"{BANDIT}/bandit0.html",
                  "Log in to the Bandit server over SSH for the first time."),
        Challenge("bandit-1", "Bandit Level 0 → 1", f"{BANDIT}/bandit1.html",
                  "Find the password for the next level in your home directory."),
        Challenge("bandit-2", "Bandit Level 1 → 2", f"{BANDIT}/bandit2.html",
                  "Read a file whose name gets in the way."),
        Challenge("bandit-3", "Bandit Level 2 → 3", f"{BANDIT}/bandit3.html",
                  "Read another file with an awkward name."),
    ],
)
