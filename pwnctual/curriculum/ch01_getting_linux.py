from .model import Chapter

NOTES = r"""
Before anything else, you need a Linux terminal to play in. Don't worry, you
don't have to format your computer or buy a new one. Pick the section for the
machine you're on, follow it, and you're done.

### On Windows

Windows has a built-in way to run real Linux right inside it, called **WSL**
(Windows Subsystem for Linux). Nothing extra needed.

**Step 1.** Click the Start button, type `PowerShell`, right-click it and choose
**Run as administrator**.

**Step 2.** Type this and press Enter:

```
wsl --install
```

**Step 3.** Wait for it to finish, then restart your computer if it asks.

**Step 4.** After the restart, open the Start menu, search for **Ubuntu** and
open it.

**Step 5.** It will ask you to pick a username and a password. When you type the
password, nothing shows up on the screen, not even dots. That's alright.

That's it, you now have a Linux terminal on Windows!

This needs Windows 10 (version 2004 or newer) or Windows 11. Just google if this
doesn't work for you.

### On a Mac

It's a bit different. I never had the luxury to use a Mac in my life, so I am
not really sure how it is, but you can just use a cloud terminal like GitHub
Codespaces, or make a virtual machine to run real Linux. Just google it,
awesome!

### On Linux

Well, it's dumb to say the steps, so just open your terminal. 🙂 On Ubuntu and
many other versions of Linux, the shortcut is `Ctrl + Alt + T`. If that doesn't
work, search for "Terminal" in your apps.
"""

CHAPTER = Chapter(
    "getting-linux", "Getting Linux",
    "",
    notes=NOTES,
    has_lecture=False,
)
