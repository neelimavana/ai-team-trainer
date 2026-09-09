"""Mitigation methods: experience replay (rehearsal) and regularization.

PRD Technical Constraints
-------------------------
- Experience replay is *rehearsal-style*: periodic short retraining bursts on
  earlier tasks, NOT a stored replay buffer with prioritized sampling.
- Regularization is a *simplified layer-freezing proxy* for EWC: early/shared
  network weights are locked after the first task so later training can never
  change them. No Fisher information matrix is computed (explicitly out of
  scope per PRD sec. 4).

SB3 2.9 MlpPolicy builds a 2-layer MLP as *separate* ``policy_net`` and
``value_net`` branches. There is no literal shared trunk, so "early layers"
are realised by freezing the first (input-projection) layer of each branch —
the weights closest to the raw observation and most task-general. This is
documented in docs/ADRs.md (ADR-005).

Reproducibility: the sequential scheduler below reproduces the exact
environment-seed scheme used by ``agent.train_team`` for the Task 2 phase
(``(seed + 10) * 1000 + r * 100 + i``), so the ``none`` condition is a drop-in
baseline with identical bookkeeping to Phase 4.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np
import torch

from agent import PPO, evaluate, team_actors, train_agent, train_team
from env import TaskConfig, observation_dim, set_global_seed  # noqa: F401  (documented use)

#: The four mitigation modes selectable from config (PRD FR4).
METHODS = ("none", "experience_replay", "regularization", "both")

#: Early-layer parameters frozen by regularization (first layer of each
#: policy/value branch, i.e. the input projections shared most broadly).
_EARLY_LAYER_RE = re.compile(r"mlp_extractor\.(policy_net|value_net)\.0\.(weight|bias)")


def validate_method(method: str) -> None:
    """Reject unknown mitigation modes loudly (PRD NFR: fail, don't guess)."""
    if method not in METHODS:
        raise ValueError(
            f"Unknown memory_method {method!r}. Expected one of {METHODS}."
        )


@dataclass
class ConditionResult:
    """One row of the Phase 5 result table (shared results structure)."""

    method: str
    seed: int
    score_before: float
    score_after: float
    score_task2: float
    forgetting: float

    def as_row(self) -> dict:
        """Flat dict for CSV/table consumption (Phase 6)."""
        return {
            "method": self.method,
            "seed": self.seed,
            "score_before": round(self.score_before, 6),
            "score_after": round(self.score_after, 6),
            "score_task2": round(self.score_task2, 6),
            "forgetting": round(self.forgetting, 6),
        }


class FrozenLayerSnapshot:
    """Captures frozen parameter values and asserts they never change.

    The Phase 5 verification demands a *real* assertion, not a code comment:
    after further training, every frozen parameter must be bit-identical to
    its value immediately after freezing.
    """

    def __init__(self, model: PPO, frozen_names: list[str]) -> None:
        self._model = model
        self._frozen_names = frozen_names
        params = dict(model.policy.named_parameters())
        self._reference = {
            name: params[name].detach().clone() for name in frozen_names
        }

    def assert_unchanged(self) -> None:
        """Fail loudly if any frozen parameter changed during training."""
        params = dict(self._model.policy.named_parameters())
        for name in self._frozen_names:
            current = params[name].data
            reference = self._reference[name]
            if not torch.equal(reference, current):
                raise AssertionError(
                    f"Frozen layer {name} changed during further training."
                )


def _is_early_layer(name: str) -> bool:
    return _EARLY_LAYER_RE.fullmatch(name) is not None


def freeze_early_layers(model: PPO) -> FrozenLayerSnapshot:
    """Freeze early layer(s) and return a snapshot for later assertion.

    Also rebuilds the optimizer so it only updates the still-trainable
    parameters — otherwise Adam may still hold (and later mutate) non-grad
    tensors (actually a silent no-op for ``requires_grad=False``, but
    rebuilding is the correct, explicit behaviour).
    """
    frozen = [
        name
        for name, _ in model.policy.named_parameters()
        if _is_early_layer(name)
    ]
    if not frozen:
        raise ValueError(
            "No early-layer parameters matched the freeze pattern; refusing "
            "to continue with a (broken) no-op freeze."
        )
    for name, param in model.policy.named_parameters():
        if _is_early_layer(name):
            param.requires_grad_(False)

    trainable = [p for p in model.policy.parameters() if p.requires_grad]
    model.policy.optimizer = model.policy.optimizer_class(
        trainable,
        lr=model.lr_schedule(1),
        **model.policy.optimizer_kwargs,
    )
    return FrozenLayerSnapshot(model, frozen)


def _rehearse(
    models: list[PPO],
    old_task: TaskConfig,
    budget_per_agent: int,
    seed_block: int,
    r: int,
) -> list[PPO]:
    """One rehearsal burst: short retraining round on an earlier task."""
    for i in range(len(models)):
        env_seed = seed_block * 1_000 + r * 100 + i
        teammates = team_actors(old_task, models)
        models[i] = train_agent(
            old_task, i, budget_per_agent, env_seed, teammates, models[i]
        )
    return models


def run_condition(
    method: str,
    task1: TaskConfig,
    task2: TaskConfig,
    timesteps: int,
    seed: int,
    rounds: int = 4,
    replay_budget_per_burst: int = 2500,
) -> ConditionResult:
    """Run the full sequential pipeline under one mitigation condition.

    Pipeline (mirrors Phases.md Phase 4):
        1. Train a fresh team on ``task1``.
        2. Optionally freeze early layers (regularization | both).
        3. Continue the *same model objects* on ``task2``, round by round,
           interleaving short ``task1`` rehearsal bursts (experience_replay |
           both) after each task2 round.
        4. Re-evaluate on both tasks; ``forgetting = score_before - score_after``.

    Args:
        method: One of :data:`METHODS`.
        task1 / task2: First-learned and second-learned task.
        timesteps: Total timesteps per agent for each single-task phase.
        seed: Base RNG seed.
        rounds: Number of alternating per-agent rounds per task phase.
        replay_budget_per_burst: Per-agent timesteps of each rehearsal burst.
    """
    validate_method(method)
    if observation_dim(task1) != observation_dim(task2):
        raise ValueError(
            "Sequential training requires identical observation dimensions; "
            f"{task1.name}: {observation_dim(task1)} vs {task2.name}: "
            f"{observation_dim(task2)}."
        )
    set_global_seed(seed)

    # 1) Learn the first task (same schedule as Phases 3/4).
    models = train_team(task1, timesteps, seed, rounds)
    score_before = evaluate(team_actors(task1, models), task1).mean_reward

    # 2) Optional early-layer freeze (regularization proxy for EWC).
    snapshots: list[FrozenLayerSnapshot] = []
    freeze = method in ("regularization", "both")
    if freeze:
        snapshots = [freeze_early_layers(m) for m in models]

    # 3) Sequential Task 2 training with optional interleaved rehearsal.
    use_replay = method in ("experience_replay", "both")
    per_round = max(1, timesteps // max(1, rounds))
    for r in range(rounds):
        for i in range(len(models)):
            env_seed = (seed + 10) * 1_000 + r * 100 + i
            assert env_seed < 2**32
            teammates = team_actors(task2, models)
            models[i] = train_agent(
                task2, i, per_round, env_seed, teammates, models[i]
            )
        if use_replay and r < rounds - 1:
            # Fixed non-overlapping seed block so rehearsal is reproducible
            # without colliding with the task1 (seed*1000) or task2 blocks.
            models = _rehearse(models, task1, replay_budget_per_burst, seed + 50, r)

    # 4) Re-evaluate + forgetting.
    if snapshots:
        for snap in snapshots:
            snap.assert_unchanged()
    actors = team_actors(task1, models)
    score_after = evaluate(actors, task1).mean_reward
    score_task2 = evaluate(actors, task2).mean_reward

    forgetting = score_before - score_after
    return ConditionResult(
        method=method,
        seed=seed,
        score_before=score_before,
        score_after=score_after,
        score_task2=score_task2,
        forgetting=forgetting,
    )


def _phase5_main() -> int:
    """Phase 5 verification: all four conditions + frozen-layer assertion."""
    from env import TASK_CONFIGS

    task1 = TASK_CONFIGS["spread_3a_50c"]
    task2 = TASK_CONFIGS["spread_3a_25c"]
    timesteps = 20_000
    rounds = 4
    replay_budget = 2_500

    print("=" * 62)
    print(f"Phase 5 — mitigation methods sweep "
          f"({task1.name} -> {task2.name})")
    print("=" * 62)
    print(f"budget per task per agent: {timesteps} steps | rounds: {rounds} | "
          f"replay burst: {replay_budget} steps/agent")

    random_task2 = evaluate(None, task2).mean_reward
    print(f"Random-policy baseline on Task 2: {random_task2:+.4f}\n")

    results: list[ConditionResult] = []
    failures = 0
    for method in METHODS:
        print(f"Running condition: {method} ...")
        res = run_condition(
            method,
            task1,
            task2,
            timesteps=timesteps,
            seed=0,
            rounds=rounds,
            replay_budget_per_burst=replay_budget,
        )
        results.append(res)
        ok = all(
            np.isfinite(x)
            for x in (res.score_before, res.score_after, res.score_task2, res.forgetting)
        )
        print(f"  before={res.score_before:+.4f} after={res.score_after:+.4f} "
              f"task2={res.score_task2:+.4f} "
              f"forgetting={res.forgetting:+.4f} {'OK' if ok else 'NON-FINITE'}")
        if not ok:
            failures += 1

    print("\nSummary table:")
    print(f"{'method':<18}{'score_before':>14}{'score_after':>14}"
          f"{'task2':>10}{'forgetting':>12}")
    for res in results:
        print(f"{res.method:<18}{res.score_before:>14.4f}{res.score_after:>14.4f}"
              f"{res.score_task2:>10.4f}{res.forgetting:>12.4f}")

    print("\nFrozen-layer assertion: executed inside run_condition for "
          "regularization/both (raises on any bit change).")

    if failures:
        print(f"\nPHASE 5 FAILED ({failures} non-finite result(s))")
        return 1
    print("\nPHASE 5 PASSED (all four conditions produced complete result rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(_phase5_main())