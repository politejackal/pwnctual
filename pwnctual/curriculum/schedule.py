"""The 30-day course plan.

Days that list challenge slugs are live and link into the curriculum; days
without slugs are on the roadmap and show as "coming soon". When a new path
ships, fill in its slugs here and those days light up automatically.
"""
from dataclasses import dataclass, field

from . import CHALLENGES


@dataclass
class Day:
    number: int
    title: str
    summary: str
    slugs: list = field(default_factory=list)
    minutes: int = 75  # every day sits in the 60-100 minute range

    @property
    def live(self):
        return bool(self.slugs)

    @property
    def challenges(self):
        return [CHALLENGES[s] for s in self.slugs]

    @property
    def points(self):
        return sum(c.points for c in self.challenges)


@dataclass
class Week:
    number: int
    title: str
    tagline: str
    icon: str
    tone: str
    days: list

    @property
    def live(self):
        return any(d.live for d in self.days)

    @property
    def free(self):
        return self.number in FREE_WEEKS


# Week 1 is free for everyone; everything else is part of pwnctual Pro.
FREE_WEEKS = {1}

WEEKS = [
    Week(1, "Initiation", "From a blinking cursor to your first real programs.", "skull", "primary", [
        Day(1, "First contact", "Set up your computer, meet the terminal, run your first program.", ["hello-hacker"], 60),
        Day(2, "Input and output", "Read from stdin, write to stdout, greet a hacker by name.", ["echo-chamber", "callsign"]),
        Day(3, "Numbers and variables", "Types, conversions and arithmetic.", ["add-two", "calculator"]),
        Day(4, "Math for hackers", "Huge integers, key spaces and formatting numbers.", ["power-of-two", "bandwidth"]),
        Day(5, "Decisions", "Booleans, comparisons and if-statements.", ["odd-or-even", "port-classifier", "gatekeeper"], 90),
        Day(6, "Loops", "for, while and range.", ["countdown", "sum-range"]),
        Day(7, "Loop mastery", "break, continue and reading until the end.", ["fizz-pwn", "read-until"], 90),
    ]),
    Week(2, "Data Wrangling", "Slice, search and reshape the data you find.", "data_object", "secondary", [
        Day(8, "Strings", "Indexing, slicing and string methods."),
        Day(9, "Searching text", "Finding needles in haystacks."),
        Day(10, "Lists", "Ordered collections and sorting."),
        Day(11, "Dicts and sets", "Counting, grouping and deduplicating."),
        Day(12, "Functions", "Reusable code and clean scripts."),
        Day(13, "Files", "Reading and writing files on disk."),
        Day(14, "Log hunting", "Week review: pull answers out of messy logs.", minutes=90),
    ]),
    Week(3, "Bits & Bytes", "How computers really store data.", "memory", "tertiary", [
        Day(15, "Number bases", "Binary, hex and decimal."),
        Day(16, "Bytes vs text", "str, bytes, encode and decode."),
        Day(17, "Encodings", "Hex and base64."),
        Day(18, "Bitwise operations", "AND, OR, shifts and XOR."),
        Day(19, "XOR ciphers", "Why XOR shows up everywhere in crypto."),
        Day(20, "Endianness", "Packing and unpacking binary data."),
        Day(21, "Decode the onion", "Week review: peel back layer after layer.", minutes=90),
    ]),
    Week(4, "Hacker Toolkit", "Talk to the network and automate everything.", "terminal", "primary", [
        Day(22, "Sockets", "Connecting to services over TCP."),
        Day(23, "Talking to services", "Scripted conversations with a server."),
        Day(24, "HTTP", "Requests, responses and headers."),
        Day(25, "JSON APIs", "Querying and parsing web APIs."),
        Day(26, "Classical ciphers", "Caesar and friends."),
        Day(27, "Hashing", "Digests and why they matter."),
        Day(28, "Wordlists", "Testing guesses against a hash."),
        Day(29, "Automation", "Turning one-off scripts into tools."),
        Day(30, "The Final Haunt", "Your boss-fight exam: one last run through every trick from the month. Survive it and leave no trace.", minutes=100),
    ]),
]

DAYS = [d for w in WEEKS for d in w.days]
FREE_SLUGS = {s for w in WEEKS if w.free for d in w.days for s in d.slugs}
assert [d.number for d in DAYS] == list(range(1, 31)), "days must run 1..30"
assert all(60 <= d.minutes <= 100 for d in DAYS), "daily time must stay within 60-100 minutes"
for _d in DAYS:
    for _s in _d.slugs:
        assert _s in CHALLENGES, f"schedule references unknown challenge {_s}"
