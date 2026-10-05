from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
### Core Concepts

- **Graphical User Interface (GUI):** The GUI is just a layer of translation.
  Whenever you click something, that click gets translated into a command.
- **Where vulnerabilities live:** Vulnerabilities don't live inside nicely
  crafted GUIs. They live at the core level, where these translations
  miscommunicate. They live in the slight mistakes. They live in the smallest
  details.
- **Terminal:** The terminal is a direct, text-based command center for all
  the commands. No mouse, just the keyboard ;)

### The Hacker's Grammar

When you want to talk to the terminal, you use a specific syntax. Here we'll
compare it to normal English syntax:

1. **Command (the verb):** The action you want to take. For example, `paint`.
    Here, obviously, `paint` is the command. Typing it on its own simply runs
    the command.
2. **Argument (the noun):** The target of your command, meaning where or what
    the command should work on. For example, `car`, so we get `paint car`.
    Depending on the command, this is often optional.
3. **Flag (the specification):** `paint car` is fine, but sometimes you want to
    add an extra specification. Flags are optional and only used when you want
    to specify something. They're usually preceded by a dash (`-`), or sometimes
    two (`--`). For example, `-color`, so our line becomes `paint car -color`.

    Something looks missing here, right? But it isn't necessarily missing,
    because it's up to the developer to decide how the program treats each
    flag. A developer could just as well create a flag like `-nicely`, and
    `paint car -nicely` is a completely sensible command on its own.
4. **Value (the adjective):** Some flags expect a value right after them. The
    value is just a word or number that follows the flag, with no dash in front
    of it. For example, `red`, so the command becomes `paint car -color red`.
    Now that looks like a cool command.

### SSH (Secure Shell)

**Purpose in life:** SSH creates a secure connection to another machine/server
so you can remotely perform whatever actions you want on it, over a network
(such as the internet).

**How to use SSH:**

```bash
ssh -p portnumber username@hostname
```

Here:

1. `ssh` is the command. Typing this word invokes the SSH program.
2. `-p` is the flag, indicating that we want to modify the command. Here, `p`
    stands for port, telling the SSH program that we want to specify the port.
    How do I know this, and how does SSH know this? Well, I read the manual. The
    developers built the program so that when it sees `-p`, it expects the next
    value to be the port number.
3. `portnumber` is the value. You don't need to know what this means for now,
    but it's a number :)
4. `username@hostname` is the important part. The first part is your username
    on the target machine. The `@` is just a separator between the username and
    the hostname (you can read it as "username at hostname"). As for the
    hostname, you don't need to fully understand it at this level; just
    remember it's usually a domain name (like `targetmachine.com`) or an IP
    address (like `123.12.12.1`).

Example:

```bash
ssh -p 1234 diddy@targetmachine.com
```
"""

CHAPTER = Chapter(
    "the-terminal-and-ssh", "The Terminal & SSH",
    "Why the terminal is where hacking happens, the grammar of a command, and logging in to a real server with SSH.",
    notes=NOTES,
    video_id="2jJcWlYePv0",
    challenges=[
        Challenge("bandit-0", "Mission 0: Bandit Level 0", f"{BANDIT}/bandit0.html",
                  "Build the right ssh command and log in to the Bandit server."),
    ],
)
