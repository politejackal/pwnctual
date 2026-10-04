"""Ranked ladder, Brawl Stars style: five ranks from Noob to Ghost. Your score is the number of challenges completed."""

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


# Challenges completed needed for each rank, in RANKS order.
THRESHOLDS = [0, 100, 500, 2500, 10000]


def thresholds(total=None):
    return list(THRESHOLDS)


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
