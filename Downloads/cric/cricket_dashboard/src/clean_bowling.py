import pandas as pd
from . import mapping
from .utils import parse_date, safe_numeric, overs_to_balls, compute_economy

BOWL_COLS = [
    "player_name",
    "match_type",
    "opponent",
    "date",
    "venue",
    "overs_raw",
    "balls_bowled",
    "runs_conceded",
    "dot_balls",
    "maidens",
    "wickets",
    "economy",
]


def clean_bowling_df(df_raw: pd.DataFrame) -> pd.DataFrame:
    raw_df = mapping.rename_to_canonical(df_raw, kind="bowling")

    def _coalesced_col(frame: pd.DataFrame, col: str) -> pd.Series:
        """Return one series for a possibly duplicated column label."""
        if col not in frame.columns:
            return pd.Series([None] * len(frame), index=frame.index)
        picked = frame[col]
        if isinstance(picked, pd.DataFrame):
            return picked.bfill(axis=1).iloc[:, 0]
        return picked

    # Build a normalized frame with unique column labels.
    df = pd.DataFrame(index=raw_df.index)
    for col in [
        "player_name",
        "match_type",
        "opponent",
        "date",
        "venue",
        "overs_raw",
        "runs_conceded",
        "dot_balls",
        "maidens",
        "wickets",
        "economy",
    ]:
        df[col] = _coalesced_col(raw_df, col)

    # compute balls from overs
    df["balls_bowled"] = df["overs_raw"].apply(overs_to_balls)
    df["runs_conceded"] = safe_numeric(df["runs_conceded"])
    df["dot_balls"] = safe_numeric(df["dot_balls"])
    df["maidens"] = safe_numeric(df["maidens"])
    df["wickets"] = safe_numeric(df["wickets"])
    df["economy"] = pd.to_numeric(df["economy"], errors="coerce")
    recompute_mask = df["economy"].isna() & (df["balls_bowled"] > 0)
    df.loc[recompute_mask, "economy"] = df.loc[recompute_mask].apply(
        lambda r: compute_economy(r["runs_conceded"], r["balls_bowled"]), axis=1
    )

    df["date"] = df["date"].apply(parse_date)
    df["player_name"] = df["player_name"].ffill()
    for text_col in ["player_name", "opponent", "venue", "match_type"]:
        df[text_col] = df[text_col].astype("string").str.strip().replace("", pd.NA)
    df["venue"] = df["venue"].fillna(df["opponent"])

    base_mask = df["match_type"].notna() | df["player_name"].notna()
    df = df[base_mask & ((df["balls_bowled"] > 0) | (df["wickets"] > 0))]
    df = df.reset_index(drop=True)
    return df[BOWL_COLS]
