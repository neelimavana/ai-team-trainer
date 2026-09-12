"""Experiment configuration loading and validation (Phase 7).

PRD FR7: *all* run parameters (agent count, task list, timesteps, method,
seed) live in a single ``config.yaml`` — no hardcoded experiment values in
code. PRD NFR: invalid values must fail loudly with a clear error, never
silently do the wrong thing. This module enforces both.

Schema
------
.. code-block:: yaml

    agents: 3                 # 2-4 cooperative agents
    memory_method: all        # none | experience_replay | regularization | both | all
    episodes: 20              # evaluation episodes (PRD metric definition)
    rounds: 5                 # alternating per-agent training rounds per task
    replay_budget_per_burst: 2500   # per-agent rehearsal steps (replay only)
    seeds: [0, 1, 2]          # run across seeds; mean +/- std aggregated later
    output_dir: outputs
    tasks:
      - name: task1           # logical label used in reports
        env: spread_3a_50c    # must exist in env.TASK_CONFIGS
        timesteps: 50000      # per-agent training budget for this task
      - name: task2
        env: spread_3a_25c
        timesteps: 50000
"""

from __future__ import annotations

from dataclasses import dataclass

import yaml

from env import TASK_CONFIGS, observation_dim
from memory import METHODS

#: ``memory_method: all`` sweeps every PRD mode in one run (comparison table).
METHODS_OR_SWEEP = (*METHODS, "all")


class ConfigError(ValueError):
    """Raised when ``config.yaml`` is missing or contains invalid values."""


@dataclass(frozen=True)
class TaskSpec:
    """One sequential task from the config."""

    name: str
    env: str
    timesteps: int


@dataclass(frozen=True)
class ExperimentConfig:
    """Validated view of everything the experiment needs to run."""

    agents: int
    tasks: tuple[TaskSpec, ...]
    memory_method: str
    episodes: int
    rounds: int
    replay_budget_per_burst: int
    seeds: tuple[int, ...]
    output_dir: str


def _require(problems: list[str], message: str, ok: bool) -> None:
    """Collect a validation problem unless ``ok`` holds (accumulates errors)."""
    if not ok:
        problems.append(message)


def load_config(path: str) -> ExperimentConfig:
    """Parse + validate ``path`` and return an immutable experiment config.

    Raises:
        ConfigError: if the file is unreadable, not a mapping, or any value
            violates a constraint (all problems reported at once).
    """
    try:
        with open(path, encoding="utf-8") as fh:
            raw = yaml.safe_load(fh)
    except OSError as exc:
        raise ConfigError(f"Cannot read config file {path!r}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise ConfigError(f"Invalid YAML in {path!r}: {exc}") from exc

    problems: list[str] = []
    if not isinstance(raw, dict):
        raise ConfigError(f"Config root must be a mapping, got {type(raw).__name__}.")

    agents = raw.get("agents", 3)
    if type(agents) is not int or not 2 <= agents <= 4:
        problems.append(f"agents must be an int in [2, 4], got {agents!r}.")

    memory_method = raw.get("memory_method", "none")
    _require(
        problems,
        f"memory_method {memory_method!r} invalid; expected one of {METHODS_OR_SWEEP}.",
        memory_method in METHODS_OR_SWEEP,
    )

    episodes = raw.get("episodes", 20)
    _require(problems, f"episodes must be >= 1, got {episodes!r}.", type(episodes) is int and episodes >= 1)

    rounds = raw.get("rounds", 5)
    _require(problems, f"rounds must be >= 1, got {rounds!r}.", type(rounds) is int and rounds >= 1)

    replay = raw.get("replay_budget_per_burst", 2500)
    _require(
        problems,
        f"replay_budget_per_burst must be >= 1, got {replay!r}.",
        type(replay) is int and replay >= 1,
    )

    seeds_raw = raw.get("seeds", [0])
    seeds: list[int] = []
    if isinstance(seeds_raw, int):
        seeds = [seeds_raw]
    elif isinstance(seeds_raw, list) and all(isinstance(s, int) for s in seeds_raw) and seeds_raw:
        seeds = seeds_raw
    else:
        problems.append(
            f"seeds must be a non-empty list of ints (or a single int), got {seeds_raw!r}."
        )

    output_dir = raw.get("output_dir", "outputs")
    if not isinstance(output_dir, str) or not output_dir.strip():
        problems.append(f"output_dir must be a non-empty string, got {output_dir!r}.")

    tasks_raw = raw.get("tasks")
    tasks: list[TaskSpec] = []
    task_names: set[str] = set()
    if not isinstance(tasks_raw, list):
        problems.append("tasks must be a list of {name, env, timesteps} entries.")
    else:
        _require(
            problems,
            f"tasks must contain 2 entries in this release "
            f"(3-task chaining is flagged as future work), got {len(tasks_raw)}.",
            len(tasks_raw) == 2,
        )
        valid_envs = set(TASK_CONFIGS)
        for i, spec in enumerate(tasks_raw):
            if not isinstance(spec, dict):
                problems.append(f"tasks[{i}] must be a mapping.")
                continue
            name = spec.get("name")
            env = spec.get("env")
            timesteps = spec.get("timesteps")
            if not isinstance(name, str) or not name.strip():
                problems.append(f"tasks[{i}].name must be a non-empty string.")
            elif name in task_names:
                problems.append(f"tasks[{i}].name {name!r} is duplicated.")
            task_names.add(name)
            _require(
                problems,
                f"tasks[{i}].env {env!r} not in TASK_CONFIGS ({sorted(valid_envs)}).",
                env in valid_envs,
            )
            _require(
                problems,
                f"tasks[{i}].timesteps must be >= 1, got {timesteps!r}.",
                type(timesteps) is int and timesteps >= 1,
            )
            if env in valid_envs and isinstance(timesteps, int) and timesteps >= 1 and isinstance(name, str):
                tasks.append(TaskSpec(name=name, env=env, timesteps=timesteps))

    if problems:
        bulleted = "\n".join(f"  - {p}" for p in problems)
        raise ConfigError(f"Invalid config file {path!r}:\n{bulleted}")

    # Cross-task constraints (sequential same-model continuation, ADR-004):
    cfg_tasks = [TASK_CONFIGS[spec.env] for spec in tasks]
    if len({observation_dim(tc) for tc in cfg_tasks}) != 1:
        problems.append(
            "All tasks must share the same observation dimension so a single "
            "policy can be trained sequentially (ADR-004)."
        )
    for tc in cfg_tasks:
        if tc.num_agents != agents:
            problems.append(
                f"agents config ({agents}) does not match task {tc.name!r} "
                f"(num_agents={tc.num_agents})."
            )
    if problems:
        bulleted = "\n".join(f"  - {p}" for p in problems)
        raise ConfigError(f"Invalid cross-task constraints in {path!r}:\n{bulleted}")

    assert len(tasks) == 2
    return ExperimentConfig(
        agents=agents,
        tasks=tuple(tasks),
        memory_method=memory_method,
        episodes=episodes,
        rounds=rounds,
        replay_budget_per_burst=replay,
        seeds=tuple(seeds),
        output_dir=output_dir,
    )


def _config_main() -> int:
    """Smoke test: load the repo's config.yaml and print the parsed result."""
    print("Loading config.yaml ...")
    cfg = load_config("config.yaml")
    print(cfg)
    print("CONFIG LOAD OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(_config_main())