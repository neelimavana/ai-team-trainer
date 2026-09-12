"""Cooperative task environments for the AI Team Trainer.

This module owns task *definition*: the configurable simple_spread
environment (via the maintained ``mpe2`` package, see docs/ADRs.md ADR-003)
and the canonical set of task variants consumed by the training pipeline.

Design notes
------------
All tasks are built on the same environment family (simple_spread) **and the
same team size**, so every agent's observation vector keeps a fixed size
across tasks. This is load-bearing: Phase 4 of phases.md requires continuing
training the *same model object* on Task 2 after Task 1, which is only
possible when the policy's input dimensionality does not change between
tasks.

MPE simple_spread always uses ``num_landmarks == N``, so "landmark
configuration" cannot be changed independently of the team size. Following the
sanctioned task-differentiators in phases.md (agent count, landmark layout, or
*episode length*), we differentiate tasks through:

- ``max_cycles`` (episode length), and
- ``local_ratio`` (balance between cooperative coverage reward and collision
  penalty).

Team-level success (PRD sec. 11) is measured separately from reward by
counting landmarks that are actually occupied, matching the environment's own
capture criterion (mpe2 ``CAPTURE_RADIUS`` = 0.1).
"""

from __future__ import annotations

import os
import random

import numpy as np
from mpe2.simple_spread_v3 import parallel_env as _mpe2_parallel_env

#: Single-threaded BLAS is load-bearing for exact reproducibility: torch's
#: multithreaded (MKL-DNN) reductions reorder across processes, so identical
#: seeds produced different results between runs (caught by the Phase 7 parity
#: check). These must be set before torch's runtime initialises its thread
#: pools. env.py is imported before torch anywhere in the pipeline, so doing it
#: here is early enough; set_global_seed() also pins threads again defensively.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

#: Distance below which an agent "occupies" a landmark (mpe2 capture radius).
CAPTURE_RADIUS = 0.1

_OBS_BASE_DIM = 4  # agent velocity (2) + agent position (2)


class TaskConfig:
    """Parameter set that fully defines one cooperative task.

    Attributes:
        name: Unique task identifier, used in config files and result tables.
        num_agents: Number of cooperative agents (== number of landmarks in
            simple_spread). Constrained to 2-4 by the PRD.
        max_cycles: Episode length in frames (each frame steps every agent
            once). Different values produce genuinely different tasks.
        local_ratio: Weight on the local (collision-avoidance) reward; the
            cooperative coverage reward receives ``1 - local_ratio``.
        continuous_actions: Use continuous velocity actions instead of the
            default 5-branch discrete action set.
    """

    def __init__(
        self,
        name: str,
        num_agents: int = 3,
        max_cycles: int = 50,
        local_ratio: float = 0.5,
        continuous_actions: bool = False,
    ) -> None:
        self.name = name
        self.num_agents = num_agents
        self.max_cycles = max_cycles
        self.local_ratio = local_ratio
        self.continuous_actions = continuous_actions
        validate_config(self)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"TaskConfig(name={self.name!r}, num_agents={self.num_agents}, "
            f"max_cycles={self.max_cycles}, local_ratio={self.local_ratio})"
        )


def validate_config(cfg: TaskConfig) -> None:
    """Validate a task config, raising a loud error for invalid values.

    Invalid config values must fail loudly (PRD NFR) rather than silently
    produce a nonsense environment.
    """
    if not 2 <= cfg.num_agents <= 4:
        raise ValueError(
            f"Task {cfg.name!r}: num_agents must be in [2, 4] (PRD constraint), "
            f"got {cfg.num_agents}."
        )
    if cfg.max_cycles < 1:
        raise ValueError(
            f"Task {cfg.name!r}: max_cycles must be >= 1, got {cfg.max_cycles}."
        )
    if not 0.0 <= cfg.local_ratio <= 1.0:
        raise ValueError(
            f"Task {cfg.name!r}: local_ratio must be in [0.0, 1.0], "
            f"got {cfg.local_ratio}."
        )


#: Canonical task registry. Tasks share the team size so observation
#: dimensionality is fixed and a single policy can be trained across tasks.
TASK_CONFIGS: dict[str, TaskConfig] = {
    # Task 1: the "easy" cooperative task learned first (50-frame episodes).
    "spread_3a_50c": TaskConfig(
        name="spread_3a_50c", num_agents=3, max_cycles=50, local_ratio=0.5
    ),
    # Task 2: same team, shorter deadline -> different, harder policy.
    "spread_3a_25c": TaskConfig(
        name="spread_3a_25c", num_agents=3, max_cycles=25, local_ratio=0.5
    ),
    # Task 3 (optional): longer horizon, stronger cooperation weighting.
    "spread_3a_75c": TaskConfig(
        name="spread_3a_75c", num_agents=3, max_cycles=75, local_ratio=0.3
    ),
}


def observation_dim(cfg: TaskConfig) -> int:
    """Observation vector length for one agent under ``cfg``.

    simple_spread observation = self velocity + self position + relative
    positions of all ``N`` landmarks + relative positions/communication of the
    other ``N - 1`` agents:

        dim = 4 + 2N + 2 * 2(N - 1) = 6N   (discrete-actions build)

    Returns 0 for a degenerate N (kept defensive; validated upstream).
    """
    n = cfg.num_agents
    if n < 2:
        return 0
    return _OBS_BASE_DIM + 2 * n + 4 * (n - 1)


def make_env(cfg: TaskConfig) -> _mpe2_parallel_env:
    """Create a fresh parallel API environment for ``cfg``.

    Returns an unseeded environment; seed it via :func:`reset` on the first
    call so every consumer controls their own RNG stream.
    """
    validate_config(cfg)
    return _mpe2_parallel_env(
        N=cfg.num_agents,
        max_cycles=cfg.max_cycles,
        local_ratio=cfg.local_ratio,
        continuous_actions=cfg.continuous_actions,
    )


def set_global_seed(seed: int) -> None:
    """Seed every global RNG the pipeline touches (PRD reproducibility).

    This must be the *only* place seeds are wired: numpy, the ``random``
    module, and PyTorch. The environment's own generator is seeded separately
    through ``reset(seed=...)`` by callers (Phases.md appendix: seed numpy,
    torch AND the environment, not just one of the three).
    """
    np.random.seed(seed)
    random.seed(seed)
    import torch

    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    torch.manual_seed(seed)


def seed_env_action_spaces(env, base_seed: int) -> None:
    """Seed every agent's action-space RNG for deterministic random sampling.

    gymnasium ``Space.sample()`` defaults to an entropy-seeded
    ``np.random.default_rng()`` — so teammates that act randomly during early
    training rounds (``agent.py``) sample differently in every process. That
    single unseeded RNG broke exact cross-process reproducibility (caught by
    the Phase 7 parity check). Seeding each agent's space with a distinct,
    repeatable sub-seed restores bit-exact determinism.
    """
    names = list(getattr(env, "possible_agents", None) or [])
    if not names:
        names = list(env.agents)
    for i, name in enumerate(names):
        try:
            env.action_space(name).seed(base_seed + i)
        except AttributeError:  # pragma: no cover - unusual space with no seed
            continue


def get_world(env) -> "object":
    """Access the underlying MPE world state for team-success bookkeeping.

    ``env`` is a parallel env whose ``.unwrapped`` chain terminates at mpe2's
    ``raw_env`` exposing ``.world`` (agents and landmarks in world space).
    """
    return env.unwrapped.world


def team_success(env) -> float:
    """Fraction of landmarks occupied by at least one agent, in [0, 1].

    This is the coordination-agnostic success metric from PRD sec. 11,
    measured on the current world state of ``env``. An agent occupies a
    landmark when their centre distance is below the MPE capture radius.
    """
    world = get_world(env)
    if not world.landmarks:
        return 0.0
    covered = 0
    for landmark in world.landmarks:
        dists = [
            np.linalg.norm(agent.state.p_pos - landmark.state.p_pos)
            for agent in world.agents
        ]
        if min(dists) < CAPTURE_RADIUS:
            covered += 1
    return covered / len(world.landmarks)


def _smoke_test() -> int:
    """Phase 2 verification: reset + 5 random steps per task (see phases.md)."""
    print("=" * 62)
    print("env.py smoke test")
    print("=" * 62)
    failures = 0
    task1, task2 = TASK_CONFIGS["spread_3a_50c"], TASK_CONFIGS["spread_3a_25c"]

    for name, cfg in TASK_CONFIGS.items():
        env = make_env(cfg)
        obs, _ = env.reset(seed=42)
        expected_agents = cfg.num_agents
        print(f"\n[{name}] expected agents: {expected_agents}, "
              f"actual: {len(env.agents)}")
        if len(env.agents) != expected_agents:
            print("  FAIL: agent count mismatch")
            failures += 1
        if sorted(obs.keys()) != sorted(env.agents):
            print("  FAIL: reset() did not return one observation per agent")
            failures += 1

        dim = observation_dim(cfg)
        sample = next(iter(obs.values()))
        print(f"[{name}] obs dim (formula/computed): {dim}/{sample.size}")
        if sample.size != dim:
            print(f"  FAIL: observation_dim {dim} != actual {sample.size}")
            failures += 1

        for i in range(5):
            actions = {a: env.action_space(a).sample() for a in env.agents}
            _, rewards, term, trunc, _ = env.step(actions)
            reward_line = ", ".join(f"{a}={float(r):+.3f}" for a, r in rewards.items())
            if not all(np.isfinite(list(rewards.values()))):
                print(f"  step {i}: non-finite reward detected")
                failures += 1
            print(f"  step {i}: rewards {reward_line} | "
                  f"term={any(term.values())} trunc={any(trunc.values())}")

    print("\nTask differentiation (must be real, not assumed):")
    print(f"  Task1 max_cycles={task1.max_cycles} vs Task2 max_cycles={task2.max_cycles}")
    if task1.max_cycles == task2.max_cycles:
        print("  FAIL: tasks do not differ")
        failures += 1
    else:
        print("  PASS: episode length differs between Task 1 and Task 2")
    print(f"  obs_dim Task1/Task2: {observation_dim(task1)}/{observation_dim(task2)} "
          f"(equal by design -> same policy can be trained on both)")

    if failures:
        print(f"\nSMOKE TEST FAILED ({failures} failure(s))")
        return 1
    print("\nSMOKE TEST PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(_smoke_test())