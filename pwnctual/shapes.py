"""Material 3 Expressive shape library (cookie, clover, sunny, squircle...).

Every shape is sampled with the same number of points from the same start
angle, so any two can be morphed into each other with SVG <animate>.
"""
import math

N = 240


def _profile(u):
    # round lobe tops, softly pinched joins (like M3's cookie / clover shapes)
    return 1 - (1 - u) ** 2


def _lobes(k, depth, invert=False, soft=0.08):
    def r(t):
        s = abs(math.sin(k * t / 2))
        u = (math.sqrt(s * s + soft * soft) - soft) / (math.sqrt(1 + soft * soft) - soft)
        p = _profile(u)
        return 1 - depth * (1 - p) if not invert else 1 - depth * p
    return r


def _squircle(n=4.0):
    def r(t):
        c, s = abs(math.cos(t)), abs(math.sin(t))
        return (c ** n + s ** n) ** (-1 / n) / 1.12
    return r


RADIAL = {
    "circle": lambda t: 1.0,
    "cookie4": _lobes(4, 0.12),
    "cookie6": _lobes(6, 0.11),
    "cookie9": _lobes(9, 0.10),
    "cookie12": _lobes(12, 0.07),
    "clover4": _lobes(4, 0.36),
    "clover8": _lobes(8, 0.22),
    "sunny": _lobes(8, 0.12, invert=True, soft=0.25),
    "verysunny": _lobes(8, 0.22, invert=True, soft=0.18),
    "squircle": _squircle(4.0),
}


def path(name, cx=0.0, cy=0.0, size=100.0, rot=-90.0):
    f = RADIAL[name]
    pts = []
    for i in range(N):
        t = 2 * math.pi * i / N
        r = f(t)
        a = t + math.radians(rot)
        pts.append(f"{cx + size / 2 * r * math.cos(a):.2f},{cy + size / 2 * r * math.sin(a):.2f}")
    # squircle exceeds the unit circle at corners; others are normalized to radius 1
    return "M" + " L".join(pts) + " Z"


def morph(names, cx, cy, size, rot=-90.0):
    """Value list for <animate attributeName="d" values=...> cycling through shapes."""
    seq = list(names) + [names[0]]
    return ";".join(path(n, cx, cy, size, rot) for n in seq)


def animation(names, cx, cy, size, seconds_per_shape=3.0, rot=-90.0):
    """Attributes for an <animate> that holds each shape, then morphs with an
    expressive (overshooting) spline to the next."""
    seq = list(names) + [names[0]]
    values, times, splines = [], [], []
    n = len(names)
    for i, name in enumerate(seq):
        d = path(name, cx, cy, size, rot)
        if i == 0:
            values.append(d); times.append(0.0)
            continue
        hold_end = (i - 1) / n + 0.55 / n
        values.append(values[-1]); times.append(hold_end); splines.append("0 0 1 1")
        values.append(d); times.append(i / n); splines.append("0.2 0 0 1")
    return {
        "d": values[0], "values": ";".join(values), "dur": f"{n * seconds_per_shape:g}s",
        "keyTimes": ";".join(f"{t:.4f}" for t in times), "keySplines": ";".join(splines),
    }
