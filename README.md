# Project Mesh: Ridgecrest

A single-page, text-based Meshtastic survival simulator built from the supplied master game design document.

## Included features

- Retro CRT terminal presentation with scanlines and subtle flicker
- Typewriter-style narrative feed
- Live tracking for budget, coverage, encryption, supplies, and deployed nodes
- Six Ridgecrest deployment encounters with branching outcomes
- Diagnostics, storm event, mutual aid event, and multiple end states
- Lightweight synthesized UI audio via the Web Audio API

## Run locally

This project is a static web app, so any simple HTTP server will work.

### Python

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Project files

- `index.html` - terminal layout and UI shell
- `styles.css` - CRT styling, layout, and responsive behavior
- `script.js` - game state, branching logic, and audio cues