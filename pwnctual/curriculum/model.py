"""Data model for the pwnctual curriculum.

Hierarchy:  Path  ->  Module  ->  Challenge

Every challenge is verified the same way: the server generates fresh, random
test cases, the CLI runs the learner's program against them on their own
computer, and the server compares the program's output with the expected
answer it kept to itself. Keys that start with "_" never leave the server.
"""
from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class Challenge:
    slug: str
    title: str
    points: int
    description: str
    gen: Callable  # gen(rng, index) -> case dict
    cases: int = 3
    check: str = "exact"  # exact | contains | files
    starter: str = ""
    # filled in by the registry
    path: Optional["Path"] = None
    module: Optional["Module"] = None
    number: str = ""


@dataclass
class Module:
    id: str
    title: str
    summary: str
    lecture: str
    challenges: list = field(default_factory=list)
    path: Optional["Path"] = None
    number: str = ""

    @property
    def points(self):
        return sum(c.points for c in self.challenges)


@dataclass
class Path:
    id: str
    title: str
    tagline: str
    icon: str
    tone: str  # primary | secondary | tertiary | error
    modules: list = field(default_factory=list)
    number: int = 0

    @property
    def challenges(self):
        return [c for m in self.modules for c in m.challenges]

    @property
    def points(self):
        return sum(m.points for m in self.modules)
