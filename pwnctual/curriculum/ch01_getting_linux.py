from .model import Chapter

NOTES = r"""
Before anything else, you need a Linux terminal to play in. Don't worry, you
don't have to wipe your computer or buy a new one. Pick the section for the
machine you're on, follow it, and you're done.

### On Windows

Windows has a built-in way to run real Linux right inside it, called **WSL**
(Windows Subsystem for Linux). No extra computer needed.

**Step 1.** Click the Start button, type `PowerShell`, right-click it and choose
**Run as administrator**.

**Step 2.** Type this and press Enter:

```
wsl --install
```

**Step 3.** Wait for it to finish, then restart your computer when it asks.

**Step 4.** After the restart, open the Start menu, search for **Ubuntu** and
open it.

**Step 5.** It will ask you to pick a username and a password. When you type the
password, nothing shows up on the screen, not even dots. That's normal, it's
still typing. Just type it and press Enter.

That's it, you now have a Linux terminal on Windows!

This needs Windows 10 (version 2004 or newer) or Windows 11. If `wsl --install`
doesn't work, update Windows first and try again.

### On a Mac

A Mac is not Linux, but it's a close cousin, and its **Terminal** app (search
for it with `Cmd + Space`) understands most of the basic commands we start
with. Still, you want the real thing, and the easiest way is **Multipass**, a
free app that runs Ubuntu in a small virtual machine on your Mac.

**Step 1.** Download Multipass from
[canonical.com/multipass](https://canonical.com/multipass) and install it like
any other app.

**Step 2.** Open the Terminal app and type:

```
multipass launch --name pwn
```

This creates a little Ubuntu machine called `pwn`. Give it a few minutes the
first time.

**Step 3.** Now step inside it:

```
multipass shell pwn
```

You're now in a Linux terminal! Whenever you want to come back, open Terminal
and run `multipass shell pwn` again. Type `exit` to leave.

### On Linux

Well, you're already there :) Just open your terminal. On Ubuntu and many other
versions of Linux, the shortcut is `Ctrl + Alt + T`. If that doesn't work,
search for "Terminal" in your apps.

### Stuck?

If something here doesn't work for you, don't give up. Ask in the video
comments or on Discord, and tell us exactly where you got stuck.
"""

CHAPTER = Chapter(
    "getting-linux", "Getting Linux",
    "",
    notes=NOTES,
    has_lecture=False,
)
