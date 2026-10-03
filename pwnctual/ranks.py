"""Ranked ladder, Brawl Stars style: five ranks from Noob to Ghost. Your score is the number of challenges completed.

Thresholds scale with the curriculum, so Ghost always means "cleared it all".
"""
import math

# key, name, metal (highlight, mid, shadow), glow, motto
RANKS = [
    ("noob",   "Noob",   ("#D9DEE8", "#7D8597", "#30364A"), None,      "Everyone starts somewhere."),
    ("shadow", "Shadow", ("#C9C2FF", "#4B3FB0", "#120D38"), "#9C8CFF", "You move unseen."),
    ("demon",  "Demon",  ("#FFB4A6", "#E3303C", "#560615"), "#FF4A3D", "Your code burns."),
    ("reaper", "Reaper", ("#C4FFE6", "#1FC98D", "#053F31"), "#43FFB4", "Bugs whisper your name."),
    ("ghost",  "Ghost",  ("#FFFFFF", "#BEE7FF", "#5B6CFF"), "#7DF9FF", "Leave no trace."),
]


def _tiers():
    return [{"key": key, "name": name, "label": name, "order": i, "division": None,
             "hi": metal[0], "mid": metal[1], "lo": metal[2], "glow": glow, "motto": motto}
            for i, (key, name, metal, glow, motto) in enumerate(RANKS)]


TIERS = _tiers()


def thresholds(total):
    n = len(TIERS) - 1
    if 0 < total < n:
        # Too few challenges for a step per rank: ranks share thresholds, and clearing everything is still Ghost.
        return [0] + [min(total, max(1, math.ceil(total * (i / n) ** 1.5))) for i in range(1, n)] + [total]
    mins = [0 if i == 0 else max(i, math.ceil(total * (i / n) ** 1.5)) for i in range(n)]
    for i in range(1, n):
        mins[i] = max(mins[i], mins[i - 1] + 1)
    mins.append(max(total, mins[-1] + 1))
    return mins


def ladder(total):
    return [dict(t, min=m, index=i) for i, (t, m) in enumerate(zip(TIERS, thresholds(total)))]


def rank_for(score, total):
    lad = ladder(total)
    idx = 0
    for t in lad:
        if score >= t["min"]:
            idx = t["index"]
    cur = lad[idx]
    nxt = lad[idx + 1] if idx + 1 < len(lad) else None
    if nxt:
        span = nxt["min"] - cur["min"]
        progress = (score - cur["min"]) / span if span else 1.0
    else:
        progress = 1.0
    return {"tier": cur, "next": nxt, "progress": max(0.0, min(1.0, progress)),
            "score": score, "to_next": (nxt["min"] - score) if nxt else 0}
