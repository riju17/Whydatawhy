import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
from src.excel_block_parser import parse_report_style_excel, HeaderNotFoundError
from src.ball_by_ball_parser import parse_ball_by_ball_excel
from src.summary_sheet_parser import parse_season_summary_excel
from src.clean_batting import clean_batting_df
from src.clean_bowling import clean_bowling_df
from src.metrics import summarize_batting, summarize_bowling
from src import charts

st.set_page_config(page_title="Cricket Stats Dashboard", layout="wide")

CATEGORY_PRIORITY = ["A", "B", "C", "D"]


def inject_sporty_theme():
    st.markdown(
        """
        <style>
        :root {
            --logo-bg1: #f7fbfc;
            --logo-bg2: #eef8fa;
            --logo-panel: #ffffff;
            --logo-cyan: #82dfe6;
            --logo-gold: #d8c48f;
            --logo-ink: #102235;
            --logo-border: rgba(130, 223, 230, 0.46);
        }
        .stApp {
            background: #edf6f7;
            color: var(--logo-ink);
        }
        h1, h2, h3, .stMarkdown p, .stCaption, .stText, label, .stSelectbox label, .stMultiSelect label, .stDateInput label {
            color: var(--logo-ink) !important;
            letter-spacing: 0.3px;
        }
        .stTabs [data-baseweb="tab-list"] {
            gap: 10px;
            padding: 4px;
            background: rgba(255, 255, 255, 0.85);
            border-radius: 12px;
            border: 1px solid var(--logo-border);
        }
        .stTabs [data-baseweb="tab"] {
            border-radius: 10px;
            color: #1f5b66;
            font-weight: 700;
        }
        .stTabs [aria-selected="true"] {
            background: #cfeff2 !important;
            color: #0d2538 !important;
        }
        .stMetric {
            background: #ffffff;
            border: 1px solid var(--logo-border);
            border-radius: 14px;
            padding: 10px 14px;
            box-shadow: 0 12px 28px rgba(20, 62, 78, 0.08);
        }
        .stDataFrame, .stAlert, [data-testid="stFileUploader"] {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid var(--logo-border);
            border-radius: 12px;
        }
        [data-baseweb="select"] > div, .stMultiSelect [data-baseweb="select"] > div, .stDateInput > div > div {
            border-color: rgba(130,223,230,0.4) !important;
            background: rgba(255,255,255,0.95) !important;
            color: var(--logo-ink) !important;
        }
        .stButton button {
            border-radius: 999px;
            border: 1px solid var(--logo-border);
            background: #d8c48f;
            color: #0d2538;
            font-weight: 700;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


# helper to sort mixed types safely
def _sorted_options(iterable):
    cleaned = []
    for v in iterable:
        if pd.isna(v):
            continue
        cleaned.append(str(v))
    return sorted(set(cleaned))


def _sorted_category_options(iterable):
    values = _sorted_options(iterable)
    ordered = [c for c in CATEGORY_PRIORITY if c in values]
    remaining = [c for c in values if c not in CATEGORY_PRIORITY]
    return ordered + remaining


def _fmt_value(v):
    if v is None or pd.isna(v):
        return "-"
    if isinstance(v, (int, np.integer)):
        return f"{int(v)}"
    if isinstance(v, (float, np.floating)):
        return f"{v:.2f}".rstrip("0").rstrip(".")
    return str(v)


def _render_metric_boxes(row: pd.Series, fields, cols_per_row=4):
    items = [(label, _fmt_value(row.get(col))) for label, col in fields if col in row.index]
    if not items:
        return
    for start in range(0, len(items), cols_per_row):
        chunk = items[start : start + cols_per_row]
        cols = st.columns(cols_per_row)
        for i, (label, value) in enumerate(chunk):
            cols[i].metric(label, value)

# ExcelFile objects are not pickle-serializable; cache as a resource.
@st.cache_resource(show_spinner=False)
def load_workbook(file_bytes: bytes):
    return pd.ExcelFile(pd.io.common.BytesIO(file_bytes))


def ingest_files(uploaded_files, sheet_selections):
    batting_frames = []
    bowling_frames = []
    errors = []
    for file in uploaded_files:
        file_has_data = False
        try:
            file_bytes = file.getvalue()
            xls = load_workbook(file_bytes)
        except Exception as exc:
            errors.append(f"Failed to read {file.name}: {exc}")
            continue
        sheet_choices = sheet_selections.get(file.name) or xls.sheet_names
        for sheet in sheet_choices:
            sheet_loaded = False
            try:
                # Season-summary layouts (player + year rows) can include batting and bowling in one sheet.
                bat_sum, bowl_sum = parse_season_summary_excel(pd.io.common.BytesIO(file_bytes), sheet_name=sheet)
                if not bat_sum.empty:
                    batting_frames.append(bat_sum)
                    sheet_loaded = True
                if not bowl_sum.empty:
                    bowling_frames.append(bowl_sum)
                    sheet_loaded = True
                if sheet_loaded:
                    file_has_data = True
                    continue
            except Exception:
                pass
            try:
                # rebuild file-like from cached bytes for each parse
                parsed_df, kind = parse_report_style_excel(pd.io.common.BytesIO(file_bytes), sheet_name=sheet)
                if kind == "batting":
                    batting_frames.append(clean_batting_df(parsed_df))
                    sheet_loaded = True
                elif kind == "bowling":
                    bowling_frames.append(clean_bowling_df(parsed_df))
                    sheet_loaded = True
                if sheet_loaded:
                    file_has_data = True
            except HeaderNotFoundError:
                # Fallback for ball-by-ball style exports that don't use the report header.
                try:
                    bat_bbb, bowl_bbb = parse_ball_by_ball_excel(pd.io.common.BytesIO(file_bytes), sheet_name=sheet)
                    if not bat_bbb.empty:
                        batting_frames.append(bat_bbb)
                        sheet_loaded = True
                    if not bowl_bbb.empty:
                        bowling_frames.append(bowl_bbb)
                        sheet_loaded = True
                    if sheet_loaded:
                        file_has_data = True
                except Exception:
                    pass
            except Exception as exc:
                errors.append(f"{file.name} / {sheet}: {exc}")
        if not file_has_data:
            errors.append(f"No supported sheets found in {file.name}")
    batting = pd.concat(batting_frames, ignore_index=True) if batting_frames else pd.DataFrame()
    bowling = pd.concat(bowling_frames, ignore_index=True) if bowling_frames else pd.DataFrame()
    if not batting.empty:
        batting = batting.drop_duplicates().reset_index(drop=True)
    if not bowling.empty:
        bowling = bowling.drop_duplicates().reset_index(drop=True)
    return batting, bowling, errors


def filter_frame(df, match_types, franchises, opponents, venues, date_range):
    if df.empty:
        return df
    if match_types:
        df = df[df["match_type"].isin(match_types)]
    if franchises and "franchise" in df.columns:
        df = df[df["franchise"].isin(franchises)]
    if opponents:
        df = df[df["opponent"].isin(opponents)]
    if venues:
        df = df[df["venue"].isin(venues)]
    if date_range and len(date_range) == 2:
        start, end = [pd.to_datetime(d) for d in date_range]
        df = df[(df["date"] >= start) & (df["date"] <= end)]
    return df


def summarize_batting_by_tournament(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or "match_type" not in df.columns:
        return pd.DataFrame()
    frames = []
    for tournament, group in df.groupby("match_type", dropna=False):
        summary = summarize_batting(group)
        if summary.empty:
            continue
        summary["match_type"] = tournament
        frames.append(summary)
    if not frames:
        return pd.DataFrame()
    result = pd.concat(frames, ignore_index=True)
    ordered = ["player_name", "match_type"] + [c for c in result.columns if c not in {"player_name", "match_type"}]
    return result[ordered]


def summarize_bowling_by_tournament(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or "match_type" not in df.columns:
        return pd.DataFrame()
    frames = []
    for tournament, group in df.groupby("match_type", dropna=False):
        summary = summarize_bowling(group)
        if summary.empty:
            continue
        summary["match_type"] = tournament
        frames.append(summary)
    if not frames:
        return pd.DataFrame()
    result = pd.concat(frames, ignore_index=True)
    ordered = ["player_name", "match_type"] + [c for c in result.columns if c not in {"player_name", "match_type"}]
    return result[ordered]


def render_profile_tab(batting, bowling):
    players = sorted(set(batting.get("player_name", [])) | set(bowling.get("player_name", []))) if not batting.empty or not bowling.empty else []
    if not players:
        st.info("Upload data to view player profiles.")
        return
    player = st.selectbox("Player", players)
    match_type_values = []
    if not batting.empty and "match_type" in batting.columns:
        match_type_values.extend(list(batting["match_type"].dropna()))
    if not bowling.empty and "match_type" in bowling.columns:
        match_type_values.extend(list(bowling["match_type"].dropna()))
    available_match_types = _sorted_options(match_type_values)
    selected_match_type = st.selectbox("Competition", ["All"] + available_match_types) if available_match_types else "All"
    match_types = [] if selected_match_type == "All" else [selected_match_type]
    franchises = st.multiselect(
        "Franchise",
        _sorted_options(list(batting.get("franchise", [])) + list(bowling.get("franchise", []))),
    )
    opponents = st.multiselect("Opponents", _sorted_options(list(batting.get("opponent", [])) + list(bowling.get("opponent", []))))
    venues = st.multiselect("Venues", _sorted_options(list(batting.get("venue", [])) + list(bowling.get("venue", []))))
    date_range = st.date_input("Date range", [])

    bat_f = filter_frame(
        batting[batting["player_name"] == player] if "player_name" in batting else batting,
        match_types,
        franchises,
        opponents,
        venues,
        date_range,
    )
    bowl_f = filter_frame(
        bowling[bowling["player_name"] == player] if "player_name" in bowling else bowling,
        match_types,
        franchises,
        opponents,
        venues,
        date_range,
    )

    franchise_values = _sorted_options(list(bat_f.get("franchise", [])) + list(bowl_f.get("franchise", [])))
    if franchise_values:
        st.caption(f"Franchise: {', '.join(franchise_values)}")

    st.subheader("Player Performance Profile")
    st.caption("Graphs below are aligned to available tournament summary data.")

    bat_tournament = summarize_batting_by_tournament(bat_f) if not bat_f.empty else pd.DataFrame()
    bowl_tournament = summarize_bowling_by_tournament(bowl_f) if not bowl_f.empty else pd.DataFrame()

    if not bat_tournament.empty:
        st.write("Batting by Tournament")
        bat_display = bat_tournament.drop(columns=["50s", "100s", "not_outs", "outs"], errors="ignore").sort_values("match_type")
        for _, row in bat_display.iterrows():
            st.markdown(f"**{row.get('match_type', 'Tournament')}**")
            _render_metric_boxes(
                row,
                [
                    ("Matches", "matches"),
                    ("Runs", "runs"),
                    ("Balls", "balls"),
                    ("4s", "fours"),
                    ("6s", "sixes"),
                    ("Average", "average"),
                    ("Strike Rate", "strike_rate"),
                ],
                cols_per_row=5,
            )
        c1, c2 = st.columns(2)
        fig = px.bar(bat_display, x="match_type", y="runs", title=f"Runs by Tournament - {player}")
        c1.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bat_runs_tournament")
        fig = px.line(bat_display, x="match_type", y="strike_rate", markers=True, title=f"Strike Rate by Tournament - {player}")
        c2.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bat_sr_tournament")
        c3, c4 = st.columns(2)
        fig = px.bar(bat_display, x="match_type", y="balls", title=f"Balls Faced by Tournament - {player}")
        c3.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bat_balls_tournament")
        if {"fours", "sixes"}.issubset(bat_display.columns):
            boundary = bat_display[["match_type", "fours", "sixes"]].melt(id_vars="match_type", var_name="boundary", value_name="count")
            fig = px.bar(boundary, x="match_type", y="count", color="boundary", barmode="group", title=f"Boundaries by Tournament - {player}")
            c4.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bat_boundaries_tournament")

    if not bowl_tournament.empty:
        st.write("Bowling by Tournament")
        bowl_display = bowl_tournament.sort_values("match_type")
        for _, row in bowl_display.iterrows():
            st.markdown(f"**{row.get('match_type', 'Tournament')}**")
            _render_metric_boxes(
                row,
                [
                    ("Matches", "matches"),
                    ("Balls", "balls"),
                    ("Overs", "overs"),
                    ("Runs Conceded", "runs_conceded"),
                    ("Dot Balls", "dot_balls"),
                    ("Wickets", "wickets"),
                    ("Economy", "economy"),
                    ("Bowling Avg", "bowling_avg"),
                    ("Bowling SR", "bowling_sr"),
                ],
                cols_per_row=5,
            )
        c5, c6 = st.columns(2)
        fig = px.bar(bowl_display, x="match_type", y="wickets", title=f"Wickets by Tournament - {player}")
        c5.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bowl_wickets_tournament")
        fig = px.line(bowl_display, x="match_type", y="economy", markers=True, title=f"Economy by Tournament - {player}")
        c6.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bowl_economy_tournament")
        c7, c8 = st.columns(2)
        fig = px.bar(bowl_display, x="match_type", y="runs_conceded", title=f"Runs Conceded by Tournament - {player}")
        c7.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bowl_runs_tournament")
        fig = px.bar(bowl_display, x="match_type", y="balls", title=f"Balls Bowled by Tournament - {player}")
        c8.plotly_chart(charts.style_figure(fig), use_container_width=True, key="profile_bowl_balls_tournament")

    if bat_tournament.empty and bowl_tournament.empty:
        st.info("No profile chart data for current filters.")


def render_compare_tab(batting, bowling):
    st.write("Compare players on key metrics")
    bat_players = sorted(batting.player_name.unique()) if not batting.empty else []
    bowl_players = sorted(bowling.player_name.unique()) if not bowling.empty else []
    players = st.multiselect("Players", sorted(set(bat_players + bowl_players)))
    match_type_values = []
    if not batting.empty and "match_type" in batting.columns:
        match_type_values.extend(list(batting["match_type"].dropna()))
    if not bowling.empty and "match_type" in bowling.columns:
        match_type_values.extend(list(bowling["match_type"].dropna()))
    available_tournaments = _sorted_options(match_type_values)
    selected_tournament = st.selectbox("Tournament", ["All"] + available_tournaments) if available_tournaments else "All"
    if not players:
        st.info("Select players to compare.")
        return

    batting_filtered = batting[batting.player_name.isin(players)] if not batting.empty else pd.DataFrame()
    bowling_filtered = bowling[bowling.player_name.isin(players)] if not bowling.empty else pd.DataFrame()
    if selected_tournament != "All":
        if not batting_filtered.empty and "match_type" in batting_filtered.columns:
            batting_filtered = batting_filtered[batting_filtered["match_type"] == selected_tournament]
        if not bowling_filtered.empty and "match_type" in bowling_filtered.columns:
            bowling_filtered = bowling_filtered[bowling_filtered["match_type"] == selected_tournament]

    bat_summary = summarize_batting(batting_filtered) if not batting_filtered.empty else pd.DataFrame()
    bowl_summary = summarize_bowling(bowling_filtered) if not bowling_filtered.empty else pd.DataFrame()

    if not bat_summary.empty:
        st.subheader("Batting")
        bat_display = bat_summary.copy()
        if {"50s", "100s"}.intersection(set(bat_display.columns)):
            bat_display = bat_display.drop(columns=["50s", "100s"])
        bat_display = bat_display.drop(columns=["innings", "highest_score", "not_outs", "outs"], errors="ignore")
        st.dataframe(bat_display)
        metric = st.selectbox("Batting metric", ["runs", "average", "strike_rate"], key="bat_metric")
        fig = charts._empty_fig() if bat_summary.empty else px.bar(bat_summary, x="player_name", y=metric, title=f"Batting {metric}")
        fig = charts.style_figure(fig)
        st.plotly_chart(fig, use_container_width=True)

    if not bowl_summary.empty:
        st.subheader("Bowling")
        bowl_display = bowl_summary.drop(columns=["maidens", "best_figures"], errors="ignore")
        st.dataframe(bowl_display)
        metric = st.selectbox("Bowling metric", ["wickets", "dot_balls", "economy", "bowling_avg", "bowling_sr"], key="bowl_metric")
        fig = charts._empty_fig() if bowl_summary.empty else px.bar(bowl_summary, x="player_name", y=metric, title=f"Bowling {metric}")
        fig = charts.style_figure(fig)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No bowling comparison data for the selected players.")

    st.subheader("Each Player Across Tournaments")
    if selected_tournament != "All":
        st.caption("Set Tournament = All to compare each player across tournaments.")
        return

    bat_tournament = summarize_batting_by_tournament(batting_filtered) if not batting_filtered.empty else pd.DataFrame()
    bowl_tournament = summarize_bowling_by_tournament(bowling_filtered) if not bowling_filtered.empty else pd.DataFrame()

    if not bat_tournament.empty:
        st.write("Batting by tournament")
        bat_tournament_display = bat_tournament.drop(
            columns=["50s", "100s", "innings", "highest_score", "not_outs", "outs"],
            errors="ignore",
        )
        st.dataframe(bat_tournament_display.sort_values(["player_name", "match_type"]))
        bat_metric_options = [
            c
            for c in bat_tournament_display.columns
            if c not in {"player_name", "match_type", "best_figures"} and pd.api.types.is_numeric_dtype(bat_tournament_display[c])
        ]
        bat_tour_metric = st.selectbox(
            "Batting tournament metric",
            bat_metric_options if bat_metric_options else ["runs"],
            key="bat_tour_metric",
        )
        fig = px.bar(
            bat_tournament,
            x="match_type",
            y=bat_tour_metric,
            color="player_name",
            barmode="group",
            title=f"Batting {bat_tour_metric} by tournament",
        )
        st.plotly_chart(charts.style_figure(fig), use_container_width=True)
    else:
        st.info("No batting tournament-wise data for selected players.")

    if not bowl_tournament.empty:
        st.write("Bowling by tournament")
        bowl_tournament_display = bowl_tournament.drop(columns=["maidens", "best_figures"], errors="ignore")
        st.dataframe(bowl_tournament_display.sort_values(["player_name", "match_type"]))
        bowl_metric_options = [
            c
            for c in bowl_tournament_display.columns
            if c not in {"player_name", "match_type"} and pd.api.types.is_numeric_dtype(bowl_tournament_display[c])
        ]
        bowl_tour_metric = st.selectbox(
            "Bowling tournament metric",
            bowl_metric_options if bowl_metric_options else ["wickets"],
            key="bowl_tour_metric",
        )
        fig = px.bar(
            bowl_tournament,
            x="match_type",
            y=bowl_tour_metric,
            color="player_name",
            barmode="group",
            title=f"Bowling {bowl_tour_metric} by tournament",
        )
        st.plotly_chart(charts.style_figure(fig), use_container_width=True)
    else:
        st.info("No bowling tournament-wise data for selected players.")


def render_match_tab(batting, bowling):
    st.write("Match/Season view")
    if batting.empty and bowling.empty:
        st.info("Upload data first.")
        return
    # Build match key
    def match_key(df):
        return df.assign(match_key=lambda r: r["date"].dt.strftime("%Y-%m-%d") + " - " + r["opponent"].fillna("") + " @ " + r["venue"].fillna(""))
    bat = match_key(batting) if not batting.empty else pd.DataFrame()
    bowl = match_key(bowling) if not bowling.empty else pd.DataFrame()

    def _clean_keys(series_or_list):
        cleaned = []
        for v in series_or_list:
            if pd.isna(v):
                continue
            text = str(v).strip()
            if text:
                cleaned.append(text)
        return cleaned

    bat_keys = _clean_keys(bat.get("match_key", []))
    bowl_keys = _clean_keys(bowl.get("match_key", []))
    keys = sorted(set(bat_keys) | set(bowl_keys))
    selected = st.multiselect("Matches", keys)
    if selected:
        bat = bat[bat["match_key"].isin(selected)] if not bat.empty else bat
        bowl = bowl[bowl["match_key"].isin(selected)] if not bowl.empty else bowl
    st.subheader("Batting totals")
    if not bat.empty:
        bat_agg = {c: "sum" for c in ["runs", "wickets", "balls"] if c in bat.columns}
        totals = bat.groupby("match_key").agg(bat_agg) if bat_agg else pd.DataFrame(index=bat["match_key"].unique())
        st.dataframe(totals)
    else:
        st.write("No batting data")
    st.subheader("Bowling totals")
    if not bowl.empty:
        bowl_agg = {c: "sum" for c in ["runs_conceded", "wickets", "balls_bowled", "dot_balls"] if c in bowl.columns}
        totals = bowl.groupby("match_key").agg(bowl_agg) if bowl_agg else pd.DataFrame(index=bowl["match_key"].unique())
        st.dataframe(totals)
    else:
        st.write("No bowling data")


def render_category_tab(batting, bowling):
    st.write("Category/Priority Ranking")
    source = st.selectbox("Source", ["Batting", "Bowling"], key="cat_source")
    base_df = batting if source == "Batting" else bowling
    if base_df.empty:
        st.info("No data available.")
        return
    if "category" not in base_df.columns:
        st.info("No category field found in uploaded data.")
        return

    category_values = _sorted_category_options(base_df["category"])
    if not category_values:
        st.info("No category values found in uploaded data.")
        return

    tournament_values = _sorted_options(base_df["match_type"]) if "match_type" in base_df.columns else []
    selected_tournament = st.selectbox("Tournament", ["All"] + tournament_values, key="cat_tournament") if tournament_values else "All"
    selected_categories = st.multiselect("Categories", category_values, default=category_values, key="cat_categories")
    filtered = base_df[base_df["category"].isin(selected_categories)]
    if selected_tournament != "All" and "match_type" in filtered.columns:
        filtered = filtered[filtered["match_type"] == selected_tournament]
    if filtered.empty:
        st.info("No rows for selected tournament/category filters.")
        return

    if source == "Batting":
        summary = summarize_batting(filtered)
        metric_options = ["runs", "average", "strike_rate", "fours", "sixes", "matches"]
        default_metric = "runs"
    else:
        summary = summarize_bowling(filtered)
        metric_options = ["wickets", "dot_balls", "economy", "bowling_avg", "bowling_sr", "matches", "balls"]
        default_metric = "wickets"
    if summary.empty:
        st.info("Unable to compute summary for selected filters.")
        return

    cat_map = filtered.groupby("player_name", dropna=False)["category"].first().reset_index()
    franchise_map = filtered.groupby("player_name", dropna=False)["franchise"].first().reset_index() if "franchise" in filtered.columns else pd.DataFrame(columns=["player_name", "franchise"])
    ranked = summary.merge(cat_map, on="player_name", how="left").merge(franchise_map, on="player_name", how="left")

    metric = st.selectbox(
        "Priority metric",
        [m for m in metric_options if m in ranked.columns],
        index=0 if default_metric in ranked.columns else 0,
        key="cat_priority_metric",
    )
    ascending = metric in {"economy", "bowling_avg", "bowling_sr"}
    ranked["priority_rank"] = (
        ranked.groupby("category", dropna=False)[metric]
        .rank(method="dense", ascending=ascending)
        .astype("Int64")
    )
    ranked["category"] = pd.Categorical(
        ranked["category"].astype("string"),
        categories=CATEGORY_PRIORITY,
        ordered=True,
    )
    ranked = ranked.sort_values(["category", "priority_rank", metric], ascending=[True, True, ascending])

    display_cols = ["category", "priority_rank", "player_name", "franchise", metric]
    display_cols = [c for c in display_cols if c in ranked.columns]
    extra_cols = [c for c in ["matches", "overs", "runs", "wickets", "dot_balls", "average", "strike_rate", "economy", "bowling_avg", "bowling_sr"] if c in ranked.columns and c not in display_cols]
    st.dataframe(ranked[display_cols + extra_cols], use_container_width=True)


def main():
    inject_sporty_theme()
    st.title("Cricket Statistics Analysis Dashboard")
    uploaded_files = st.file_uploader("Upload Excel files", type=["xlsx"], accept_multiple_files=True)

    if uploaded_files:
        sheet_selections = {}
        for file in uploaded_files:
            try:
                xls = load_workbook(file.getvalue())
                choice = st.multiselect(f"Sheets for {file.name}", xls.sheet_names, default=xls.sheet_names, key=f"sheets_{file.name}")
                sheet_selections[file.name] = choice
            except Exception as exc:
                st.warning(f"Could not read sheets from {file.name}: {exc}")
        batting, bowling, errors = ingest_files(uploaded_files, sheet_selections)
    else:
        batting = bowling = pd.DataFrame()
        errors = []

    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "Upload & Preview",
        "Player Profile",
        "Compare Players",
        "Match/Season",
        "Category Priority",
    ])

    with tab1:
        st.write("Preview cleaned data")
        if errors:
            st.error("\n".join(errors))
        st.write("Batting rows", len(batting))
        st.dataframe(batting.head())
        st.write("Bowling rows", len(bowling))
        st.dataframe(bowling.head())

    with tab2:
        render_profile_tab(batting, bowling)

    with tab3:
        render_compare_tab(batting, bowling)

    with tab4:
        render_match_tab(batting, bowling)

    with tab5:
        render_category_tab(batting, bowling)

    st.markdown(
        "<div style='text-align:center; margin-top:20px; color:#446477; font-size:0.9rem;'>made by RIJU</div>",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
