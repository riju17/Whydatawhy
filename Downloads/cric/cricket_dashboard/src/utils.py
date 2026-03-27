import re
import pandas as pd
import numpy as np


def normalize_col_name(name: str) -> str:
    """Upper-case, remove punctuation except slashes, collapse whitespace."""
    if name is None or (isinstance(name, float) and pd.isna(name)):
        return ""
    name = str(name)
    # keep forward slash for V/S patterns
    name = re.sub(r"[\t\n\r]", " ", name)
    name = re.sub(r"[\.,]+", " ", name)
    name = re.sub(r"[^A-Z0-9/ ]", " ", name.upper())
    name = re.sub(r"\s+", " ", name).strip()
    return name


def parse_date(val):
    if pd.isna(val):
        return pd.NaT
    if isinstance(val, (pd.Timestamp, pd.DatetimeIndex)):
        return pd.to_datetime(val, errors="coerce")
    text = str(val).strip()
    if not text:
        return pd.NaT
    # handle formats like 2-Oct or 02-Oct-23
    try:
        return pd.to_datetime(text, errors="coerce", dayfirst=True)
    except Exception:
        return pd.NaT


def safe_numeric(series, fill=0):
    return pd.to_numeric(series, errors="coerce").fillna(fill)


def overs_to_balls(overs_raw):
    """Convert overs in cricket notation to balls (e.g., 9.4 -> 58)."""
    if pd.isna(overs_raw):
        return 0
    try:
        text = str(overs_raw).strip()
        if not text:
            return 0
        if ":" in text:  # handle formats like 9:4
            over_part, ball_part = text.split(":", 1)
            over = int(float(over_part))
            balls = int(float(ball_part))
            return over * 6 + balls
        if "/" in text:  # unlikely but guard
            text = text.replace("/", ".")
        value = float(text)
        over = int(value)
        balls = round((value - over) * 10)
        if balls >= 6:
            # occasionally excel decimals like .6 meaning 6 balls
            over += balls // 6
            balls = balls % 6
        return over * 6 + balls
    except Exception:
        return 0


def compute_economy(runs_conceded, balls_bowled):
    if balls_bowled is None or pd.isna(balls_bowled) or balls_bowled == 0:
        return 0.0
    return float(runs_conceded) / (balls_bowled / 6)

