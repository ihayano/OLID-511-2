# Ian Hayano OLID-511 — Project Intermesh

**Repository:** https://github.com/ihayano/OLID-511

A single-page, choice-driven survival story in which a student racing a major storm builds a decentralized community mesh network with Meshtastic nodes. Budget, node inventory, travel time, add-ons, and install choices shape coverage, supplies, and which ending you get.

## Play

1. Clone this repo (or download the ZIP).
2. Serve the folder over HTTP. Opening `index.html` directly from disk will break `localStorage`, font loading, and the Bootstrap assets.
3. Open the served URL in a modern browser (Chrome, Edge, Firefox, Safari).

### Python one-liner

```powershell
cd OLID-511-2
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Gameplay at a glance

- **Six named locations:** Campus Science Building, Valley West, International Grocery, Tesseract Apartments, Radio Station, and the Women's Health Clinic. Each has its own contact (Dr. Ansari, Luz & Diego, Yoshiko, Dalia, Geo, Yasmin) and its own diagnostic branch.
- **Intro primer** on Meshtastic, LoRa, and why a local mesh matters in outages.
- **Single-screen workbench checkout:** pick mesh radio hardware (Heltec V3 / LilyGO T-Beam / RAK WisBlock), how many nodes to buy (1–6), up to **2 weatherproof cases** ($40 each), up to **2 solar panels** ($40 each), an optional **portable cat carrier** ($50), and firmware (paid stable vs. free alpha) — all in one scrollable panel with a **live cart total** and a **Commit Resources** confirm button.
- **Outdoor-install gate:** the science-building **roof** install and the radio **tower** install each consume **1 weatherproof case + 1 solar panel** on deployment. You need all four (2 cases + 2 solar panels) in inventory to enable both sites; a 1+1 loadout forces you to pick one of the two.
- **Node inventory:** nodes are bought up front; each deployment consumes one node.
- **Travel costs:** out-of-town sites (Valley West, Women's Health Clinic) cost **$10 for a ride** or **6 hours walking**.
- **Time pressure:** the radio tower climb costs extra hours; the sidebar shows **hours remaining** at all times.
- **Branching choices** at each location produce diagnostics, mutual-aid beats, and **multiple endings** (A / B / C / D) driven by coverage, encryption, supplies, dead zones, and configuration validity.

## Presentation

- **Retro DOS terminal** aesthetic: boot-up splash (`PROJECT INTERMESH DOS TERMINAL v1.0`), VT323 typography, scanline overlay, CRT-style panels.
- **Two screen themes** toggled from the top bar: **GREEN** (default) and **AMBER**; the choice persists across runs via `localStorage`.
- **Deployment sidebar:** one location card visible at a time with previous / next arrows, plus a live ledger of deployed nodes.
- **Responsive layout** that collapses cleanly on narrower screens.

## Project layout

| Path | Role |
|------|------|
| `index.html` | Page structure: boot screen, top bar, status strip, terminal feed, workbench panel, deployment sidebar. |
| `styles.css` | CRT / terminal theming, green and amber palettes, scanlines, responsive rules. |
| `script.js` | All game state, workbench UI, theme toggle, and ending logic. All player-facing prose is read from `content/strings.json` via `t("key")` lookups. |
| `strings.js` | Tiny loader that fetches `content/strings.json`, exposes `window.GameStrings` with `t(key, vars)` + `format(template, vars)`, and populates static HTML labels tagged with `data-string="key"`. |
| `content/strings.json` | Every player-visible string: boot lines, status chip labels, workbench rows, six location handlers, diagnostics, mutual aid, and all four endings. Edit this file to retune narration, labels, or dialogue without touching code. |
| `analytics.js` | Lightweight run-log analytics: buffers structured events (run started, workbench committed, location resolved, diagnostic, run ended) in `localStorage`, exposes `window.IntermeshAnalytics`, and optionally POSTs to `INTERMESH_ANALYTICS_ENDPOINT` via `navigator.sendBeacon`. |
| `css/`, `js/` | Vendored Bootstrap 5 (grid + bundle, minified + source maps). |
| `rqYZNP-800.jpg` | Background / art asset. |
| `data/game_constants.json` | Balancing data for the Python tools; kept in sync with the design intent of `script.js`. |
| `tools/validate_constants.py` | Sanity-checks `game_constants.json` (required keys, non-negative costs, deployment coverage, ending thresholds, etc.). |
| `tools/validate_strings.js` | Checks that every `t("...")` key in `script.js` exists in `content/strings.json` and flags any suspicious hardcoded narration literals in the helper functions. |
| `tools/simulate_monte_carlo.py` | Monte Carlo simulator with a grid-search tuning sweep and a stratified sweep (one workbench decision forced at a time); writes reports under `reports/`. |
| `tools/summarize_runs.py` | Aggregates exported player run logs (the JSON produced by the Download Log button or an analytics endpoint) into a markdown + JSON report that mirrors the Monte Carlo report format. |
| `reports/monte_carlo_report.md` / `.json` | Latest simulation output: baseline ending mix and top tuning candidates. |

## Starting values

These defaults live in `data/game_constants.json` and are mirrored in `script.js`:

- Starting budget: **$340**
- Starting hours: **84**
- Deployable locations: **6**
- Hardware prices per node: Heltec V3 $30, LilyGO T-Beam $40, RAK WisBlock $50 (+1 link quality).
- Add-on unit prices: weatherproof case $40, solar panel $40, portable cat carrier $50.
- Firmware: stable $10, alpha free (sets `batteryFragile` and drops link quality).
- Coverage thresholds for endings: low = 20, good = 22, strong = 35.

Note: the current build implicitly assumes a valid US915 band, LongFast preset, and AES-256 encryption — those are no longer player-facing choices, but the state flags are preserved so the Monte Carlo simulator still exercises them.

## Balancing with Python

Requires **Python 3.10+** (the simulator uses `dict[str, float]` style hints).

Validate constants:

```powershell
python tools/validate_constants.py
```

Run a Monte Carlo sweep (example: 10,000 runs):

```powershell
python tools/simulate_monte_carlo.py --runs 10000 --seed 42
```

By default the simulator also runs a **stratified sweep**: for each workbench decision (hardware, firmware, frequency plan, preset, security, add-ons) it forces each value in turn and runs another 2,000 sims per value with the remaining choices still randomized. The per-stratum ending rates and averages are appended to the markdown report and the JSON output under a `strata` key, making the marginal impact of each decision easy to inspect.

```powershell
# Smaller / faster run, or turn strata off entirely
python tools/simulate_monte_carlo.py --runs 2000 --strata-runs 500
python tools/simulate_monte_carlo.py --runs 10000 --no-strata
```

Outputs:

- `reports/monte_carlo_report.md`
- `reports/monte_carlo_report.json`

Each run also performs a small grid search over starting budget, starting hours, and the apartments supplies bonus, scoring each combination to favor strong endings and penalize failure endings. Use the report as a balancing target — tweak one lever in `game_constants.json`, re-validate, re-simulate.

## Editing game text

Every player-facing string in the game — narration, prompts, choice copy, status chip labels, workbench row titles, diagnostics, mutual-aid beats, endings — lives in a single file:

```
content/strings.json
```

Open it in any text editor and change the prose. The game code does not need to be touched.

### How it works

- `index.html` loads `strings.js` before `script.js`.
- On boot, `strings.js` fetches `content/strings.json`, stores it on `window.GameStrings`, and calls `applyStaticStrings()` to populate every HTML element tagged with `data-string="some.key"`.
- `script.js` calls `t("some.key")` (or `t("some.key", { name: "Yoshiko" })` for interpolation) everywhere it needs to show text.
- Placeholders use `{name}` style tokens inside the JSON values, substituted at runtime.

### Examples

Plain string:

```json
"mutual_aid": {
  "grant_line": "Mina sends her message and returns with a bottle of wine (+1 supplies). Mutual aid becomes more than a slogan."
}
```

String with placeholders — any `{name}` token is filled in by the calling code:

```json
"intro": {
  "post_name": [
    "{name} ready. Project Intermesh setup logged.",
    "Main objective: deploy enough resilient Meshtastic nodes to keep people talking after the grid falls."
  ]
}
```

Multi-line blocks are JSON arrays; each entry becomes one line in the terminal feed. The available placeholders for each string are whatever the call site passes in — see `script.js` for the exact bindings (for example `build_locked` expects `{hardware}`, `{nodes}`, `{s}` for pluralization).

### Validate after editing

Run the validator to confirm every `t("...")` call in `script.js` still resolves and no stray hardcoded narration crept in:

```powershell
node tools/validate_strings.js
```

It will exit non-zero and print the offending line numbers if anything is missing.

### Serving the JSON

The loader uses `fetch("content/strings.json")`, which does **not** work over `file://`. Serve the folder over HTTP (`python -m http.server 8000`) while developing; if the strings file fails to load the page will show a visible error with the same instruction.

## Player analytics (zero-backend)

`analytics.js` captures a structured log of every run directly in the browser. Nothing leaves the machine by default.

- **Stored events per run:** `run_started`, `workbench_committed` (hardware, node count, weatherproof case count, solar panel count, cat-carrier flag, firmware, cart total, budget after), `location_resolved` (one per deployment site), `diagnostic_triggered`, `mutual_aid_resolved`, `run_ended` (coverage, budget, supplies, hours, ending letter, and every workbench selection).
- **Persistence:** the last 50 runs are kept in `localStorage` under `project-intermesh-runs`.
- **Download Log** button in the top bar exports all buffered runs as a single JSON file (`intermesh-runs-<timestamp>.json`). Ideal for class submissions.
- **Optional cohort tag** via `?cohort=spring26` in the URL, or `window.INTERMESH_COHORT = "..."` before `analytics.js` loads.
- **Optional endpoint:** set `window.INTERMESH_ANALYTICS_ENDPOINT = "https://..."` before `analytics.js` loads and every finished run (plus in-progress runs on page unload) will be POSTed via `navigator.sendBeacon`.

### Summarize player runs with Python

Point `tools/summarize_runs.py` at one or more exported JSON files (or a directory of them):

```powershell
python tools/summarize_runs.py path/to/intermesh-runs-*.json
```

Outputs:

- `reports/player_runs_report.md`
- `reports/player_runs_report.json`

The markdown report uses the same layout as the Monte Carlo report (ending rates, averages, workbench choice frequencies, per-location outcomes, diagnostics), so simulated and real results are easy to diff. Persistent gaps between the two are a signal to re-weight the choice priors in `tools/simulate_monte_carlo.py`.

## License

Add a `LICENSE` file if you want to specify terms (for example MIT). This repo ships without a license until you add one.
