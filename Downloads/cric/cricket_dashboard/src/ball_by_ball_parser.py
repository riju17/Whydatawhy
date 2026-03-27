import pandas as pd

from .utils import normalize_col_name, parse_date, safe_numeric, compute_economy


def _norm_col_map(df: pd.DataFrame):
    return {normalize_col_name(c): c for c in df.columns}


def _series(df: pd.DataFrame, col_map: dict, norm_name: str, default=0):
    col = col_map.get(norm_name)
    if col is None:
        return pd.Series([default] * len(df), index=df.index)
    return df[col]


def _to_bool(series: pd.Series) -> pd.Series:
    text = series.fillna("").astype(str).str.strip().str.upper()
    return text.isin({"1", "YES", "Y", "TRUE", "OUT", "WICKET"})


def _delivery_key(series: pd.Series) -> pd.Series:
    text = series.fillna("").astype(str).str.strip()
    return text.str.extract(r"^(\d+)")[0].fillna(text)


def _overs_from_balls(balls: int) -> str:
    overs = int(balls) // 6
    rem = int(balls) % 6
    return f"{overs}.{rem}"


def _to_int_text(series: pd.Series) -> pd.Series:
    return safe_numeric(series, fill=0).astype(int)


def parse_ball_by_ball_excel(uploaded_file, sheet_name=None):
    raw = pd.read_excel(uploaded_file, sheet_name=sheet_name, header=None)
    if raw.empty or raw.shape[0] < 2:
        raise ValueError("Empty sheet")

    required = {"BOWLER", "STRIKER", "RUN", "DELIVERY ID"}
    header_row_idx = None
    for idx, row in raw.iterrows():
        names = {normalize_col_name(v) for v in row.tolist()}
        if required.issubset(names):
            header_row_idx = idx
            break
    if header_row_idx is None:
        raise ValueError("Not a supported ball-by-ball layout")

    header_row = raw.iloc[header_row_idx].fillna("")
    headers = [str(c).strip() for c in header_row.tolist()]
    dedup = {}
    fixed_headers = []
    for h in headers:
        key = h if h else "Unnamed"
        if key in dedup:
            dedup[key] += 1
            fixed_headers.append(f"{key}_{dedup[key]}")
        else:
            dedup[key] = 0
            fixed_headers.append(key)

    df = raw.iloc[header_row_idx + 1 :].copy()
    df.columns = fixed_headers
    df = df.dropna(how="all")
    df["__seq"] = range(len(df))
    cols = _norm_col_map(df)

    df["date"] = _series(df, cols, "MATCH DATE", pd.NaT).apply(parse_date)
    df["match_type"] = _series(df, cols, "MATCH TYPE", pd.NA).astype("string").str.strip()
    df["innings"] = _series(df, cols, "INNINGS", pd.NA).astype("string").str.strip().replace("", pd.NA)
    df["bat_team"] = _series(df, cols, "BAT TEAM", pd.NA).astype("string").str.strip()
    df["bowl_team"] = _series(df, cols, "BOWLINGTEAM", pd.NA).astype("string").str.strip()
    df["venue"] = _series(df, cols, "VENUE", pd.NA).astype("string").str.strip()
    df["striker"] = _series(df, cols, "STRIKER", pd.NA).astype("string").str.strip()
    df["bowler"] = _series(df, cols, "BOWLER", pd.NA).astype("string").str.strip()

    df["run"] = safe_numeric(_series(df, cols, "RUN", 0), fill=0)
    df["wide"] = safe_numeric(_series(df, cols, "WIDE", 0), fill=0)
    df["nb"] = safe_numeric(_series(df, cols, "NB", 0), fill=0)
    df["blb"] = safe_numeric(_series(df, cols, "BLB", 0), fill=0)
    df["legal_ball"] = (df["wide"] == 0) & (df["nb"] == 0)
    df["is_dot_ball"] = df["legal_ball"] & (df["run"] == 0)
    df["batter_runs"] = (df["run"] - df["wide"] - df["nb"] - df["blb"]).clip(lower=0)
    df["delivery_id"] = _series(df, cols, "DELIVERY ID", "").astype(str).str.strip()
    df["over_no"] = _delivery_key(df["delivery_id"])

    wicket_flag = _to_bool(_series(df, cols, "WICKET", ""))
    wicket_type = _series(df, cols, "WICKET TYPE", "").astype("string").fillna("").str.strip()
    wicket_at = _series(df, cols, "WICKET AT", pd.NA).astype("string").str.strip()
    df["dismissed_batter"] = wicket_at.fillna(df["striker"])
    df["is_dismissal"] = wicket_flag
    df["wicket_type"] = wicket_type

    match_keys = ["date", "match_type", "innings", "bat_team", "bowl_team", "venue"]

    bat_base = (
        df[df["striker"].notna() & (df["striker"] != "")]
        .groupby(match_keys + ["striker"], dropna=False)
        .agg(
            runs=("batter_runs", "sum"),
            balls=("legal_ball", "sum"),
            fours=("batter_runs", lambda s: (s == 4).sum()),
            sixes=("batter_runs", lambda s: (s == 6).sum()),
            first_seq=("__seq", "min"),
        )
        .reset_index()
        .rename(columns={"striker": "player_name"})
    )

    dismissal_rows = df[df["is_dismissal"] & df["dismissed_batter"].notna()].copy()
    dismissal_rows["player_name"] = dismissal_rows["dismissed_batter"]
    dismissals = (
        dismissal_rows.groupby(match_keys + ["player_name"], dropna=False)["wicket_type"]
        .first()
        .reset_index()
        .rename(columns={"wicket_type": "how_out"})
    )

    bat_df = bat_base.merge(dismissals, on=match_keys + ["player_name"], how="left")
    bat_df["how_out"] = bat_df["how_out"].fillna("NOT OUT")
    bat_df["not_out"] = bat_df["how_out"].astype(str).str.upper().str.contains("NOT OUT", regex=False, na=False)
    bat_df["opponent"] = bat_df["bowl_team"]
    bat_df["venue"] = bat_df["venue"].fillna(bat_df["opponent"])
    bat_df["bat_order"] = (
        bat_df.sort_values(match_keys + ["first_seq", "player_name"])
        .groupby(match_keys, dropna=False)
        .cumcount()
        .add(1)
    )

    invalid_wickets = {"RUN OUT", "RETIRED HURT", "OBSTRUCTING THE FIELD", "TIMED OUT", "HIT WICKET"}
    wicket_credit = df["is_dismissal"] & ~df["wicket_type"].str.upper().isin(invalid_wickets)

    bowl_df = (
        df[df["bowler"].notna() & (df["bowler"] != "")]
        .groupby(match_keys + ["bowler"], dropna=False)
        .agg(
            balls_bowled=("legal_ball", "sum"),
            dot_balls=("is_dot_ball", "sum"),
            runs_conceded=("run", "sum"),
            blb_runs=("blb", "sum"),
            wickets=("is_dismissal", lambda s: 0),
        )
        .reset_index()
        .rename(columns={"bowler": "player_name"})
    )

    wicket_counts = (
        df[wicket_credit & df["bowler"].notna()]
        .groupby(match_keys + ["bowler"], dropna=False)
        .size()
        .reset_index(name="wickets")
        .rename(columns={"bowler": "player_name"})
    )
    bowl_df = bowl_df.drop(columns=["wickets"]).merge(
        wicket_counts, on=match_keys + ["player_name"], how="left"
    )
    bowl_df["wickets"] = bowl_df["wickets"].fillna(0)
    bowl_df["runs_conceded"] = (bowl_df["runs_conceded"] - bowl_df["blb_runs"]).clip(lower=0)

    over_conceded = (
        df[df["bowler"].notna() & (df["bowler"] != "")]
        .assign(runs_for_maiden=lambda x: (x["run"] - x["blb"]).clip(lower=0))
        .groupby(match_keys + ["bowler", "over_no"], dropna=False)["runs_for_maiden"]
        .sum()
        .reset_index()
    )
    maidens = (
        over_conceded.groupby(match_keys + ["bowler"], dropna=False)["runs_for_maiden"]
        .apply(lambda s: int((s == 0).sum()))
        .reset_index(name="maidens")
        .rename(columns={"bowler": "player_name"})
    )
    bowl_df = bowl_df.merge(maidens, on=match_keys + ["player_name"], how="left")
    bowl_df["maidens"] = bowl_df["maidens"].fillna(0)

    bowl_df["overs_raw"] = bowl_df["balls_bowled"].apply(_overs_from_balls)
    bowl_df["economy"] = bowl_df.apply(
        lambda r: compute_economy(r["runs_conceded"], r["balls_bowled"]), axis=1
    )
    bowl_df["opponent"] = bowl_df["bat_team"]
    bowl_df["venue"] = bowl_df["venue"].fillna(bowl_df["opponent"])

    bat_df["runs"] = _to_int_text(bat_df["runs"])
    bat_df["balls"] = _to_int_text(bat_df["balls"])
    bat_df["fours"] = _to_int_text(bat_df["fours"])
    bat_df["sixes"] = _to_int_text(bat_df["sixes"])
    bat_df["bat_order"] = _to_int_text(bat_df["bat_order"])

    bowl_df["balls_bowled"] = _to_int_text(bowl_df["balls_bowled"])
    bowl_df["runs_conceded"] = _to_int_text(bowl_df["runs_conceded"])
    bowl_df["dot_balls"] = _to_int_text(bowl_df["dot_balls"])
    bowl_df["maidens"] = _to_int_text(bowl_df["maidens"])
    bowl_df["wickets"] = _to_int_text(bowl_df["wickets"])

    batting = bat_df[
        [
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
            "not_out",
        ]
    ].copy()
    bowling = bowl_df[
        [
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
    ].copy()

    batting = batting[(batting["runs"] > 0) | (batting["balls"] > 0)].reset_index(drop=True)
    bowling = bowling[(bowling["balls_bowled"] > 0) | (bowling["wickets"] > 0)].reset_index(drop=True)
    return batting, bowling
