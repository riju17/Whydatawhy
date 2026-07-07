# Cricket Dashboard

Streamlit dashboard for cricket statistics that reads a few common Excel formats, normalizes them into a single schema, and renders player and season-level analysis.

## What It Supports

- Report-style batting and bowling sheets with headers like `BATSMAN NAME` or `BOWLER NAME`
- Season-summary sheets such as the Assam workbook layout with `PLAYER`, `PROFICIENCY`, and `TOURNAMENT`
- Ball-by-ball Excel exports when the report-style header is not present

## Features

- Upload one or more `.xlsx` files
- Preview cleaned batting and bowling tables
- Player profile view with filters for competition, franchise, opponent, venue, and date
- Compare players on batting and bowling metrics
- Match/Season view for match-style data
- Category Priority view for ranking players by category
- Dark cheetah-themed UI with matching charts and controls

## Quick Start

```bash
cd cricket_dashboard
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Then open the local Streamlit URL shown in the terminal.

## How The Import Pipeline Works

- Uploaded files are scanned sheet by sheet.
- The app first tries the season-summary parser.
- If that does not match, it falls back to report-style parsing.
- If that also fails, it tries the ball-by-ball parser.
- Parsed rows are cleaned into canonical batting and bowling columns.
- Dates, overs, balls, wickets, and economy values are normalized where possible.

## UI Tabs

- **Upload & Preview**: raw cleaned batting/bowling previews and row counts
- **Player Profile**: per-player filtered view with tournament summaries and charts
- **Compare Players**: side-by-side batting and bowling comparison
- **Match/Season**: match aggregation for match-style datasets
- **Category Priority**: category-based ranking view

## Project Layout

```text
cricket_dashboard/
  app.py
  README.md
  requirements.txt
  .streamlit/config.toml
  desktop/
    windows/
      launcher.py    # local desktop wrapper around Streamlit
  src/
    ball_by_ball_parser.py    # ball-by-ball workbook parsing
    charts.py                 # Plotly chart styling and helpers
    clean_batting.py          # batting schema cleanup
    clean_bowling.py          # bowling schema cleanup
    excel_block_parser.py     # report-style workbook parsing
    mapping.py                # header normalization and synonyms
    metrics.py                # player summaries and aggregates
    summary_sheet_parser.py   # season-summary parsing
    utils.py                  # dates, overs, numerics, helpers
```

## Theme

- The app uses a dark cheetah theme by default.
- Streamlit theme colors are configured in `.streamlit/config.toml`.
- Plotly figures are styled to match the same palette.

## Notes

- Designed for Python 3.10+.
- Uses `pandas.read_excel(..., header=None)` so report-style sheets with title rows are supported.
- Overs like `9.4` are converted to balls.
- Economy is recomputed when missing and enough bowling data is available.

## Windows Desktop App

The repo includes `desktop/windows/launcher.py`, which starts Streamlit locally and opens it in a desktop window using `pywebview`.

To use it on Windows, install the desktop dependencies from `requirements.txt` plus `pywebview`, then run the launcher directly.
