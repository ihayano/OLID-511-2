# OLID-511-2 — Project Mesh: Ridgecrest

**Repository:** [github.com/ihayano/OLID-511-2](https://github.com/ihayano/OLID-511-2)

A single-page, choice-driven survival story game: you are a student building a community decentralized communication network before a storm hits Ridgecrest. Budget, node inventory, travel time, add-ons, and install choices shape coverage, supplies, and which ending you get.

## Play

1. Clone this repo (or download the ZIP).
2. Serve the folder over HTTP (browsers often block some features when opening `index.html` as a file).
3. Open the URL in a modern browser.

### Python

```powershell
cd OLID-511-2
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Features (gameplay)

- **Intro primer** on Meshtastic, LoRa, and why a local mesh matters in outages.
- **Workbench checkout (single screen):** pick hardware, how many nodes (1–6), add-ons (weatherproof case / solar / both / none), paid stable firmware, regional band, mesh preset, and encryption—in one scrollable panel with a **live cart total** and **Confirm build**.
- **Add-on gate:** science-building **roof** and radio **tower** installs require **both** the weatherproof case and solar panel (or those options stay disabled).
- **Node inventory:** nodes are bought up front; deployments consume one node each.
- **Travel:** out-of-town sites can cost **$10** for a ride or **0** cash and **6 hours** to walk; Yoshiko’s Mitsuwa deal can unlock **free rides** for those trips.
- **Time:** tower climb costs hours; hours remaining appear in the sidebar.
- **Six locations** with branching text, diagnostics, storm beat, mutual aid (Lina), and **multiple endings**.
- **Sound:** optional UI bleeps via Web Audio API (toggle in header).

## Features (presentation)

- **Final Fantasy VII–inspired** menu look: VT323 typography, blue gradient panels, light borders, menu-style choice rows.
- **Responsive layout** for smaller screens.
- **Deployment sites** map: one card at a time with **previous / next** arrows.

## Project layout

| Path | Role |
|------|------|
| `index.html` | Page structure, workbench panel, terminal, sidebar |
| `styles.css` | Visual design and responsive rules |
| `script.js` | Game state, encounters, audio, workbench UI |
| `data/game_constants.json` | Balancing data for Python tools (kept in sync with design intent) |
| `tools/validate_constants.py` | Validates `game_constants.json` |
| `tools/simulate_monte_carlo.py` | Monte Carlo + sweep; writes reports under `reports/` |

## Balancing with Python

Requires Python 3.10+ (uses `dict[str, float]` style hints in the simulator; adjust if you use an older Python).

Validate constants:

```powershell
python tools/validate_constants.py
```

Run Monte Carlo (example: 10,000 runs):

```powershell
python tools/simulate_monte_carlo.py --runs 10000 --seed 42
```

Outputs:

- `reports/monte_carlo_report.md`
- `reports/monte_carlo_report.json`

## License

Add a `LICENSE` file if you want to specify terms (for example MIT). This repo ships without a license until you add one.
