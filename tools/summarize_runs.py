"""Summarize Project Intermesh player run logs.

Reads one or more JSON exports produced by the in-browser analytics layer
(`analytics.js` -> "Download Log" button or POST endpoint) and prints /
writes a markdown report in the same shape as
`reports/monte_carlo_report.md`, so real player data and simulator output
can be compared side-by-side.

Input shapes accepted:

1. The bundled export from the Download Log button:

       {
         "schema": 1,
         "exported_at": "...",
         "cohort": "open",
         "run_count": 7,
         "runs": [ { ...run record... }, ... ]
       }

2. A list of run records: ``[ { ...run record... }, ... ]``.

3. A single run record (one game). We'll wrap it into a one-element list.

A run record follows ``analytics.js`` exactly::

    {
      "schema": 1,
      "run_id": "...",
      "cohort": "...",
      "started_at": "...",
      "ended_at": "...",
      "events": [ { "type": "run_started" | "workbench_committed" | ... } ],
      "summary": { "ending": "A", "coverage": 37, ... }
    }
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean
from typing import Any, Iterable

ENDING_LETTERS = ["A", "B", "C", "D"]


def _iter_json_files(paths: Iterable[Path]) -> list[Path]:
    files: list[Path] = []
    for p in paths:
        if p.is_dir():
            files.extend(sorted(p.glob("*.json")))
        elif p.is_file():
            files.append(p)
    return files


def _extract_runs(payload: Any) -> list[dict]:
    if isinstance(payload, dict) and "runs" in payload and isinstance(payload["runs"], list):
        return [r for r in payload["runs"] if isinstance(r, dict)]
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict) and "events" in payload:
        return [payload]
    return []


def load_runs(paths: Iterable[Path]) -> list[dict]:
    runs: list[dict] = []
    for file_path in _iter_json_files(paths):
        try:
            payload = json.loads(file_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as err:
            print(f"[WARN] Skipping {file_path}: {err}")
            continue
        runs.extend(_extract_runs(payload))
    return runs


def _event(run: dict, event_type: str) -> dict | None:
    for evt in run.get("events", []):
        if evt.get("type") == event_type:
            return evt
    return None


def _events(run: dict, event_type: str) -> list[dict]:
    return [evt for evt in run.get("events", []) if evt.get("type") == event_type]


def _only_completed(runs: list[dict]) -> list[dict]:
    return [r for r in runs if r.get("summary") and r["summary"].get("ending") in ENDING_LETTERS]


def summarize(runs: list[dict]) -> dict:
    completed = _only_completed(runs)
    total = len(runs)
    finished = len(completed)

    ending_counts = Counter(r["summary"]["ending"] for r in completed)
    ending_rates = {letter: ending_counts.get(letter, 0) / finished for letter in ENDING_LETTERS} if finished else {letter: 0.0 for letter in ENDING_LETTERS}

    def avg(field: str) -> float:
        values = [r["summary"].get(field) for r in completed if isinstance(r["summary"].get(field), (int, float))]
        return mean(values) if values else 0.0

    hardware_counter: Counter[str] = Counter()
    band_counter: Counter[str] = Counter()
    preset_counter: Counter[str] = Counter()
    firmware_counter: Counter[str] = Counter()
    security_counter: Counter[str] = Counter()
    add_on_counter: Counter[str] = Counter()
    nodes_purchased_values: list[int] = []

    for r in completed:
        wb = _event(r, "workbench_committed") or {}
        if wb.get("hardware"):
            hardware_counter[wb["hardware"]] += 1
        if wb.get("frequency"):
            band_counter[wb["frequency"]] += 1
        if wb.get("preset"):
            preset_counter[wb["preset"]] += 1
        if wb.get("firmware"):
            firmware_counter[wb["firmware"]] += 1
        if wb.get("security"):
            security_counter[wb["security"]] += 1
        if wb.get("add_on"):
            add_on_counter[wb["add_on"]] += 1
        if isinstance(wb.get("nodes_purchased"), int):
            nodes_purchased_values.append(wb["nodes_purchased"])

    location_outcomes: dict[str, Counter] = defaultdict(Counter)
    travel_walks: Counter[str] = Counter()
    for r in completed:
        for evt in _events(r, "location_resolved"):
            loc = evt.get("location", "unknown")
            location_outcomes[loc][evt.get("outcome", "unknown")] += 1
            if evt.get("travel_hours_delta") and evt.get("travel_hours_delta") > 0:
                travel_walks[loc] += 1

    diag_events = [evt for r in completed for evt in _events(r, "diagnostic_triggered")]
    diag_total = len(diag_events)
    diag_issue = sum(1 for evt in diag_events if evt.get("issues"))
    diag_patched = sum(1 for evt in diag_events if evt.get("patched"))

    return {
        "total_runs": total,
        "finished_runs": finished,
        "ending_counts": dict(ending_counts),
        "ending_rates": ending_rates,
        "avg_coverage": avg("coverage"),
        "avg_budget_left": avg("budget_left"),
        "avg_hours_left": avg("hours_left"),
        "avg_supplies": avg("supplies"),
        "avg_nodes_used": avg("nodes_used"),
        "avg_nodes_purchased": mean(nodes_purchased_values) if nodes_purchased_values else 0.0,
        "hardware": dict(hardware_counter),
        "band": dict(band_counter),
        "preset": dict(preset_counter),
        "firmware": dict(firmware_counter),
        "security": dict(security_counter),
        "add_ons": dict(add_on_counter),
        "location_outcomes": {loc: dict(counter) for loc, counter in location_outcomes.items()},
        "travel_walks": dict(travel_walks),
        "diagnostics": {
            "events": diag_total,
            "with_issue": diag_issue,
            "patched": diag_patched,
        },
    }


def _top_n(counter: dict, total: int, n: int = 3) -> str:
    if not counter or not total:
        return "n/a"
    items = sorted(counter.items(), key=lambda kv: kv[1], reverse=True)[:n]
    return ", ".join(f"{label} {count / total:.1%}" for label, count in items)


def render_markdown(summary: dict) -> str:
    lines: list[str] = []
    lines.append("# Project Intermesh Player Run Report")
    lines.append("")
    lines.append(f"- Total runs seen: **{summary['total_runs']}**")
    lines.append(f"- Completed runs: **{summary['finished_runs']}**")
    lines.append("")
    lines.append("## Endings")
    lines.append("")
    for letter in ENDING_LETTERS:
        rate = summary["ending_rates"].get(letter, 0.0)
        count = summary["ending_counts"].get(letter, 0)
        lines.append(f"- Ending {letter}: **{rate:.1%}** ({count})")
    lines.append("")
    lines.append("## Averages (completed runs)")
    lines.append("")
    lines.append(f"- Avg coverage: **{summary['avg_coverage']:.2f}**")
    lines.append(f"- Avg budget left: **${summary['avg_budget_left']:.2f}**")
    lines.append(f"- Avg hours left: **{summary['avg_hours_left']:.2f}H**")
    lines.append(f"- Avg supplies: **{summary['avg_supplies']:.2f}**")
    lines.append(f"- Avg nodes purchased: **{summary['avg_nodes_purchased']:.2f}**")
    lines.append(f"- Avg nodes used: **{summary['avg_nodes_used']:.2f}**")
    lines.append("")
    lines.append("## Workbench choices")
    lines.append("")
    total = summary["finished_runs"]
    lines.append(f"- Hardware: {_top_n(summary['hardware'], total)}")
    lines.append(f"- Frequency band: {_top_n(summary['band'], total)}")
    lines.append(f"- Preset: {_top_n(summary['preset'], total)}")
    lines.append(f"- Firmware: {_top_n(summary['firmware'], total)}")
    lines.append(f"- Security: {_top_n(summary['security'], total)}")
    lines.append(f"- Add-ons: {_top_n(summary['add_ons'], total)}")
    lines.append("")
    lines.append("## Per-location outcomes")
    lines.append("")
    if summary["location_outcomes"]:
        for loc, counter in sorted(summary["location_outcomes"].items()):
            loc_total = sum(counter.values())
            parts = ", ".join(f"{k}={v}" for k, v in sorted(counter.items(), key=lambda kv: kv[1], reverse=True))
            walks = summary["travel_walks"].get(loc, 0)
            walk_note = f" (walked {walks}x)" if walks else ""
            lines.append(f"- `{loc}` (n={loc_total}): {parts}{walk_note}")
    else:
        lines.append("- No location_resolved events captured.")
    lines.append("")
    lines.append("## Diagnostics")
    lines.append("")
    diag = summary["diagnostics"]
    lines.append(f"- Events: {diag['events']} // with issue: {diag['with_issue']} // patched: {diag['patched']}")
    lines.append("")
    lines.append("## Use with the Monte Carlo report")
    lines.append("")
    lines.append("Compare the ending percentages above to `reports/monte_carlo_report.md`. Large gaps mean the simulator's uniform choice priors do not match how real players play -- feed the observed `hardware`/`band`/`preset`/`firmware` rates back into `tools/simulate_monte_carlo.py` as weighted choices to re-balance.")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize Project Intermesh player run logs.")
    parser.add_argument("inputs", nargs="+", help="One or more JSON files or directories containing run-log exports.")
    parser.add_argument("--report", default="reports/player_runs_report.md", help="Output markdown report path.")
    parser.add_argument("--out-json", default="reports/player_runs_report.json", help="Output JSON summary path.")
    parser.add_argument("--stdout", action="store_true", help="Print the markdown report to stdout in addition to writing it.")
    args = parser.parse_args()

    runs = load_runs(Path(p) for p in args.inputs)
    if not runs:
        print("[FAIL] No runs found in inputs.")
        return 1

    summary = summarize(runs)
    report_md = render_markdown(summary)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_md, encoding="utf-8")

    out_json_path = Path(args.out_json)
    out_json_path.parent.mkdir(parents=True, exist_ok=True)
    out_json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    if args.stdout:
        print(report_md)

    print(f"[OK] Runs loaded: {summary['total_runs']} (completed: {summary['finished_runs']})")
    print(f"[OK] Markdown report: {report_path}")
    print(f"[OK] JSON summary:    {out_json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
