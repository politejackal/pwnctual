from .model import Chapter, Challenge


LECTURE = r"""
### The one idea to keep

**The terminal is just a file explorer made of text.** Everything you do with a
mouse in a file manager (open a folder, look inside it, make a new folder, move a
file, delete it) has a short command in the terminal. Once that clicks, the
terminal stops being scary and starts being *fast*.

Hackers live in the terminal because most servers don't have a screen, a desktop
or a mouse. When you break into a machine, or just log in to one, a blinking
cursor is all you get.

### Open a terminal

- **Windows:** open the Start menu and type **Terminal** or **PowerShell**. `ssh`
  is already built in.
- **macOS:** press `Cmd + Space`, type **Terminal**, press Enter.
- **Linux:** press `Ctrl + Alt + T`, or find **Terminal** in your apps.

The `$` (or `>` on Windows) at the start of the line is the **prompt**. It means
the computer is waiting for you to type.

### How a command is built

```bash
$ ls -la /home
```

- `ls` is the **command**: what to do.
- `-la` are **options**: how to do it. Options start with a dash.
- `/home` is an **argument**: what to do it to.

The terminal splits what you type **on spaces**, and anything that starts with
a dash looks like an option. Remember both rules. Two of this chapter's
challenges are built around them.

### The file tree

On Linux, every file and folder lives in one big upside-down tree. The very top
is called the **root**, and it's written as a single slash: `/`.

```
/
├── bin/        programs like ls and cat
├── etc/        system settings
├── home/
│   └── alice/  alice's home folder (also written ~ when you are alice)
│       └── notes.txt
├── tmp/        scratch space anyone can write to
└── var/
    └── log/    log files
```

There are no `C:\` or `D:\` drives like on Windows. Everything, even USB sticks,
hangs off `/` somewhere. Folders are also called **directories**.

### Absolute vs. relative paths

A **path** is the address of a file. There are two ways to write one:

- An **absolute path** starts at the root, so it starts with `/`. It works from
  anywhere: `/home/alice/notes.txt`.
- A **relative path** starts from *where you are right now*. If you're already
  in `/home/alice`, then `notes.txt` means the same file.

A few shortcuts you'll use constantly:

| shortcut | means                                   |
|----------|-----------------------------------------|
| `.`      | the folder I'm in right now             |
| `..`     | the folder one level up (the parent)    |
| `~`      | my home folder                          |
| `./file` | `file`, in the folder I'm in right now  |

So from `/home/alice`, the path `../bob` means `/home/bob`, and `./notes.txt`
is just a more explicit way of writing `notes.txt`. Remember that last one,
because it will save you in this chapter's challenges.

### Moving around: `pwd`, `ls`, `cd`

```bash
$ pwd                 # print working directory: "where am I?"
/home/alice

$ ls                  # list: "what is here?"
notes.txt  projects

$ ls -la              # list everything, in detail
drwxr-x--- 3 alice alice 4096 Oct  2 10:00 .
drwxr-xr-x 4 root  root  4096 Oct  2 09:00 ..
-rw-r--r-- 1 alice alice  220 Oct  2 09:00 .bashrc
-rw-r--r-- 1 alice alice   42 Oct  2 10:00 notes.txt
drwxr-xr-x 2 alice alice 4096 Oct  2 10:00 projects

$ cd projects         # change directory: "move me"
$ cd ..               # go back up one level
$ cd /var/log         # jump anywhere with an absolute path
$ cd ~                # go home (plain `cd` does the same)
```

`ls -la` combines two options: `-l` for the **long** format (permissions,
owner, size, date) and `-a` for **all** files, including **hidden** ones. On
Linux, any file whose name starts with a dot (like `.bashrc`) is hidden from a
plain `ls`. Hackers always use `-a`, because hidden files are exactly where
interesting things end up.

In the long format, a line starting with `d` is a directory and a line starting
with `-` is a regular file.

### Making, copying, moving and deleting

```bash
$ touch todo.txt              # create an empty file
$ mkdir loot                  # make a directory
$ mkdir -p a/b/c              # make nested directories in one go
$ cp todo.txt loot/           # copy a file into loot
$ cp -r loot loot-backup      # copy a whole directory (-r = recursive)
$ mv todo.txt loot/done.txt   # move AND rename in one step
$ rm loot/done.txt            # delete a file
$ rm -r loot-backup           # delete a directory and everything in it
$ rm -rf loot                 # same, and never ask for confirmation
```

`mv` is also how you **rename** a file: moving `old.txt` to `new.txt` in the
same folder just changes its name.

**Be careful with `rm -rf`.** There's no recycle bin. A deleted file is gone, and
`-f` (force) means the terminal won't stop to ask if you're sure. Read the path
twice before you press Enter.

To read what's inside a file, use `cat`:

```bash
$ cat notes.txt
buy more coffee
```

### Names with spaces and strange characters

The terminal splits what you type on spaces. Each piece is a separate
**argument**. So this:

```bash
$ cat my notes.txt
cat: my: No such file or directory
cat: notes.txt: No such file or directory
```

asks `cat` for two files, `my` and `notes.txt`. To pass a name that contains
spaces as one argument, wrap it in quotes or escape each space with a backslash:

```bash
$ cat "my notes.txt"
$ cat my\ notes.txt
```

Names that start with a dash are tricky too. Programs treat anything starting
with `-` as an **option** (like the `-la` in `ls -la`), not a file name. And for
`cat`, a dash all on its own has a special meaning: "read from the keyboard
instead of a file". So `cat -` just sits there waiting for you to type. It isn't
frozen. Press `Ctrl + C` to get your prompt back.

The fix is to write a path to the same file that **doesn't start with a dash**.
The `./` shortcut from earlier does exactly that:

```bash
$ cat -notes.txt      # cat thinks -notes.txt is an option
$ cat ./-notes.txt    # a path: "the file -notes.txt, right here"
```

An absolute path like `/home/alice/-notes.txt` works too, since it starts with `/`.

### Keys that save you

| key                 | does                                              |
|---------------------|---------------------------------------------------|
| `Tab`               | completes the file name, adding `\` where needed  |
| Up arrow            | brings back your last command                     |
| `Ctrl + C`          | stops whatever is running or stuck (not "copy")   |
| `Ctrl + Shift + V`  | pastes (or right-click); plain `Ctrl + V` often won't |
| `clear`             | wipes the screen (or `Ctrl + L`)                  |

### Reading the manual: `man`

Every command comes with a manual. When you don't know how something works,
`man` is the first place to look, before Google and long before a walkthrough.

```bash
$ man ls
```

Inside a man page:

| key           | does                        |
|---------------|-----------------------------|
| `Space` / `b` | page down / page up         |
| `/word`       | search for "word"           |
| `n`           | jump to the next match      |
| `q`           | quit                        |

Man pages feel dense at first. Skim the **NAME** and **SYNOPSIS** sections,
then search for the option or symbol you care about. Learning to pull answers
out of documentation is the single most important skill in hacking, and this
is where you start building it.

### Logging in to another machine: `ssh`

`ssh` (Secure SHell) opens a terminal on a different computer over the network.
You need three things: a **username**, a **host** (the machine's address) and
sometimes a **port** (which "door" on that machine to knock on, default 22).

```bash
$ ssh -p PORT USERNAME@HOST
```

The first time you connect to a machine, ssh says it can't verify the host and
asks `Are you sure you want to continue connecting (yes/no)?`. Type the full
word `yes`.

Then it asks for a password. Nothing appears on screen while you type it, not
even dots. That's normal, so type (or paste) it and press Enter. When the prompt
changes to the remote machine's name, you're in. To leave, type `exit`.

### Your mission

You're going to use everything above on a real remote server run by
**OverTheWire**, a free hacking playground. Their first game, **Bandit**, is a
series of levels. Each level hides the password for the next one somewhere on
the machine, and it's your job to find it.

Every level works the same way:

1. `ssh` in as that level's user (`bandit0`, `bandit1`, ...), always on host
   `bandit.labs.overthewire.org`, port `2220`.
2. Find the password for the next level with `ls` and read it with `cat`.
3. **Write it down.** You'll need it to log in to the next level.
4. `exit`, then `ssh` in as the next user with the password you found.

Two rules:

- **No walkthroughs.** If you get stuck, read the `man` page for the command
  you're using, re-read this page, or ask in the video's comments. Struggling
  a bit is how this sticks.
- **Prove it.** When you get the Level 3 password, post its **first 6 letters**
  in the video's comments. Only 6, so you don't spoil it for anyone.
"""


CHAPTER = Chapter(
    "terminal-awakening", "The Terminal Awakening",
    "Why hackers don't use mice: the Linux file tree, and moving through it without one.",
    video="",
    lecture=LECTURE,
    challenges=[
        Challenge(
            "bandit-0", "Bandit Level 0: Get in", 10,
            "https://overthewire.org/wargames/bandit/bandit0.html",
            r"""
Connect to the Bandit server with `ssh`:

- host: `bandit.labs.overthewire.org`
- port: `2220`
- username: `bandit0`
- password: `bandit0`

You're done when your prompt changes to `bandit0@bandit:~$`. That means you're
typing commands on a computer somewhere else in the world.
""",
        ),
        Challenge(
            "bandit-1", "Bandit Level 0 → 1: Read the readme", 10,
            "https://overthewire.org/wargames/bandit/bandit1.html",
            r"""
The password for the next level is in a file called `readme` in the home
directory. Find it with `ls`, read it with `cat`, then `exit` and log in as
`bandit1` with the password you found.
""",
        ),
        Challenge(
            "bandit-2", "Bandit Level 1 → 2: The dash file", 15,
            "https://overthewire.org/wargames/bandit/bandit2.html",
            r"""
The password is in a file named `-` (a single dash). Try `cat -` and see what
happens. The terminal will just sit there, because `cat` thinks you mean "read
from the keyboard". Press `Ctrl+C` to get out.

How else could you write a path to that same file? Look at the shortcuts table
in the lesson, or read `man cat`.
""",
        ),
        Challenge(
            "bandit-3", "Bandit Level 2 → 3: Spaces in the name", 15,
            "https://overthewire.org/wargames/bandit/bandit3.html",
            r"""
The password is in a file called `spaces in this filename`. Typing it as-is
makes `cat` look for four different files. Make the terminal treat the whole
name as one argument.

**When you've got it:** post the **first 6 letters** of the password you found
(the one for Level 3) in the video's comments. Only the first 6. Don't spoil it
for everyone else.
""",
        ),
    ],
)
