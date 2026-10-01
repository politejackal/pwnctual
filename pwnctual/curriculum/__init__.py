"""Curriculum registry. To add a path, create a module exporting PATH and list it here."""
from . import p1_initiation

PATHS = [p1_initiation.PATH]

CHALLENGES = {}
MODULES = {}

for pi, path in enumerate(PATHS, start=1):
    path.number = pi
    for mi, module in enumerate(path.modules, start=1):
        module.path = path
        module.number = f"{pi}.{mi}"
        MODULES[(path.id, module.id)] = module
        for ci, chal in enumerate(module.challenges, start=1):
            chal.path, chal.module = path, module
            chal.number = f"{pi}.{mi}.{ci}"
            if chal.slug in CHALLENGES:
                raise ValueError(f"duplicate challenge slug: {chal.slug}")
            CHALLENGES[chal.slug] = chal

TOTAL_POINTS = sum(c.points for c in CHALLENGES.values())
