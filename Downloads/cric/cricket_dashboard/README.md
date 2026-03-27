# Cricket Statistics Analysis Dashboard

Python/Streamlit MVP that ingests report-style cricket Excel sheets (batting + bowling), cleans them, and provides basic analytics and charts.

## Quick start

```bash
cd cricket_dashboard
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Then open the Streamlit URL shown in the terminal.

## How it works
- Upload one or more Excel files. Sheets are scanned to find the header row containing `SNO.` plus `BATSMAN NAME` or `BOWLER NAME`.
- Also supports season-summary sheets with columns like `PLAYER NAME`, `YEAR`, batting (`RUNS/BALLS/4s/6s`) and bowling (`OVER/RUNS/WICKETS/ECONOMY`) in the same sheet.
- Rows are trimmed to the match-detail columns; summary columns on the right are ignored.
- Player names are forward-filled across match rows; valid rows require a match type and basic stats.
- Columns are normalized to a canonical schema (batting and bowling) with synonyms handled (e.g., `V/S`, `VS`, `VENUE`, `VANUE`).
- Dates are parsed with day-first logic; numeric fields are coerced to numbers; overs convert to balls for bowling and economy is recomputed when missing.

## UI
- **Upload & Preview**: shows cleaned batting/bowling data and row counts.
- **Player Profile**: pick a player, filter by match type/opponent/venue/date, and view KPIs and charts (runs, strike rate, wickets, economy, runs vs opponent, how-out split).
  - For season-summary uploads, competition labels are normalized to `MPL 24`, `MPL 25`, and `JN BHAYA` for one-click per-competition analysis.
- **Compare Players**: multi-player comparison on selectable metrics for batting and bowling.
- **Match/Season**: aggregate view by match key (date + opponent + venue) for quick match totals.

## Project layout
```
cricket_dashboard/
  app.py
  requirements.txt
  src/
    excel_block_parser.py   # header detection + per-match extraction
    summary_sheet_parser.py # season-summary extraction (mixed batting + bowling)
    mapping.py              # column normalization + synonym mapping
    clean_batting.py        # canonical batting schema
    clean_bowling.py        # canonical bowling schema
    metrics.py              # per-player aggregates
    charts.py               # plotly chart helpers
    utils.py                # parsing helpers (dates, overs, numerics)
```

## Notes
- Designed for Python 3.10+.
- Uses `pandas.read_excel(..., header=None)` to tolerate report-style sheets with titles above the header row.
- Economy is recomputed when missing or zero and balls > 0 using runs / (balls/6).
- Overs like `9.4` become 58 balls; blanks become 0.
