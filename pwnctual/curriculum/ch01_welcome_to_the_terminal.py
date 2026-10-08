from .model import Chapter

NOTES = r"""
### The Terminal

In `politejackal@acer:~$`:

- `politejackal` is my account name.
- `@` is just a separator, like in "device/machine", where the `/` separates the
  two words :)
- `acer` is my device/machine name, which I put in when setting up my device
  after I bought it.
- `:` is just another separator.
- We will come back in a bit to what the `~` means. It's nothing complicated,
  though!
- The `$` symbol basically tells you that the terminal is ready for the next
  command.

### What Is a Command?

Well, a command is just a bunch of code which is defined on your machine, and
whenever you call it, you are invoking the command. Simple! Soon you will be
building your own commands!

You invoke a command just by using its name, for example `ls`, `touch`, etc.
You don't need to know what these mean for now.

Most commands follow a simple syntax. You don't need to memorize this; just take
it as a simple overview for now. You will learn by doing it yourself on the way.

```
command -flags arguments
```

Example: `ls -a /home`. Like hell you need to know what all of these are for
now; this is just to give you an idea.

### Case Sensitivity

Everything in the terminal is case sensitive. `Documents` and `documents` are
two completely different things to the terminal, just like `home` and
`ifebgiefihnwufhwi`.
"""

CHAPTER = Chapter(
    "welcome-to-the-terminal", "Welcome to the Terminal",
    "",
    notes=NOTES,
    notes_optional=True,
)
