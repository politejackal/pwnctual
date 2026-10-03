from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
- **The GUI Illusion:** Graphical User Interfaces (GUIs) are just a translation
  layer. Every click triggers a hidden command.
- **Vulnerability Location:** Bugs and vulnerabilities don't live in the GUI;
  they live at the low level where system actions break down or
  miscommunicate.
- **The Terminal:** A direct text interface to the computer's core. No mouse,
  pure text control.

### The Hacker's Grammar

To talk to the terminal, you structure text using specific components:

- **Command (The Verb):** The action you want to take (e.g., `paint`).
- **Argument (The Noun):** The target of your action (e.g., `car`).
- **Flag (The Category):** Preceded by a dash (`-`), this tells the machine
  what feature you want to modify (e.g., `-color`).
- **Value (The Adjective):** The exact specification for that flag (e.g.,
  `red` or `blue`).

```bash
Command -Flag Value Argument
paint -color red car
```

### SSH (Secure Shell)

**Purpose:** Your "grappling hook." It creates a secure, encrypted tunnel to
execute commands on a remote computer over the internet.

```bash
ssh -p port_number username@hostname
```

- `ssh`: The command (Verb).
- `-p`: The flag indicating we are modifying the port (Category).
- `port_number`: The exact digital door we are using (Adjective).
- `username@hostname`: The account and web address of the target machine
  (Noun/Target).

Example:

```bash
ssh -p 2220 john@targetmachine.com
```

### Mission 0

- **Target:** [OverTheWire (Bandit Level 0)](https://overthewire.org/wargames/bandit/bandit0.html)
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
