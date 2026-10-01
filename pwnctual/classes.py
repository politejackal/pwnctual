"""Live-class slots: 15-minute calls, open 08:00-24:00 in the mentor's timezone.

All times are stored and exchanged as UTC epoch seconds; each learner's browser
shows them in whatever timezone they pick.
"""
import os
from datetime import datetime, time as dtime, timedelta
from zoneinfo import ZoneInfo

SLOT_MINUTES = 15
OPEN_HOUR, CLOSE_HOUR = 8, 24      # mentor's local time; last call ends at midnight
DAYS_AHEAD = 14                    # how far ahead learners can book
LEAD_MINUTES = 60                  # no bookings in the next hour
MAX_UPCOMING = 1                   # upcoming bookings one person may hold

MENTOR_TZ_NAME = os.environ.get("PWNCTUAL_CLASS_TZ", "Asia/Riyadh")
MENTOR_TZ = ZoneInfo(MENTOR_TZ_NAME)


def _bookable_window(ts, now_ts):
    return now_ts + LEAD_MINUTES * 60 <= ts <= now_ts + DAYS_AHEAD * 86400


def slot_starts(now_ts):
    """Every bookable slot start (UTC epoch seconds) from now to DAYS_AHEAD out."""
    today = datetime.fromtimestamp(now_ts, MENTOR_TZ).date()
    out = []
    for d in range(DAYS_AHEAD + 1):
        midnight = datetime.combine(today + timedelta(days=d), dtime(), tzinfo=MENTOR_TZ)
        for m in range(OPEN_HOUR * 60, CLOSE_HOUR * 60, SLOT_MINUTES):
            ts = int((midnight + timedelta(minutes=m)).timestamp())
            if _bookable_window(ts, now_ts):
                out.append(ts)
    return out


def is_valid_slot(ts, now_ts):
    """True if ts is a real slot start inside the mentor's hours and the booking window."""
    if not isinstance(ts, int) or not _bookable_window(ts, now_ts):
        return False
    local = datetime.fromtimestamp(ts, MENTOR_TZ)
    minutes = local.hour * 60 + local.minute
    return (local.second == 0 and minutes % SLOT_MINUTES == 0
            and OPEN_HOUR * 60 <= minutes <= CLOSE_HOUR * 60 - SLOT_MINUTES)


def mentor_label(ts):
    return datetime.fromtimestamp(ts, MENTOR_TZ).strftime("%a %d %b · %I:%M %p").replace(" 0", " ")
