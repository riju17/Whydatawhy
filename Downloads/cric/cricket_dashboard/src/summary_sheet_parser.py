import re
from pathlib import Path

import pandas as pd

from .utils import normalize_col_name, safe_numeric, overs_to_balls, compute_economy


def _dedupe_headers(headers):
    seen = {}
    out = []
    for h in headers:
        key = normalize_col_name(h)
        if key in seen:
            seen[key] += 1
            out.append(f"{key}_{seen[key]}")
        else:
            seen[key] = 0
            out.append(key)
    return out


def _first_col(headers, names):
    for i, h in enumerate(headers):
        base = h.split("_", 1)[0]
        if base in names:
            return i
    return None


def _first_col_before(headers, names, before_idx):
    if before_idx is None:
        return _first_col(headers, names)
    for i, h in enumerate(headers):
        if i >= before_idx:
            break
        base = h.split("_", 1)[0]
        if base in names:
            return i
    return None


def _first_col_after(headers, names, after_idx):
    if after_idx is None:
        return None
    for i, h in enumerate(headers):
        if i <= after_idx:
            continue
        base = h.split("_", 1)[0]
        if base in names:
            return i
    return None


def _season_date(value):
    if pd.isna(value):
        return pd.NaT
    text = str(value).strip()
    if not text:
        return pd.NaT
    if text.isdigit() and len(text) == 4:
        return pd.to_datetime(f"{text}-01-01", errors="coerce")
    m = re.search(r"(\d{2,4})", text)
    if not m:
        return pd.NaT
    year_raw = int(m.group(1))
    year = 2000 + year_raw if year_raw < 100 else year_raw
    return pd.to_datetime(f"{year}-01-01", errors="coerce")


def _competition_name(season_value, team_value):
    season_text = "" if pd.isna(season_value) else str(season_value).strip()
    team_text = "" if pd.isna(team_value) else str(team_value).strip().upper()
    if "JN" in team_text and "BHAYA" in team_text:
        return "JN BHAYA"
    if season_text == "2024":
        return "MPL 24"
    if season_text == "2025":
        return "MPL 25"
    if season_text == "2026":
        return "JN BHAYA"
    return season_text if season_text else pd.NA


def _infer_franchise_label(source_label):
    if not source_label:
        return pd.NA
    text = Path(str(source_label)).stem
    text = re.sub(r"(?i)\bfinal\b", "", text).strip(" _-")
    return text.upper() if text else pd.NA


def _text_series(series, index):
    if series is None:
        return pd.Series([pd.NA] * len(index), index=index)
    return series.astype("string").ffill().str.strip().replace("", pd.NA)


def _build_batting(df, player, match_type, team, category, matches, date, runs, balls, fours, sixes):
    out = pd.DataFrame()
    out["player_name"] = player
    out["match_type"] = match_type
    out["franchise"] = team
    out["category"] = category
    out["opponent"] = pd.NA
    out["date"] = date
    out["venue"] = team
    out["matches_reported"] = safe_numeric(matches)
    out["runs"] = safe_numeric(runs)
    out["balls"] = safe_numeric(balls)
    out["how_out"] = pd.NA
    out["fours"] = safe_numeric(fours)
    out["sixes"] = safe_numeric(sixes)
    out["bat_order"] = 0
    out["player_name"] = out["player_name"].ffill().astype("string").str.strip().replace("", pd.NA)
    out["match_type"] = out["match_type"].astype("string").str.strip().replace("", pd.NA)
    out["franchise"] = out["franchise"].astype("string").str.strip().replace("", pd.NA)
    out["category"] = out["category"].astype("string").str.strip().replace("", pd.NA)
    out["opponent"] = out["opponent"].astype("string").str.strip().replace("", pd.NA)
    out["venue"] = out["venue"].astype("string").str.strip().replace("", pd.NA).fillna(out["opponent"])
    mask = out["player_name"].notna()
    return out[mask].reset_index(drop=True)


def _build_bowling(df, player, match_type, team, category, matches, date, overs, dot_balls, bowl_runs, wickets, economy):
    out = pd.DataFrame()
    out["player_name"] = player
    out["match_type"] = match_type
    out["franchise"] = team
    out["category"] = category
    out["opponent"] = pd.NA
    out["date"] = date
    out["venue"] = team
    out["matches_reported"] = safe_numeric(matches)
    out["overs_raw"] = overs
    out["balls_bowled"] = out["overs_raw"].apply(overs_to_balls)
    out["dot_balls"] = safe_numeric(dot_balls)
    out["runs_conceded"] = safe_numeric(bowl_runs)
    out["maidens"] = 0
    out["wickets"] = safe_numeric(wickets)
    out["economy"] = pd.to_numeric(economy, errors="coerce")
    recompute_mask = out["economy"].isna() & (out["balls_bowled"] > 0)
    out.loc[recompute_mask, "economy"] = out.loc[recompute_mask].apply(
        lambda r: compute_economy(r["runs_conceded"], r["balls_bowled"]), axis=1
    )
    out["player_name"] = out["player_name"].ffill().astype("string").str.strip().replace("", pd.NA)
    out["match_type"] = out["match_type"].astype("string").str.strip().replace("", pd.NA)
    out["franchise"] = out["franchise"].astype("string").str.strip().replace("", pd.NA)
    out["category"] = out["category"].astype("string").str.strip().replace("", pd.NA)
    out["opponent"] = out["opponent"].astype("string").str.strip().replace("", pd.NA)
    out["venue"] = out["venue"].astype("string").str.strip().replace("", pd.NA).fillna(out["opponent"])
    mask = out["player_name"].notna()
    return out[mask].reset_index(drop=True)


def _parse_assam_style_summary(raw: pd.DataFrame, source_label=None):
    if raw.empty or raw.shape[1] < 30:
        return None

    headers = [_ for _ in raw.iloc[0].tolist()]
    normalized = [normalize_col_name(h) for h in headers]
    if normalized[:3] != ["PLAYER", "PROFICIENCY", "TOURNAMENT"]:
        return None

    df = raw.iloc[1:].copy()
    df = df.dropna(how="all")
    if df.empty:
        return None

    df.columns = headers
    index = df.index

    player = _text_series(df.iloc[:, 0], index)
    proficiency = _text_series(df.iloc[:, 1], index)
    tournament = _text_series(df.iloc[:, 2], index)

    batting_numeric = df.iloc[:, 3:15].apply(pd.to_numeric, errors="coerce")
    bowling_numeric = df.iloc[:, 15:30].apply(pd.to_numeric, errors="coerce")
    has_stats = batting_numeric.notna().any(axis=1) | bowling_numeric.notna().any(axis=1)
    mask = player.notna() & tournament.notna() & has_stats
    if not mask.any():
        return None

    franchise = _infer_franchise_label(source_label)
    franchise_series = pd.Series([franchise] * len(df), index=index)
    category = proficiency
    date = pd.Series([pd.NaT] * len(df), index=index)

    bat = pd.DataFrame(index=index)
    bat["player_name"] = player
    bat["match_type"] = tournament
    bat["franchise"] = franchise_series
    bat["category"] = category
    bat["opponent"] = pd.NA
    bat["date"] = date
    bat["venue"] = pd.NA
    bat["matches_reported"] = safe_numeric(df.iloc[:, 3])
    bat["runs"] = safe_numeric(df.iloc[:, 5])
    bat["balls"] = safe_numeric(df.iloc[:, 6])
    bat["how_out"] = pd.NA
    bat["fours"] = 0
    bat["sixes"] = 0
    bat["bat_order"] = 0
    bat["player_name"] = bat["player_name"].ffill().astype("string").str.strip().replace("", pd.NA)
    bat["match_type"] = bat["match_type"].astype("string").str.strip().replace("", pd.NA)
    bat["franchise"] = bat["franchise"].astype("string").str.strip().replace("", pd.NA)
    bat["category"] = bat["category"].astype("string").str.strip().replace("", pd.NA)
    bat["opponent"] = bat["opponent"].astype("string").str.strip().replace("", pd.NA)
    bat["venue"] = bat["venue"].astype("string").str.strip().replace("", pd.NA)
    bat = bat[mask].reset_index(drop=True)

    bowl = pd.DataFrame(index=index)
    bowl["player_name"] = player
    bowl["match_type"] = tournament
    bowl["franchise"] = franchise_series
    bowl["category"] = category
    bowl["opponent"] = pd.NA
    bowl["date"] = date
    bowl["venue"] = pd.NA
    bowl["matches_reported"] = safe_numeric(df.iloc[:, 15])
    bowl["overs_raw"] = df.iloc[:, 17]
    bowl["balls_bowled"] = bowl["overs_raw"].apply(overs_to_balls)
    bowl["dot_balls"] = 0
    bowl["runs_conceded"] = safe_numeric(df.iloc[:, 18])
    bowl["maidens"] = safe_numeric(df.iloc[:, 19])
    bowl["wickets"] = safe_numeric(df.iloc[:, 20])
    bowl["economy"] = pd.to_numeric(df.iloc[:, 22], errors="coerce")
    recompute_mask = bowl["economy"].isna() & (bowl["balls_bowled"] > 0)
    bowl.loc[recompute_mask, "economy"] = bowl.loc[recompute_mask].apply(
        lambda r: compute_economy(r["runs_conceded"], r["balls_bowled"]), axis=1
    )
    bowl["player_name"] = bowl["player_name"].ffill().astype("string").str.strip().replace("", pd.NA)
    bowl["match_type"] = bowl["match_type"].astype("string").str.strip().replace("", pd.NA)
    bowl["franchise"] = bowl["franchise"].astype("string").str.strip().replace("", pd.NA)
    bowl["category"] = bowl["category"].astype("string").str.strip().replace("", pd.NA)
    bowl["opponent"] = bowl["opponent"].astype("string").str.strip().replace("", pd.NA)
    bowl["venue"] = bowl["venue"].astype("string").str.strip().replace("", pd.NA)
    bowl = bowl[mask].reset_index(drop=True)
    return bat, bowl


def _parse_primary_summary(raw: pd.DataFrame):
    header_idx = None
    for idx, row in raw.iterrows():
        vals = {normalize_col_name(v) for v in row.tolist()}
        if {"PLAYER NAME", "YEAR", "MATCHES"}.issubset(vals):
            header_idx = idx
            break
    if header_idx is None:
        return None

    header_row = raw.iloc[header_idx].fillna("")
    headers = _dedupe_headers(header_row.tolist())
    df = raw.iloc[header_idx + 1 :].copy()
    df.columns = headers
    df = df.dropna(how="all")
    if df.empty:
        return None

    over_idx = _first_col(headers, {"OVER", "OVERS", "O"})
    player_idx = _first_col(headers, {"PLAYER NAME", "BATSMAN NAME", "BOWLER NAME", "PLAYERS NAME"})
    category_idx = _first_col(headers, {"CATEGORY", "CAT"})
    year_idx = _first_col(headers, {"YEAR", "SEASON"})
    matches_idx = _first_col(headers, {"MATCHES", "MATCH"})
    team_idx = _first_col(headers, {"TEAM", "TEAM NAME"})
    bat_runs_idx = _first_col_before(headers, {"RUNS", "TOTAL", "TOT"}, over_idx)
    balls_idx = _first_col_before(headers, {"BALLS"}, over_idx)
    fours_idx = _first_col_before(headers, {"4S", "FOURS"}, over_idx)
    sixes_idx = _first_col_before(headers, {"6S", "SIXES"}, over_idx)
    bowl_runs_idx = _first_col_after(headers, {"RUNS", "RUNS GIVEN"}, over_idx)
    dot_idx = _first_col_after(headers, {"DOT", "DOT BALL", "DOT BALLS", "DOTBALL", "DOTBALLS"}, over_idx)
    wickets_idx = _first_col_after(headers, {"WKT", "WKTS", "WICKETS", "W"}, over_idx)
    economy_idx = _first_col_after(headers, {"ECO", "ECONOMY", "ECON"}, over_idx)

    if player_idx is None or year_idx is None:
        return None

    player = df.iloc[:, player_idx].ffill()
    season = df.iloc[:, year_idx]
    matches = df.iloc[:, matches_idx] if matches_idx is not None else pd.Series([0] * len(df), index=df.index)
    team = df.iloc[:, team_idx].ffill() if team_idx is not None else pd.Series([pd.NA] * len(df), index=df.index)
    category = df.iloc[:, category_idx].ffill() if category_idx is not None else pd.Series([pd.NA] * len(df), index=df.index)
    match_type = pd.Series(
        [_competition_name(season.iloc[i], team.iloc[i]) for i in range(len(df))],
        index=df.index,
    )
    date = season.apply(_season_date)

    bat = _build_batting(
        df,
        player=player,
        match_type=match_type,
        team=team,
        category=category,
        matches=matches,
        date=date,
        runs=df.iloc[:, bat_runs_idx] if bat_runs_idx is not None else 0,
        balls=df.iloc[:, balls_idx] if balls_idx is not None else 0,
        fours=df.iloc[:, fours_idx] if fours_idx is not None else 0,
        sixes=df.iloc[:, sixes_idx] if sixes_idx is not None else 0,
    )
    bowl = _build_bowling(
        df,
        player=player,
        match_type=match_type,
        team=team,
        category=category,
        matches=matches,
        date=date,
        overs=df.iloc[:, over_idx] if over_idx is not None else 0,
        dot_balls=df.iloc[:, dot_idx] if dot_idx is not None else 0,
        bowl_runs=df.iloc[:, bowl_runs_idx] if bowl_runs_idx is not None else 0,
        wickets=df.iloc[:, wickets_idx] if wickets_idx is not None else 0,
        economy=df.iloc[:, economy_idx] if economy_idx is not None else 0,
    )
    return bat, bowl


def parse_season_summary_excel(uploaded_file, sheet_name=None, source_label=None):
    raw = pd.read_excel(uploaded_file, header=None, sheet_name=0 if sheet_name is None else sheet_name)
    parsed = _parse_primary_summary(raw)
    if parsed is None:
        parsed = _parse_assam_style_summary(raw, source_label=source_label)
    if parsed is None:
        raise ValueError("Not a supported season-summary layout")
    return parsed
