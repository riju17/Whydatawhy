import plotly.express as px
import pandas as pd


SPORTY_COLORS = [
    "#FF1B5C",  # cheetah red
    "#F5B333",  # gold accent
    "#F5F1EA",  # logo white
    "#B60031",  # deep red
    "#C97D11",  # dark gold
    "#3B3B44",  # charcoal
]


def style_figure(fig):
    fig.update_layout(
        template="plotly_white",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255,255,255,0.92)",
        font={"family": "Trebuchet MS, Segoe UI, sans-serif", "color": "#191821"},
        title={"font": {"size": 18, "color": "#B60031"}},
        colorway=SPORTY_COLORS,
        margin={"l": 36, "r": 20, "t": 62, "b": 36},
        legend={"bgcolor": "rgba(255,255,255,0.82)", "bordercolor": "rgba(182,0,49,0.16)", "borderwidth": 1},
    )
    fig.update_xaxes(gridcolor="rgba(182,0,49,0.10)", zeroline=False, linecolor="rgba(25,24,33,0.18)")
    fig.update_yaxes(gridcolor="rgba(245,179,51,0.14)", zeroline=False, linecolor="rgba(25,24,33,0.18)")
    return fig


def _empty_fig(message="No data"):
    fig = px.scatter()
    fig.update_layout(title=message)
    return style_figure(fig)


def runs_by_date(df_batting, player_name: str):
    if "player_name" not in df_batting.columns:
        return _empty_fig("No batting data")
    data = df_batting[df_batting["player_name"] == player_name]
    if data.empty:
        return _empty_fig()
    fig = px.line(data.sort_values("date"), x="date", y="runs", title=f"Runs by date - {player_name}")
    return style_figure(fig)


def strike_rate_by_date(df_batting, player_name: str):
    if "player_name" not in df_batting.columns:
        return _empty_fig("No batting data")
    data = df_batting[df_batting["player_name"] == player_name].copy()
    if data.empty:
        return _empty_fig()
    data["strike_rate"] = data.apply(lambda r: (r["runs"] / r["balls"] * 100) if r["balls"] else 0, axis=1)
    fig = px.line(data.sort_values("date"), x="date", y="strike_rate", title=f"Strike rate by date - {player_name}")
    return style_figure(fig)


def wickets_by_date(df_bowling, player_name: str):
    if "player_name" not in df_bowling.columns:
        return _empty_fig("No bowling data")
    data = df_bowling[df_bowling["player_name"] == player_name]
    if data.empty:
        return _empty_fig()
    fig = px.bar(data.sort_values("date"), x="date", y="wickets", title=f"Wickets by date - {player_name}")
    return style_figure(fig)


def economy_by_date(df_bowling, player_name: str):
    if "player_name" not in df_bowling.columns:
        return _empty_fig("No bowling data")
    data = df_bowling[df_bowling["player_name"] == player_name]
    if data.empty:
        return _empty_fig()
    fig = px.line(data.sort_values("date"), x="date", y="economy", title=f"Economy by date - {player_name}")
    return style_figure(fig)


def wickets_vs_opponent(df_bowling, player_name: str):
    if "player_name" not in df_bowling.columns:
        return _empty_fig("No bowling data")
    data = df_bowling[df_bowling["player_name"] == player_name]
    if data.empty:
        return _empty_fig()
    grouped = data.groupby(data["opponent"].fillna("Unknown"))["wickets"].sum().reset_index()
    grouped.columns = ["opponent", "wickets"]
    fig = px.bar(grouped, x="opponent", y="wickets", title=f"Wickets vs opponent - {player_name}")
    return style_figure(fig)


def economy_by_venue(df_bowling, player_name: str):
    if "player_name" not in df_bowling.columns:
        return _empty_fig("No bowling data")
    data = df_bowling[df_bowling["player_name"] == player_name]
    if data.empty:
        return _empty_fig()
    grouped = data.groupby(data["venue"].fillna("Unknown")).agg(
        runs_conceded=("runs_conceded", "sum"),
        balls_bowled=("balls_bowled", "sum"),
    ).reset_index()
    grouped["economy"] = grouped.apply(
        lambda r: (r["runs_conceded"] / (r["balls_bowled"] / 6)) if r["balls_bowled"] else 0, axis=1
    )
    grouped.columns = ["venue", "runs_conceded", "balls_bowled", "economy"]
    fig = px.bar(grouped, x="venue", y="economy", title=f"Economy by place - {player_name}")
    return style_figure(fig)


def runs_vs_opponent(df_batting, player_name: str):
    if "player_name" not in df_batting.columns:
        return _empty_fig("No batting data")
    data = df_batting[df_batting["player_name"] == player_name]
    if data.empty:
        return _empty_fig()
    grouped = data.groupby("opponent")["runs"].sum().reset_index()
    fig = px.bar(grouped, x="opponent", y="runs", title=f"Runs vs opponent - {player_name}")
    return style_figure(fig)


def how_out_distribution(df_batting, player_name: str):
    if "player_name" not in df_batting.columns:
        return _empty_fig("No batting data")
    data = df_batting[df_batting["player_name"] == player_name]
    if data.empty:
        return _empty_fig()
    grouped = data["how_out"].fillna("Unknown").value_counts().reset_index()
    grouped.columns = ["how_out", "count"]
    fig = px.pie(grouped, names="how_out", values="count", title=f"How out - {player_name}", color_discrete_sequence=SPORTY_COLORS)
    return style_figure(fig)
