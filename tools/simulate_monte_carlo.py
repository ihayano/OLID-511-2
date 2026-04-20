import argparse
import json
import random
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from statistics import mean


@dataclass
class RunState:
    budget: int
    coverage: int
    supplies: int
    nodes_available: int
    nodes_purchased: int
    node_cost: int
    link_quality: int
    stable_firmware: bool
    valid_band: bool
    valid_preset: bool
    dead_zones: bool
    valley_weak: bool
    health_weak: bool
    science_roof: bool
    science_missed: bool
    solar_support: bool
    yoshiko_drive: bool
    battery_fragile: bool
    encryption: bool
    hours_remaining: int
    weatherproof_case: bool
    solar_panel: bool


DEPLOY_ORDER_KEYS = ["science", "valley", "sugar", "apartments", "radio", "health"]


def adjusted_coverage(base_value: int, link_quality: int) -> int:
    return max(1, base_value + link_quality)


def choose_affordable_option(rng: random.Random, option_names: list[str], weighted: dict[str, float] | None = None) -> str:
    if weighted:
        weights = [weighted.get(name, 1.0) for name in option_names]
        return rng.choices(option_names, weights=weights, k=1)[0]
    return rng.choice(option_names)


def determine_ending(state: RunState, thresholds: dict) -> str:
    coverage = state.coverage
    low_coverage = coverage < thresholds["coverage_low"]
    supply_shortage = state.supplies < thresholds["minimum_supplies_for_no_shortage"]
    config_failure = (not state.valid_band) or (not state.valid_preset) or (not state.stable_firmware)
    coverage_strong = coverage >= thresholds["coverage_strong"]
    science_ready = state.science_roof and (not state.science_missed)

    if coverage_strong and state.encryption and state.supplies > 0 and (not state.dead_zones) and science_ready:
        return "A"
    if state.encryption and coverage >= thresholds["coverage_good"] and (
        state.dead_zones or (not science_ready) or (not state.valid_band) or (not state.valid_preset)
    ):
        return "B"
    if (not state.encryption) and coverage >= thresholds["coverage_good"]:
        return "C"
    if low_coverage and supply_shortage and (state.battery_fragile or config_failure or (not state.solar_support)):
        return "D"
    return "B"


def _pick(rng: random.Random, options: list[str], override: str | None) -> str:
    if override is not None and override in options:
        return override
    return rng.choice(options)


def simulate_one(constants: dict, rng: random.Random, overrides: dict | None = None) -> dict:
    overrides = overrides or {}
    g = constants["global"]
    wb = constants["workbench"]
    dep = constants["deployments"]
    travel = constants["travel"]
    diag = constants["diagnostics"]
    aid = constants["mutual_aid"]

    state = RunState(
        budget=g["starting_budget"],
        coverage=0,
        supplies=0,
        nodes_available=0,
        nodes_purchased=0,
        node_cost=0,
        link_quality=0,
        stable_firmware=True,
        valid_band=True,
        valid_preset=True,
        dead_zones=False,
        valley_weak=False,
        health_weak=False,
        science_roof=False,
        science_missed=False,
        solar_support=False,
        yoshiko_drive=False,
        battery_fragile=False,
        encryption=False,
        hours_remaining=g["starting_hours"],
        weatherproof_case=False,
        solar_panel=False,
    )

    # Hardware selection
    hardware_key = _pick(rng, list(wb["hardware"].keys()), overrides.get("hardware"))
    hardware_cfg = wb["hardware"][hardware_key]
    state.node_cost = hardware_cfg["node_cost"]
    state.link_quality += hardware_cfg["link_quality_delta"]

    # Node purchase selection
    max_nodes = max(1, min(g["deployable_location_count"], state.budget // state.node_cost))
    display_options = [n for n in wb["node_purchase"]["display_options"] if n <= max_nodes]
    if not display_options:
        display_options = [wb["node_purchase"]["fallback_min_purchase"]]
    purchased = rng.choice(display_options)
    state.nodes_purchased = purchased
    state.nodes_available = purchased
    state.budget -= purchased * state.node_cost

    # Optional add-ons (gate some install options)
    add_ons = wb.get("add_ons", {})
    case_fee = int(add_ons.get("weatherproof_case", {}).get("fee", 40))
    solar_fee = int(add_ons.get("solar_panel", {}).get("fee", 40))
    add_on_override = overrides.get("add_ons")
    if add_on_override == "both" and state.budget >= case_fee + solar_fee:
        state.weatherproof_case = True
        state.solar_panel = True
        state.budget -= case_fee + solar_fee
    elif add_on_override == "case" and state.budget >= case_fee:
        state.weatherproof_case = True
        state.budget -= case_fee
    elif add_on_override == "solar" and state.budget >= solar_fee:
        state.solar_panel = True
        state.budget -= solar_fee
    elif add_on_override == "none":
        pass  # purchase nothing
    else:
        # Heuristic: if you can afford both, 55% chance to buy both; otherwise sometimes buy one.
        if state.budget >= case_fee + solar_fee and rng.random() < 0.55:
            state.weatherproof_case = True
            state.solar_panel = True
            state.budget -= case_fee + solar_fee
        elif state.budget >= case_fee and rng.random() < 0.2:
            state.weatherproof_case = True
            state.budget -= case_fee
        elif state.budget >= solar_fee and rng.random() < 0.2:
            state.solar_panel = True
            state.budget -= solar_fee

    # Firmware
    firmware_options = []
    if state.budget >= wb["firmware"]["stable"]["fee"]:
        firmware_options.append("stable")
    firmware_options.append("alpha")
    firmware_key = _pick(rng, firmware_options, overrides.get("firmware"))
    firmware_cfg = wb["firmware"][firmware_key]
    state.budget -= firmware_cfg["fee"]
    state.stable_firmware = firmware_cfg["stable_firmware"]
    state.battery_fragile = state.battery_fragile or firmware_cfg["battery_fragile"]
    state.link_quality += firmware_cfg["link_quality_delta"]

    # Frequency
    freq_key = _pick(rng, list(wb["frequency_plan"].keys()), overrides.get("frequency_plan"))
    freq_cfg = wb["frequency_plan"][freq_key]
    state.valid_band = freq_cfg["valid_band"]
    state.link_quality += freq_cfg["link_quality_delta"]

    # Preset
    preset_key = _pick(rng, list(wb["preset"].keys()), overrides.get("preset"))
    preset_cfg = wb["preset"][preset_key]
    state.valid_preset = preset_cfg["valid_preset"]
    state.battery_fragile = state.battery_fragile or preset_cfg["battery_fragile"]
    state.link_quality += preset_cfg["link_quality_delta"]

    # Security
    security_key = _pick(rng, list(wb["security"].keys()), overrides.get("security"))
    state.encryption = wb["security"][security_key]["encryption"]

    # Deployments
    pending = DEPLOY_ORDER_KEYS.copy()
    rng.shuffle(pending)
    resolved_count = 0
    while pending:
        if resolved_count > 0 and rng.random() < g["finish_early_probability"]:
            break
        location_key = pending.pop()
        resolved_count += 1

        if location_key in travel["outside_town_locations"] and not state.yoshiko_drive:
            if state.budget >= travel["outside_town_ride_cost"] and rng.random() < 0.5:
                state.budget -= travel["outside_town_ride_cost"]
            else:
                state.hours_remaining = max(0, state.hours_remaining - travel["outside_town_walk_hours"])

        if state.nodes_available <= 0:
            continue

        options_cfg = dep[location_key]["options"]
        affordable = []
        for option_name, option in options_cfg.items():
            add_on = option.get("add_on_cost", 0)
            if add_on <= state.budget:
                affordable.append(option_name)

        # Gate roof/tower installs unless both add-ons purchased.
        if location_key == "science" and ("data" in affordable) and not (state.weatherproof_case and state.solar_panel):
            affordable = [name for name in affordable if name != "data"]
        if location_key == "radio" and ("tower" in affordable) and not (state.weatherproof_case and state.solar_panel):
            affordable = [name for name in affordable if name != "tower"]
        if "skip" not in affordable:
            affordable.append("skip")

        if location_key == "science":
            option = choose_affordable_option(
                rng,
                affordable,
                weighted={"data": 3.0, "emotion": 1.0, "jargon": 1.0, "skip": 1.0},
            )
        elif location_key in {"valley", "health"}:
            option = choose_affordable_option(
                rng,
                affordable,
                weighted={"highgain": 2.0, "solar": 2.0, "basic": 1.0, "skip": 1.0},
            )
        elif location_key == "radio":
            option = choose_affordable_option(rng, affordable, weighted={"tower": 2.0, "lobby": 2.0, "skip": 1.0})
        else:
            option = choose_affordable_option(rng, affordable, weighted={"deploy": 3.0, "skip": 1.0})

        selected = options_cfg[option]
        if option == "skip":
            if location_key == "science":
                state.science_missed = True
            continue

        if selected.get("uses_node", False):
            state.nodes_available = max(0, state.nodes_available - 1)
        state.budget -= selected.get("add_on_cost", 0)
        state.supplies += selected.get("supplies_delta", 0)
        state.hours_remaining = max(0, state.hours_remaining - selected.get("time_cost_hours", 0))

        if "coverage_base" in selected:
            state.coverage += adjusted_coverage(selected["coverage_base"], state.link_quality)
            state.coverage = max(0, state.coverage)

        state.science_roof = selected.get("science_roof", state.science_roof)
        state.solar_support = selected.get("solar_support", state.solar_support)
        state.yoshiko_drive = selected.get("yoshiko_drive", state.yoshiko_drive)

        if selected.get("dead_zone", False):
            state.dead_zones = True
        state.valley_weak = selected.get("valley_weak", state.valley_weak)
        state.health_weak = selected.get("health_weak", state.health_weak)

    # Diagnostics
    issues_present = state.valley_weak or state.health_weak
    if issues_present:
        state.dead_zones = True
        if state.budget >= diag["emergency_patch_cost"] and rng.random() < 0.6:
            state.budget -= diag["emergency_patch_cost"]
            state.dead_zones = False
            state.valley_weak = False
            state.health_weak = False
            state.coverage += adjusted_coverage(diag["emergency_patch_coverage_base"], state.link_quality)

    # Mutual aid
    if rng.random() < 0.7:
        state.supplies += aid["grant_supplies_delta"]

    ending = determine_ending(state, constants["ending_thresholds"])
    return {
        "ending": ending,
        "budget": state.budget,
        "hours": state.hours_remaining,
        "coverage": state.coverage,
        "supplies": state.supplies,
        "nodes_used": state.nodes_purchased - state.nodes_available,
    }


def run_simulation(constants: dict, runs: int, seed: int, overrides: dict | None = None) -> dict:
    rng = random.Random(seed)
    outcomes = [simulate_one(constants, rng, overrides) for _ in range(runs)]
    endings = Counter(o["ending"] for o in outcomes)

    return {
        "runs": runs,
        "endings": dict(endings),
        "ending_rates": {k: endings.get(k, 0) / runs for k in ["A", "B", "C", "D"]},
        "avg_budget": mean(o["budget"] for o in outcomes),
        "avg_hours": mean(o["hours"] for o in outcomes),
        "avg_coverage": mean(o["coverage"] for o in outcomes),
        "avg_supplies": mean(o["supplies"] for o in outcomes),
        "avg_nodes_used": mean(o["nodes_used"] for o in outcomes),
    }


def stratified_sweep(constants: dict, runs_per_stratum: int, seed: int) -> dict:
    """For each stratifiable workbench variable, force one value at a time
    while randomizing the rest of the choices. Returns a nested dict keyed by
    variable name then value, with the same shape as run_simulation's output.
    """
    wb = constants["workbench"]
    strata_values: dict[str, list[str]] = {
        "hardware": list(wb["hardware"].keys()),
        "firmware": ["stable", "alpha"],
        "frequency_plan": list(wb["frequency_plan"].keys()),
        "preset": list(wb["preset"].keys()),
        "security": list(wb["security"].keys()),
        "add_ons": ["none", "case", "solar", "both"],
    }

    results: dict[str, dict[str, dict]] = {}
    salt = 0
    for variable, values in strata_values.items():
        results[variable] = {}
        for value in values:
            overrides = {variable: value}
            sub_seed = seed + 1_000 * (salt + 1)
            results[variable][value] = run_simulation(
                constants, runs=runs_per_stratum, seed=sub_seed, overrides=overrides
            )
            salt += 1

    return {
        "runs_per_stratum": runs_per_stratum,
        "variables": results,
    }


def sweep_tuning(constants: dict, seed: int) -> list[dict]:
    candidates = []
    base_budget = constants["global"]["starting_budget"]
    base_hours = constants["global"]["starting_hours"]
    base_fiona = constants["deployments"]["apartments"]["options"]["deploy"]["supplies_delta"]

    for budget in [280, 300, 320, 340]:
        for hours in [60, 72, 84]:
            for fiona_bonus in [1, 2, 3]:
                cfg = json.loads(json.dumps(constants))
                cfg["global"]["starting_budget"] = budget
                cfg["global"]["starting_hours"] = hours
                cfg["deployments"]["apartments"]["options"]["deploy"]["supplies_delta"] = fiona_bonus

                result = run_simulation(cfg, runs=2000, seed=seed + budget + hours + fiona_bonus)
                rates = result["ending_rates"]
                # Favor strong ending A and penalize failure ending D.
                score = (rates["A"] * 3.0) + (rates["B"] * 1.0) - (rates["D"] * 4.0)
                candidates.append(
                    {
                        "budget": budget,
                        "hours": hours,
                        "fiona_supplies": fiona_bonus,
                        "score": score,
                        "a_rate": rates["A"],
                        "b_rate": rates["B"],
                        "c_rate": rates["C"],
                        "d_rate": rates["D"],
                        "avg_budget": result["avg_budget"],
                        "avg_hours": result["avg_hours"],
                        "avg_supplies": result["avg_supplies"],
                        "is_current_config": budget == base_budget and hours == base_hours and fiona_bonus == base_fiona,
                    }
                )

    return sorted(candidates, key=lambda x: x["score"], reverse=True)


def _format_strata_section(strata: dict | None) -> list[str]:
    if not strata:
        return []
    lines: list[str] = []
    lines.append("## Stratified sweep")
    lines.append("")
    lines.append(
        f"Each row forces one workbench decision to a specific value and randomizes the rest. "
        f"{strata['runs_per_stratum']} runs per stratum."
    )
    lines.append("")
    for variable, values in strata["variables"].items():
        lines.append(f"### {variable}")
        lines.append("")
        lines.append("| value | A | B | C | D | avg coverage | avg budget | avg supplies |")
        lines.append("|-------|---|---|---|---|--------------|------------|--------------|")
        for value, result in values.items():
            rates = result["ending_rates"]
            lines.append(
                f"| `{value}` | {rates['A']:.1%} | {rates['B']:.1%} | {rates['C']:.1%} | {rates['D']:.1%} | "
                f"{result['avg_coverage']:.2f} | ${result['avg_budget']:.0f} | {result['avg_supplies']:.2f} |"
            )
        lines.append("")
    return lines


def write_report(
    report_path: Path,
    baseline: dict,
    sweep_results: list[dict],
    runs: int,
    seed: int,
    strata: dict | None = None,
) -> None:
    top = sweep_results[:5]
    current = next((r for r in sweep_results if r["is_current_config"]), None)

    lines = []
    lines.append("# Project Intermesh Monte Carlo Report")
    lines.append("")
    lines.append(f"- Runs: **{runs}**")
    lines.append(f"- Seed: **{seed}**")
    lines.append("")
    lines.append("## Baseline (current constants)")
    lines.append("")
    rates = baseline["ending_rates"]
    lines.append(f"- Ending A: **{rates['A']:.1%}**")
    lines.append(f"- Ending B: **{rates['B']:.1%}**")
    lines.append(f"- Ending C: **{rates['C']:.1%}**")
    lines.append(f"- Ending D: **{rates['D']:.1%}**")
    lines.append(f"- Avg coverage: **{baseline['avg_coverage']:.2f}**")
    lines.append(f"- Avg budget left: **${baseline['avg_budget']:.2f}**")
    lines.append(f"- Avg hours left: **{baseline['avg_hours']:.2f}H**")
    lines.append(f"- Avg supplies: **{baseline['avg_supplies']:.2f}**")
    lines.append("")
    lines.append("## Top tuning candidates (grid search)")
    lines.append("")
    for idx, item in enumerate(top, start=1):
        lines.append(
            f"{idx}. budget=${item['budget']}, hours={item['hours']}, fiona_supplies={item['fiona_supplies']} "
            f"| score={item['score']:.3f} | A={item['a_rate']:.1%}, B={item['b_rate']:.1%}, C={item['c_rate']:.1%}, D={item['d_rate']:.1%}"
        )
    lines.append("")
    lines.append("## Objective recommendation")
    lines.append("")
    best = top[0]
    lines.append(
        f"- Recommended constants: `starting_budget={best['budget']}`, `starting_hours={best['hours']}`, "
        f"`apartments.deploy.supplies_delta={best['fiona_supplies']}`."
    )
    if current:
        lines.append(
            f"- Current config score: **{current['score']:.3f}**; recommended score: **{best['score']:.3f}** "
            f"({best['score'] - current['score']:+.3f})."
        )
    lines.append("- Keep this recommendation as a balancing target, then re-run the simulation after each gameplay adjustment.")
    lines.append("")

    lines.extend(_format_strata_section(strata))

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Monte Carlo simulator for Project Intermesh balancing.")
    parser.add_argument("--config", default="data/game_constants.json", help="Path to constants JSON")
    parser.add_argument("--runs", type=int, default=10000, help="Number of Monte Carlo runs")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--report", default="reports/monte_carlo_report.md", help="Output markdown report path")
    parser.add_argument("--out-json", default="reports/monte_carlo_report.json", help="Output JSON report path")
    parser.add_argument(
        "--strata-runs",
        type=int,
        default=2000,
        help="Runs per stratum for the stratified sweep (one decision forced, others random).",
    )
    parser.add_argument(
        "--no-strata",
        action="store_true",
        help="Skip the stratified sweep (baseline + tuning grid only).",
    )
    args = parser.parse_args()

    constants = json.loads(Path(args.config).read_text(encoding="utf-8"))
    baseline = run_simulation(constants, runs=args.runs, seed=args.seed)
    sweep_results = sweep_tuning(constants, seed=args.seed)

    strata = None
    if not args.no_strata:
        strata = stratified_sweep(constants, runs_per_stratum=args.strata_runs, seed=args.seed)

    report_path = Path(args.report)
    write_report(report_path, baseline, sweep_results, args.runs, args.seed, strata=strata)

    out = {
        "baseline": baseline,
        "top_tuning_candidates": sweep_results[:10],
    }
    if strata is not None:
        out["strata"] = strata
    out_json_path = Path(args.out_json)
    out_json_path.parent.mkdir(parents=True, exist_ok=True)
    out_json_path.write_text(json.dumps(out, indent=2), encoding="utf-8")

    print(f"[OK] Baseline simulation complete: {args.runs} runs")
    if strata is not None:
        total_strata = sum(len(values) for values in strata["variables"].values())
        print(
            f"[OK] Stratified sweep complete: {total_strata} strata x {args.strata_runs} runs each "
            f"({total_strata * args.strata_runs} total)"
        )
    print(f"[OK] Report written: {report_path}")
    print(f"[OK] JSON written: {out_json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
