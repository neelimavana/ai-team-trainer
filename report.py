"""Reporting: persist experiment results to CSV and render the forgetting plot.

Phase 6 requirement: turn manual print statements into automatic logging and
reporting. This module is deliberately *passive* — it formats whatever results
it is given (produced by ``memory.run_condition``) into:

- ``outputs/scores.csv`` — one row per (stage, task, method, seed) with the
  mean episodic reward, ready for stats/aggregation, and
- ``outputs/forgetting_report.png`` — score vs. training stage, one line per
  task (mean +/- std across seeds when several are present).

Everything here is configuration-free: file paths are passed by callers so
the same functions serve both ``python report.py`` (Phase 6 check) and
``main.py`` (Phase 8).
"""

from __future__ import annotations

import os

import matplotlib

matplotlib.use("Agg")  # headless rendering (no display on CI/CPU machines)
import matplotlib.pyplot as plt
import pandas as pd

from memory import ConditionResult

#: Reading order of training stages on the x axis of the plot and CSV rows.
STAGES = ("after_task1", "after_task2")

_METHOD_LINESTYLES = {
    "none": "-",
    "experience_replay": "--",
    "regularization": ":",
    "both": "-.",
}


def flatten_results(
    results: list[ConditionResult],
    task1_label: str,
    task2_label: str,
) -> list[dict]:
    """Expand condition results into one row per (stage, task, method, seed).

    Every condition produces:
      - ``after_task1``  score of the first-learned task (post-task1),
      - ``after_task2``  score of the first task again (post-task2; carries the
        ``forgetting`` value = before - after), and
      - ``after_task2``  score of the second task (proves it was learned).

    Args:
        results: One entry per mitigation condition from ``run_condition``.
        task1_label / task2_label: Display/join keys for the two tasks.

    Returns:
        A list of flat dicts with ``stage, task, method, seed, score`` and,
        where defined, ``forgetting``.
    """
    rows: list[dict] = []
    for res in results:
        rows.append(
            {
                "stage": "after_task1",
                "task": task1_label,
                "method": res.method,
                "seed": res.seed,
                "score": res.score_before,
                "forgetting": res.forgetting,
            }
        )
        rows.append(
            {
                "stage": "after_task2",
                "task": task1_label,
                "method": res.method,
                "seed": res.seed,
                "score": res.score_after,
                "forgetting": res.forgetting,
            }
        )
        rows.append(
            {
                "stage": "after_task2",
                "task": task2_label,
                "method": res.method,
                "seed": res.seed,
                "score": res.score_task2,
                "forgetting": None,
            }
        )
    return rows


def save_scores_csv(records: list[dict], path: str = "outputs/scores.csv") -> pd.DataFrame:
    """Write the flat records to ``path`` and verify the file on disk."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    df = pd.DataFrame(records)
    df = df[["stage", "task", "method", "seed", "score", "forgetting"]]
    df.to_csv(path, index=False)
    if not os.path.exists(path):
        raise OSError(f"scores.csv was not created: {path}")
    if len(df) != len(records):
        raise AssertionError(
            f"CSV row count {len(df)} != records {len(records)}."
        )
    return df


def plot_forgetting_report(
    records: list[dict], path: str = "outputs/forgetting_report.png"
) -> None:
    """Render score-vs-stage lines per task (mean +/- std across seeds).

    The x axis is the training stage, the y axis the mean episodic reward over
    20 evaluation episodes. Each task has one line per mitigation method;
    error shading appears only when a group contains >1 seed.
    """
    df = pd.DataFrame(records)
    agg = (
        df.groupby(["task", "method", "stage"], as_index=False)["score"]
        .agg(["mean", "std", "count"])
        .reset_index()
    )

    fig, ax = plt.subplots(figsize=(10, 6))
    stage_idx = {stage: i for i, stage in enumerate(STAGES)}

    for (task, method), grp in agg.groupby(["task", "method"]):
        xs = [stage_idx[s] for s in STAGES if s in set(grp["stage"])]
        ys = [grp.loc[grp["stage"] == s, "mean"].iloc[0] for s in STAGES if s in set(grp["stage"])]
        ax.plot(
            xs,
            ys,
            marker="o",
            linestyle=_METHOD_LINESTYLES.get(method, "-"),
            label=f"{task} / {method}",
        )
        line = grp.set_index("stage").reindex(STAGES)
        if line["count"].max() > 1:
            ax.fill_between(
                xs,
                [m - s for m, s in zip(line["mean"], line["std"].fillna(0))],
                [m + s for m, s in zip(line["mean"], line["std"].fillna(0))],
                alpha=0.15,
            )

    ax.set_xticks(range(len(STAGES)))
    ax.set_xticklabels(STAGES, rotation=15)
    ax.set_xlabel("training stage")
    ax.set_ylabel("mean episodic reward (20 episodes)")
    ax.set_title("Backward Transfer across training stages")
    ax.legend(fontsize=7, ncol=2, loc="best")
    ax.grid(True, alpha=0.3)

    fig.tight_layout()
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        raise OSError(f"forgetting_report.png missing or empty: {path}")


def _phase6_main() -> int:
    """Phase 6 verification using the verified Phase 5 result numbers.

    report.py is a passive formatter; to verify it without re-running the
    ~45-minute Phase 5 sweep we replay the exact numbers that Phase 5 logged
    (see the phase-5 commit), then spot-check the CSV against them.
    """
    print("=" * 62)
    print("Phase 6 — automated testing & reporting")
    print("=" * 62)

    fixture = [
        ("none", -45.6053, -45.7887, -21.1523, 0.1834),
        ("experience_replay", -47.2312, -43.9942, -22.2106, -3.2370),
        ("regularization", -47.1409, -46.4096, -22.7149, -0.7313),
        ("both", -50.6066, -47.1909, -22.9692, -3.4157),
    ]
    results = [
        ConditionResult(
            method=m, seed=0,
            score_before=before, score_after=after,
            score_task2=task2, forgetting=forget,
        )
        for (m, before, after, task2, forget) in fixture
    ]

    records = flatten_results(results, "task1", "task2")
    df = save_scores_csv(records, "outputs/scores.csv")
    plot_forgetting_report(records, "outputs/forgetting_report.png")

    print(f"Wrote {len(df)} rows to outputs/scores.csv")
    print(df.to_string(index=False))

    # Spot-check the CSV against the Phase 5 console output (Phases.md).
    checks = [
        ("none", "after_task1", "score", -45.6053),
        ("experience_replay", "after_task2", "score", -43.9942),
        ("both", "after_task2", "forgetting", -3.4157),
    ]
    for method, stage, column, expected in checks:
        row = df[
            (df["method"] == method) & (df["task"] == "task1") & (df["stage"] == stage)
        ].iloc[0]
        actual = float(row[column])
        if abs(actual - expected) > 1e-4:
            print(f"FAIL: {method}/{stage}/{column} expected {expected}, CSV has {actual}")
            return 1
    png_size = os.path.getsize("outputs/forgetting_report.png")
    print(f"forgetting_report.png written and non-empty ({png_size} bytes)")
    print("Spot-check against Phase 5 console output: PASS")
    print("PHASE 6 PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(_phase6_main())