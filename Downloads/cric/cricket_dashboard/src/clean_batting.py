import pandas as pd
from . import mapping
from .utils import parse_date, safe_numeric

BAT_COLS = [
    "player_name",
    "match_type",
    "opponent",
    "date",
    "venue",
    "runs",
    "balls",
    "how_out",
    "fours",
    "sixes",
    "bat_order",
]


def clean_batting_df(df_raw: pd.DataFrame) -> pd.DataFrame:
    raw_df = mapping.rename_to_canonical(df_raw, kind="batting")

    def _coalesced_col(frame: pd.DataFrame, col: str) -> pd.Series:
        if col not in frame.columns:
            return pd.Series([None] * len(frame), index=frame.index)
        picked = frame[col]
        if isinstance(picked, pd.DataFrame):
            return picked.bfill(axis=1).iloc[:, 0]
        return picked

    df = pd.DataFrame(index=raw_df.index)
    for col in BAT_COLS:
        df[col] = _coalesced_col(raw_df, col)

    df["date"] = df["date"].apply(parse_date)
    df["runs"] = safe_numeric(df["runs"])
    df["balls"] = safe_numeric(df["balls"])
    df["fours"] = safe_numeric(df["fours"])
    df["sixes"] = safe_numeric(df["sixes"])
    df["bat_order"] = safe_numeric(df["bat_order"])

    df["player_name"] = df["player_name"].ffill()
    for text_col in ["player_name", "opponent", "venue", "match_type", "how_out"]:
        df[text_col] = df[text_col].astype("string").str.strip().replace("", pd.NA)
    df["venue"] = df["venue"].fillna(df["opponent"])

    # Keep rows with either a match_type or player, and at least runs or balls
    base_mask = df["match_type"].notna() | df["player_name"].notna()
    df = df[base_mask & ((df["runs"] > 0) | (df["balls"] > 0))]
    df = df.reset_index(drop=True)
    return df
