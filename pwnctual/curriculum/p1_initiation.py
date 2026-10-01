from .model import Path, Module, Challenge
from .common import words, NAMES, lines


# ---------------------------------------------------------------- first contact

FIRST_CONTACT = r"""
Every hacker you have ever heard of started exactly here: a blinking cursor and
no idea what to type. That's fine. You don't need to know *anything* yet.

### Your machine

You'll work inside a **GitHub Codespace**: a real Linux computer in the cloud
that runs in your browser. Go to the [Workspace](/workspace) page, press
**Launch Codespace**, and wait for VS Code to open. Everything is pre-installed.

At the bottom you'll see a **terminal**. That's where you talk to the computer
by typing commands. The `$` is the *prompt*: it means "I'm listening".

```bash
$ python3 --version
Python 3.12.4
```

### Python programs

A Python program is just a text file that ends in `.py`. Python reads it
from top to bottom and runs each line in order.

```python
print("this is line one")
print("this is line two")
```

Save that as `demo.py` and run it:

```bash
$ python3 demo.py
this is line one
this is line two
```

`print(...)` writes text to **standard output** (*stdout*), which is usually your
screen. Text inside quotes is a **string**.

### Input

`input()` reads one line from **standard input** (*stdin*), usually your
keyboard. It gives the line back to you so you can keep it in a **variable**:

```python
name = input()
print(name)
```

### How pwnctual checks your work

You don't paste flags here. Instead, the `pwnctual` command inside your
Codespace runs your program against **fresh random input** every time,
captures what it prints, and asks the server whether you got it right.
Hard-coding an answer won't work. You actually have to solve it.

```bash
$ pwnctual new hello-hacker      # creates hello-hacker.py for you
$ pwnctual check hello-hacker    # runs it against the checker
```

When you pass, you capture a **flag**, earn **points**, and climb the ranks.
"""

hello = Challenge(
    "hello-hacker", "Hello, Hacker", 10,
    r"""
Write a program that prints exactly:

```
Hello, hacker!
```

Capital `H`, a comma, a space, lowercase `hacker`, an exclamation mark. Computers
are pedantic. Hackers learn to be pedantic too.
""",
    lambda r, i: {"_expect": "Hello, hacker!"},
    cases=1,
)

echo = Challenge(
    "echo-chamber", "Echo Chamber", 10,
    r"""
The checker will send **one line** of text to your program's stdin.
Read it with `input()` and print it back, unchanged.

```
stdin:   ghost protocol activated
stdout:  ghost protocol activated
```
""",
    lambda r, i: (lambda s: {"stdin": lines(s), "_expect": s})(words(r, r.randint(2, 5))),
)

callsign = Challenge(
    "callsign", "Callsign", 10,
    r"""
You'll get a hacker's name on stdin. Greet them like this:

```
stdin:   linus
stdout:  Welcome, linus.
```

Glue strings together with `+`, or use an **f-string**: put an `f` before the
quote and drop variables in `{curly braces}`:

```python
who = "world"
print(f"Hello, {who}!")
```
""",
    lambda r, i: (lambda n: {"stdin": lines(n), "_expect": f"Welcome, {n}."})(r.choice(NAMES)),
)

# ---------------------------------------------------------------- numbers

NUMBERS = r"""
`input()` always hands you a **string**, even if the user typed digits.
`"2" + "2"` is `"22"`, not `4`. To do math you need to convert:

```python
a = int(input())     # "41"  ->  41
b = float("2.5")     # "2.5" ->  2.5
print(a + 1)         # 42
```

### Types

| type    | example        | what it is                 |
|---------|----------------|----------------------------|
| `int`   | `1337`, `-4`   | whole numbers, any size    |
| `float` | `3.14`, `1e9`  | decimals (approximate!)    |
| `str`   | `"pwn"`        | text                       |
| `bool`  | `True`         | yes / no                   |

`type(x)` tells you what something is. `str(x)` turns it back into text.

### Operators

```python
7 + 2    # 9    add
7 - 2    # 5    subtract
7 * 2    # 14   multiply
7 / 2    # 3.5  divide (always gives a float)
7 // 2   # 3    integer divide (rounds down)
7 % 2    # 1    remainder ("modulo")
7 ** 2   # 49   power
```

Python integers never overflow. `2 ** 1000` just works, which is very handy
when you start doing cryptography.

### Formatting numbers

```python
x = 3.14159
print(f"{x:.2f}")   # 3.14  (two decimal places)
```
"""

def _add(r, i):
    a, b = r.randint(-1000, 1000), r.randint(-1000, 1000)
    return {"stdin": lines(a, b), "_expect": str(a + b)}

add_two = Challenge(
    "add-two", "Add Two", 15,
    r"""
You'll receive two integers on two separate lines. Print their sum.

```
stdin:   40
         2
stdout:  42
```

Remember: `input()` gives you a string. Convert it first.
""",
    _add,
)

def _calc(r, i):
    a, b = r.randint(1, 10**6), r.randint(1, 1000)
    return {"stdin": lines(a, b), "_expect": lines(a + b, a - b, a * b, a // b, a % b)}

calculator = Challenge(
    "calculator", "Pocket Calculator", 15,
    r"""
Read two positive integers `a` and `b` (one per line). Print five lines:

1. `a + b`
2. `a - b`
3. `a * b`
4. `a // b`  (integer division)
5. `a % b`   (remainder)
""",
    _calc,
)

def _pow(r, i):
    n = r.randint(0, 256)
    return {"stdin": lines(n), "_expect": str(2 ** n)}

power = Challenge(
    "power-of-two", "Key Space", 15,
    r"""
A key that is `n` bits long has `2 ** n` possible values. Read `n` and print
how many keys an attacker would need to try.

`n` can be as big as 256. Python doesn't care. Try printing `2 ** 256` and
admire the number of atoms you'd need to brute-force AES.
""",
    _pow,
)

def _bw(r, i):
    b, s = r.randint(1, 10**9), r.randint(1, 3600)
    return {"stdin": lines(b, s), "_expect": f"{b / s:.2f}"}

bandwidth = Challenge(
    "bandwidth", "Exfil Rate", 20,
    r"""
You exfiltrated `bytes` bytes in `seconds` seconds. Read both (one per line)
and print the transfer rate in bytes per second, with **exactly two** decimal
places.

```
stdin:   1000
         3
stdout:  333.33
```
""",
    _bw,
)

# ---------------------------------------------------------------- decisions

DECISIONS = r"""
Programs get interesting when they make decisions.

### Comparisons give booleans

```python
5 > 3        # True
5 == 3       # False   (== compares, = assigns!)
5 != 3       # True
"a" < "b"    # True
```

### if / elif / else

```python
port = int(input())
if port == 22:
    print("ssh")
elif port == 80 or port == 443:
    print("web")
else:
    print("unknown")
```

**Indentation matters.** The indented lines belong to the `if` above them.
Use 4 spaces, always.

### Combining conditions

`and`, `or`, `not` combine booleans. Python also lets you chain comparisons:

```python
if 0 <= port <= 1023:
    print("privileged")
```
"""

def _parity(r, i):
    n = r.randint(-10**9, 10**9)
    return {"stdin": lines(n), "_expect": "even" if n % 2 == 0 else "odd"}

odd_even = Challenge(
    "odd-or-even", "Odd or Even", 15,
    r"""
Read an integer (it might be negative). Print `even` or `odd`.

Hint: what is `n % 2` for even numbers?
""",
    _parity, cases=5,
)

def _port(r, i):
    ranges = [(0, 1023), (1024, 49151), (49152, 65535), (65536, 99999), (-500, -1)]
    lo, hi = ranges[i % len(ranges)]
    p = r.randint(lo, hi)
    if p < 0 or p > 65535:
        ans = "invalid"
    elif p <= 1023:
        ans = "well-known"
    elif p <= 49151:
        ans = "registered"
    else:
        ans = "dynamic"
    return {"stdin": lines(p), "_expect": ans}

port_class = Challenge(
    "port-classifier", "Port Classifier", 20,
    r"""
TCP ports run from `0` to `65535` and fall into three bands. Read a number
and print which band it's in:

| range            | print        |
|------------------|--------------|
| 0 to 1023        | `well-known` |
| 1024 to 49151    | `registered` |
| 49152 to 65535   | `dynamic`    |
| anything else    | `invalid`    |
""",
    _port, cases=8,
)

def _gate(r, i):
    kind = i % 4
    user = "admin" if kind in (0, 2) else r.choice(["root", "guest", "Admin", "admin "]).strip() + r.choice(["", "1"])
    pin = "0451" if kind in (0, 1) else r.choice(["0000", "1234", "451", "04510", "9999"])
    ok = user == "admin" and pin == "0451"
    return {"stdin": lines(user, pin), "_expect": "ACCESS GRANTED" if ok else "ACCESS DENIED"}

gate = Challenge(
    "gatekeeper", "Gatekeeper", 20,
    r"""
Build the world's least secure login. Read a username, then a PIN.

If the username is exactly `admin` **and** the PIN is exactly `0451`, print
`ACCESS GRANTED`. Otherwise print `ACCESS DENIED`.

Careful: `0451` with a leading zero is not the number 451. Compare it as a
**string**.
""",
    _gate, cases=8,
)

# ---------------------------------------------------------------- loops

LOOPS = r"""
Hackers automate. If you'd do something twice, a loop does it a million times.

### for loops

```python
for i in range(5):        # 0, 1, 2, 3, 4
    print(i)

for i in range(1, 6):     # 1 .. 5
    print(i)

for i in range(10, 0, -1):  # 10 down to 1
    print(i)
```

`range(a, b)` stops **before** `b`. Every programmer gets this wrong at least
once. Off-by-one bugs are a real source of real vulnerabilities.

### while loops

```python
tries = 0
while tries < 3:
    print("try", tries)
    tries += 1           # same as tries = tries + 1
```

### break and continue

`break` leaves the loop immediately. `continue` skips to the next round.

```python
while True:
    line = input()
    if line == "quit":
        break
    print("you said", line)
```
"""

def _countdown(r, i):
    n = r.randint(3, 30)
    return {"stdin": lines(n), "_expect": lines(*range(n, 0, -1), "LIFTOFF")}

countdown = Challenge(
    "countdown", "Countdown", 20,
    r"""
Read `n`. Print `n`, `n-1`, … down to `1`, one per line, then `LIFTOFF`.

```
stdin:   3
stdout:  3
         2
         1
         LIFTOFF
```
""",
    _countdown,
)

def _sum(r, i):
    n = r.randint(1, 100000)
    return {"stdin": lines(n), "_expect": str(n * (n + 1) // 2)}

sum_range = Challenge(
    "sum-range", "Sum It Up", 20,
    r"""
Read `n` and print `1 + 2 + 3 + … + n`.

Use a loop. (If you know Gauss's trick, sure, use that too, but write the
loop first. You'll need loops everywhere later.)
""",
    _sum,
)

def _fizz(r, i):
    n = r.randint(15, 60)
    out = []
    for k in range(1, n + 1):
        s = ("pwn" if k % 3 == 0 else "") + ("ed" if k % 5 == 0 else "")
        out.append(s or str(k))
    return {"stdin": lines(n), "_expect": lines(*out)}

fizz = Challenge(
    "fizz-pwn", "FizzPwn", 25,
    r"""
The classic interview question, hacker edition. Read `n` and for each number
from `1` to `n` print:

- `pwned` if it's divisible by both 3 and 5
- `pwn` if it's divisible by 3
- `ed` if it's divisible by 5
- the number itself otherwise

```
1
2
pwn
4
ed
pwn
...
14
pwned
```
""",
    _fizz,
)

def _until(r, i):
    nums = [r.randint(-500, 500) for _ in range(r.randint(1, 25))]
    return {"stdin": lines(*nums, "END"), "_expect": str(sum(nums))}

read_until = Challenge(
    "read-until", "Until the End", 25,
    r"""
You'll receive some integers, one per line, followed by a line that says
`END`. You don't know how many numbers are coming. Print their sum.

```
stdin:   5
         -2
         10
         END
stdout:  13
```

`while True:` + `break` is your friend.
""",
    _until,
)


PATH = Path(
    "initiation", "Initiation", "Absolute zero. Your first lines of Python.",
    "skull", "primary",
    [
        Module("first-contact", "First Contact",
               "Terminals, programs, print and input.", FIRST_CONTACT,
               [hello, echo, callsign]),
        Module("numbers", "Numbers & Variables",
               "Types, conversions and arithmetic.", NUMBERS,
               [add_two, calculator, power, bandwidth]),
        Module("decisions", "Decisions",
               "Booleans, comparisons and if-statements.", DECISIONS,
               [odd_even, port_class, gate]),
        Module("loops", "Loops",
               "for, while, range, break and continue.", LOOPS,
               [countdown, sum_range, fizz, read_until]),
    ],
)
