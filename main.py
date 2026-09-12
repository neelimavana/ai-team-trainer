"""AI Team Trainer — single-command entry point (Phase 8).

Usage::

    uv run python main.py --config config.yaml

Drives the whole pipeline from one config file (PRD FR7/FR10):

    config -> env task selection -> sequential training (per mitigation
    method, per seed) -> forgetting measurement -> scores.csv +
    forgetting_report.png

No other intervention or code edit is required between runs — only
``config.yaml`` changes.
"""

from __future__ import annotations

import argparse
import os
import sys
import time

import numpy as np

from config import ExperimentConfig, load_config
from env import TASK_CONFIGS, set_global_seed
from memory import METHODS, ConditionResult, run_condition, validate_method
from report import flatten_results, plot_forgetting_report, save_scores_csv


def run_experiment(cfg: ExperimentConfig) -> list[ConditionResult]:
    """Execute the config-driven experiment and return every condition result.

    Iterates over seeds (outer) then methods (inner) so that the same seed
    stream is reused across conditions — each (seed, method) is one row of
    ``ConditionResult``. ``memory_method: all`` sweeps all four PRD modes.
    """
    task_cfgs = [TASK_CONFIGS[spec.env] for spec in cfg.tasks]
    if len(task_cfgs) != 2:
        raise ValueError(
            "This release supports exactly 2 sequential tasks "
            "(3-task chaining is flagged as future work)."
        )
    task1, task2 = task_cfgs
    timesteps1, timesteps2 = cfg.tasks[0].timesteps, cfg.tasks[1].timesteps

    methods = list(METHODS) if cfg.memory_method == "all" else [cfg.memory_method]
    for m in methods:
        validate_method(m)

    results: list[ConditionResult] = []
    for seed in cfg.seeds:
        set_global_seed(seed)
        for method in methods:
            results.append(
                run_condition(
                    method,
                    task1,
                    task2,
                    timesteps=timesteps1,
                    timesteps_task2=timesteps2,
                    seed=seed,
                    rounds=cfg.rounds,
                    replay_budget_per_burst=cfg.replay_budget_per_burst,
                )
            )
    return results


def _summarise(results: list[ConditionResult]) -> None:
    """Human-readable mean +/- std summary grouped by method."""
    print("\n" + "=" * 62)
    print("Summary (mean +/- std across seeds)")
    print("=" * 62)
    print(f"{'method':<18}{'score_before':>16}{'score_after':>16}"
          f"{'score_task2':>14}{'forgetting':>14}")
    by_method: dict[str, list[ConditionResult]] = {}
    for res in results:
        by_method.setdefault(res.method, []).append(res)
    for method in METHODS:
        group = by_method.get(method)
        if not group:
            continue
        before = np.mean([r.score_before for r in group])
        after = np.mean([r.score_after for r in group])
        task2 = np.mean([r.score_task2 for r in group])
        forget = np.mean([r.forgetting for r in group])
        std = np.std([r.forgetting for r in group])
        if len(group) > 1:
            print(f"{method:<18}{before:>14.4f}+/-{np.std([r.score_before for r in group]):>5.4f}"
                  f"{after:>14.4f}+/-{np.std([r.score_after for r in group]):>5.4f}"
                  f"{task2:>12.4f}{forget:>12.4f}+/-{std:.4f}")
        else:
            print(f"{method:<18}{before:>16.4f}{after:>16.4f}"
                  f"{task2:>14.4f}{forget:>14.4f}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="AI Team Trainer pipeline.")
    parser.add_argument(
        "--config", default="config.yaml", help="Path to the experiment config."
    )
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    print(f"Loaded {args.config}")
    print(f"  tasks : {[t.name for t in cfg.tasks]}  "
          f"agents: {cfg.agents}  method(s): "
          f"{cfg.memory_method}  seeds: {list(cfg.seeds)}")

    t0 = time.time()
    results = run_experiment(cfg)
    print(f"\nExperiment finished in {time.time() - t0:.0f}s "
          f"({len(results)} condition-seed runs)")

    _summarise(results)

    records = flatten_results(results, cfg.tasks[0].name, cfg.tasks[1].name)
    scores_path = os.path.join(cfg.output_dir, "scores.csv")
    plot_path = os.path.join(cfg.output_dir, "forgetting_report.png")
    save_scores_csv(records, scores_path)
    plot_forgetting_report(records, plot_path)
    print(f"\nWrote {scores_path} and {plot_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())