import re
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
    out["not_out"] = False
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


def parse_season_summary_excel(uploaded_file, sheet_name=None):
    raw = pd.read_excel(uploaded_file, header=None, sheet_name=sheet_name)
    parsed = _parse_primary_summary(raw)
    if parsed is None:
        raise ValueError("Not a supported season-summary layout")
    return parsed
