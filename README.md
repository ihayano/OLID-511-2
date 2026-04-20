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
- **Single-screen workbench checkout:** pick hardware (Heltec V3 / RAK WisBlock), how many nodes to buy (1–6), add-ons (weatherproof case, solar panel, both, or none), firmware (paid stable vs. free alpha), regional band, mesh preset, and encryption — all in one scrollable panel with a **live cart total** and a **Commit Resources** confirm button.
- **Add-on gate:** the science-building **roof** install and the radio **tower** install both require the weatherproof case *and* the solar panel; without both, those options stay disabled.
- **Node inventory:** nodes are bought up front; each deployment consumes one node.
- **Travel costs:** out-of-town sites (Valley West, Women's Health Clinic) cost **$10 for a ride** or **6 hours walking**.
- **Time pressure:** the radio tower climb costs extra hours; the sidebar shows **hours remaining** at all times.
- **Branching choices** at each location produce diagnostics, mutual-aid beats, and **multiple endings** (A / B / C / D) driven by coverage, encryption, supplies, dead zones, and configuration validity.

## Presentation

- **Retro DOS terminal** aesthetic: boot-up splash (`PROJECT INTERMESH DOS TERMINAL v1.0`), VT323 typography, scanline overlay, CRT-style panels.
- **Two screen themes** toggled from the top bar: **GREEN** (default) and **AMBER**; the choice persists across runs via `localStorage`.
- **Keyboard hotkeys:** every choice row is labeled A / B / C / … and can be triggered from the keyboard.
- **Deployment sidebar:** one location card visible at a time with previous / next arrows, plus a live ledger of deployed nodes.
- **Responsive layout** that collapses cleanly on narrower screens.

## Project layout

| Path | Role |
|------|------|
| `index.html` | Page structure: boot screen, top bar, status strip, terminal feed, workbench panel, deployment sidebar. |
| `styles.css` | CRT / terminal theming, green and amber palettes, scanlines, responsive rules. |
| `script.js` | All game state, encounter text, workbench UI, hotkeys, theme toggle, and ending logic. |
| `css/`, `js/` | Vendored Bootstrap 5 (grid + bundle, minified + source maps). |
| `rqYZNP-800.jpg` | Background / art asset. |
| `data/game_constants.json` | Balancing data for the Python tools; kept in sync with the design intent of `script.js`. |
| `tools/validate_constants.py` | Sanity-checks `game_constants.json` (required keys, non-negative costs, deployment coverage, ending thresholds, etc.). |
| `tools/simulate_monte_carlo.py` | Monte Carlo simulator plus a small grid sweep; writes reports under `reports/`. |
| `reports/monte_carlo_report.md` / `.json` | Latest simulation output: baseline ending mix and top tuning candidates. |

## Starting values

These defaults live in `data/game_constants.json` and are mirrored in `script.js`:

- Starting budget: **$340**
- Starting hours: **84**
- Deployable locations: **6**
- Valid band: **US915**; all other bands degrade link quality.
- Valid preset: **LongFast**; Balanced and Turbo degrade link quality and/or battery.
- Coverage thresholds for endings: low = 20, good = 22, strong = 35.

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

Outputs:

- `reports/monte_carlo_report.md`
- `reports/monte_carlo_report.json`

Each run also performs a small grid search over starting budget, starting hours, and the apartments supplies bonus, scoring each combination to favor strong endings and penalize failure endings. Use the report as a balancing target — tweak one lever in `game_constants.json`, re-validate, re-simulate.

## License

Add a `LICENSE` file if you want to specify terms (for example MIT). This repo ships without a license until you add one.
