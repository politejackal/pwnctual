from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
### Core concepts

- **The GUI illusion:** Graphical User Interfaces (GUIs) are just a translation
  layer. Every click triggers a hidden command.
- **Where vulnerabilities live:** Bugs and vulnerabilities don't live in the
  GUI. They live at the low level, where system actions break down or
  miscommunicate.
- **The terminal:** A direct text interface to the computer's core. No mouse,
  pure text control.

### The hacker's grammar

To talk to the terminal, you structure text in three parts:

- **Command (the verb):** the action you want to take.
- **Flag (the adjective):** modifies *how* the action is performed. Usually
  preceded by a dash (`-`).
- **Argument (the noun):** the target of your action.

```bash
Command -Flag Argument
read -quickly book
```

### SSH (Secure Shell)

**Purpose:** your *grappling hook*. SSH creates a secure, encrypted tunnel to
execute commands on a remote computer over the internet.

```bash
ssh username@hostname -p port_number
```

- `ssh`: the command.
- `username`: the account you are logging into.
- `hostname`: the web address or IP of the target machine.
- `-p`: the flag used to specify a port (a digital door).

Example:

```bash
ssh john@targetmachine.com -p 2220
```

### Mission 0

- **Target:** [OverTheWire, Bandit Level 0](https://overthewire.org/wargames/bandit/bandit0.html)
- **Objective:** Gather the hostname, port, username, and password from the
  Bandit website and construct the correct `ssh` command to successfully log
  into the server.
"""

CHAPTER = Chapter(
    "first-contact", "The Terminal & SSH",
    "Why the terminal is where hacking happens, the grammar of a command, and logging in to a real server with SSH.",
    notes=NOTES,
    video_id="",  # lecture coming soon: paste its YouTube video ID here
    challenges=[
        Challenge("bandit-0", "Mission 0: Bandit Level 0", f"{BANDIT}/bandit0.html",
                  "Build the right ssh command and log in to the Bandit server."),
    ],
)
