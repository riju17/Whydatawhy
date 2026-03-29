import pandas as pd


def _unique_matches(df: pd.DataFrame):
    return df[["date", "opponent", "venue", "match_type"]].drop_duplicates().shape[0]


def _matches_count(df: pd.DataFrame):
    if "matches_reported" in df.columns:
        reported = pd.to_numeric(df["matches_reported"], errors="coerce").fillna(0)
        # For summary sheets, always trust explicit reported matches, even when total is zero.
        return int(reported.sum())
    return _unique_matches(df)


def _balls_to_overs_str(balls):
    balls_int = int(round(float(balls))) if balls is not None else 0
    overs = balls_int // 6
    rem = balls_int % 6
    return f"{overs}.{rem}"


def summarize_batting(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
    def agg(group):
        matches = _matches_count(group)
        innings = int(matches) if "matches_reported" in group.columns and matches > 0 else len(group)
        runs = group["runs"].sum()
        balls = group["balls"].sum()
        fours = group["fours"].sum()
        sixes = group["sixes"].sum()
        average = runs / innings if innings else None
        strike_rate = (runs / balls * 100) if balls else None
        highest = group["runs"].max()
        fifties = (group["runs"] >= 50).sum()
        hundreds = (group["runs"] >= 100).sum()
        return pd.Series(
            {
                "matches": matches,
                "innings": innings,
                "runs": runs,
                "balls": balls,
                "fours": fours,
                "sixes": sixes,
                "average": average,
                "strike_rate": strike_rate,
                "highest_score": highest,
                "50s": fifties,
                "100s": hundreds,
            }
        )

    return df.groupby("player_name").apply(agg).reset_index()


def summarize_bowling(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
    def agg(group):
        matches = _matches_count(group)
        balls = group["balls_bowled"].sum()
        overs_decimal = balls / 6
        overs = _balls_to_overs_str(balls)
        runs = group["runs_conceded"].sum()
        dot_balls = group["dot_balls"].sum() if "dot_balls" in group.columns else 0
        wickets = group["wickets"].sum()
        maidens = group["maidens"].sum()
        if "economy" in group.columns:
            econ = pd.to_numeric(group["economy"], errors="coerce")
            weights = pd.to_numeric(group.get("balls_bowled", pd.Series([0] * len(group))), errors="coerce").fillna(0)
            valid = econ.notna() & (weights > 0)
            if valid.any():
                economy = (econ[valid] * weights[valid]).sum() / weights[valid].sum()
            else:
                economy = runs / overs_decimal if overs_decimal else None
        else:
            economy = runs / overs_decimal if overs_decimal else None
        bowling_avg = runs / wickets if wickets else None
        bowling_sr = balls / wickets if wickets else None
        # best figures: max wickets, tiebreak by min runs
        best_row = group.sort_values([
            "wickets",
            "runs_conceded"
        ], ascending=[False, True]).iloc[0]
        best_figures = f"{int(best_row['wickets'])}/{int(best_row['runs_conceded'])}"
        return pd.Series(
            {
                "matches": matches,
                "balls": balls,
                "overs": overs,
                "runs_conceded": runs,
                "dot_balls": dot_balls,
                "wickets": wickets,
                "maidens": maidens,
                "economy": economy,
                "bowling_avg": bowling_avg,
                "bowling_sr": bowling_sr,
                "best_figures": best_figures,
            }
        )

    return df.groupby("player_name").apply(agg).reset_index()
