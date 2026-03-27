import pandas as pd
from .utils import normalize_col_name
from . import mapping


class HeaderNotFoundError(Exception):
    pass


def _find_header_row(df: pd.DataFrame):
    for idx, row in df.iterrows():
        upper_cells = [normalize_col_name(c) for c in row.values]
        has_serial = any(c in {"SNO", "SNO.", "SR NO", "SRNO"} for c in upper_cells)
        has_player = any(c in {"BATSMAN NAME", "BOWLER NAME", "PLAYERS NAME", "PLAYER NAME"} for c in upper_cells)
        has_stats = any(
            c in {"MATCH TYPE", "MATCH", "RUNS", "TOTAL", "OVERS", "OVER", "WKTS", "WKT", "ECO", "INN"}
            for c in upper_cells
        )
        if has_player and (has_serial or has_stats):
            return idx
    raise HeaderNotFoundError("Header row with SNO and player name not found")


def parse_report_style_excel(uploaded_file, sheet_name=None):
    raw = pd.read_excel(uploaded_file, header=None, sheet_name=sheet_name)
    header_row_index = _find_header_row(raw)
    header_row = raw.iloc[header_row_index].fillna("")
    headers = [normalize_col_name(h) for h in header_row.tolist()]
    # dedupe headers to avoid pandas duplicate-label errors
    seen = {}
    deduped = []
    for h in headers:
        if h in seen:
            seen[h] += 1
            deduped.append(f"{h}_{seen[h]}")
        else:
            seen[h] = 0
            deduped.append(h)
    headers = deduped
    df = raw.iloc[header_row_index + 1 :].copy()
    df.columns = headers
    df = df.dropna(how="all")

    kind = mapping.kind_from_headers(headers)
    player_col = None
    for candidate in ["BATSMAN NAME", "BOWLER NAME", "PLAYERS NAME", "PLAYER NAME"]:
        if candidate in df.columns:
            player_col = candidate
            break
    if player_col is not None:
        df[player_col] = df[player_col].ffill()

    # filter valid match rows
    match_type_col = "MATCH TYPE" if "MATCH TYPE" in df.columns else ("MATCH" if "MATCH" in df.columns else None)
    idx = df.index
    mt_series = df[match_type_col] if match_type_col is not None else pd.Series([pd.NA] * len(df), index=idx)
    player_series = df[player_col] if player_col is not None else pd.Series([pd.NA] * len(df), index=idx)
    if kind == "batting":
        runs_col = [c for c in df.columns if normalize_col_name(c) in {"RUNS", "TOTAL", "TOT"}]
        balls_col = [c for c in df.columns if normalize_col_name(c) == "BALLS"]
        runs_series = df[runs_col[0]] if runs_col else pd.Series([pd.NA] * len(df), index=idx)
        balls_series = df[balls_col[0]] if balls_col else pd.Series([pd.NA] * len(df), index=idx)
        base_mask = mt_series.notna() if match_type_col is not None else player_series.notna()
        mask = base_mask & (runs_series.notna() | balls_series.notna())
        df = df[mask.fillna(False)]
    elif kind == "bowling":
        over_cols = [c for c in df.columns if normalize_col_name(c) in {"OVER", "OVERS", "O"}]
        wkt_cols = [c for c in df.columns if normalize_col_name(c) in {"WKT", "WKTS", "WICKETS", "W"}]
        over_series = df[over_cols[0]] if over_cols else pd.Series([pd.NA] * len(df), index=idx)
        wkt_series = df[wkt_cols[0]] if wkt_cols else pd.Series([pd.NA] * len(df), index=idx)
        base_mask = mt_series.notna() if match_type_col is not None else player_series.notna()
        mask = base_mask & (over_series.notna() | wkt_series.notna())
        df = df[mask.fillna(False)]

    df = mapping.select_match_columns(df, kind)

    return df.reset_index(drop=True), kind
