from typing import Dict, List
from .utils import normalize_col_name

# Canonical columns
BATTING_MAP = {
    "BATSMAN NAME": "player_name",
    "PLAYERS NAME": "player_name",
    "PLAYER NAME": "player_name",
    "MATCH TYPE": "match_type",
    "MATCH": "match_type",
    "V/S": "opponent",
    "VS": "opponent",
    "OPPONENT": "opponent",
    "VERSUS": "opponent",
    "TEAM NAME": "opponent",
    "DATE": "date",
    "VENUE": "venue",
    "VANUE": "venue",
    "GROUND": "venue",
    "RUNS": "runs",
    "TOTAL": "runs",
    "TOT": "runs",
    "BALLS": "balls",
    "HOW OUT": "how_out",
    "4S": "fours",
    "FOURS": "fours",
    "6S": "sixes",
    "SIXES": "sixes",
    "B/O": "bat_order",
    "BAT ORDER": "bat_order",
    "POSITION": "bat_order",
}

BOWLING_MAP = {
    "BOWLER NAME": "player_name",
    "PLAYERS NAME": "player_name",
    "PLAYER NAME": "player_name",
    "MATCH TYPE": "match_type",
    "MATCH": "match_type",
    "V/S": "opponent",
    "VS": "opponent",
    "OPPONENT": "opponent",
    "VERSUS": "opponent",
    "TEAM NAME": "opponent",
    "DATE": "date",
    "VENUE": "venue",
    "VANUE": "venue",
    "GROUND": "venue",
    "OVER": "overs_raw",
    "OVERS": "overs_raw",
    "O": "overs_raw",
    "RUNS": "runs_conceded",
    "RUNS GIVEN": "runs_conceded",
    "M": "maidens",
    "MAIDENS": "maidens",
    "WKT": "wickets",
    "WKTS": "wickets",
    "WICKETS": "wickets",
    "W": "wickets",
    "ECO": "economy",
    "ECON": "economy",
    "ECONOMY": "economy",
    "ECO NOMY": "economy",
    "ECO NOM": "economy",
    "B B": "balls_bowled",
    "BALLS BOWLED": "balls_bowled",
    "DOT": "dot_balls",
    "DOT BALL": "dot_balls",
    "DOT BALLS": "dot_balls",
    "DOTBALL": "dot_balls",
    "DOTBALLS": "dot_balls",
}


BAT_KEEP = [
    "BATSMAN NAME",
    "MATCH TYPE",
    "V/S",
    "DATE",
    "VANUE",
    "RUNS",
    "BALLS",
    "HOW OUT",
    "4S",
    "6S",
    "B/O",
]

BOWL_KEEP = [
    "BOWLER NAME",
    "MATCH TYPE",
    "V/S",
    "DATE",
    "VANUE",
    "OVER",
    "RUNS",
    "M",
    "WKT",
    "ECO",
]


SUMMARY_HINTS = {
    "MATCHES",
    "NOT OUT",
    "AVERAGE",
    "HEIGHEST",
    "HIGHEST",
    "STRIKE RATE",
    "TOTAL RUNS",
}


def kind_from_headers(headers: List[str]) -> str:
    up = [normalize_col_name(h) for h in headers]
    if any("BATSMAN NAME" == h for h in up):
        return "batting"
    if any("BOWLER NAME" == h for h in up):
        return "bowling"
    if any(h in {"PLAYERS NAME", "PLAYER NAME"} for h in up):
        batting_hints = {"INN", "N O", "TOTAL", "SR RATE", "100S", "50S"}
        bowling_hints = {"OVERS", "OVER", "WKTS", "WKT", "WICKETS", "ECO", "BALLS BOWLED", "B B"}
        bat_score = sum(1 for h in up if h in batting_hints)
        bowl_score = sum(1 for h in up if h in bowling_hints)
        if bowl_score > bat_score:
            return "bowling"
        if bat_score > 0:
            return "batting"
    return "unknown"


def select_match_columns(df, kind: str):
    # keep only expected columns, but allow synonyms via normalization
    mapping = BATTING_MAP if kind == "batting" else BOWLING_MAP
    keep_names = set(mapping.keys())
    selected = {}
    for col in df.columns:
        norm = normalize_col_name(col)
        if norm in keep_names:
            selected[col] = norm
    if not selected:
        return df
    return df[list(selected.keys())].copy()


def rename_to_canonical(df, kind: str):
    mapping = BATTING_MAP if kind == "batting" else BOWLING_MAP
    rename_map: Dict[str, str] = {}
    for col in df.columns:
        norm = normalize_col_name(col)
        if norm in mapping:
            rename_map[col] = mapping[norm]
    return df.rename(columns=rename_map)
