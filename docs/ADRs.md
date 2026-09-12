# Architecture Decision Records

This log records the significant technical decisions taken during development,
their rationale, and their consequences. Each entry follows a lightweight ADR
format (Context / Decision / Consequences). New entries are appended in
chronological order and numbered sequentially.

> Governance note: Where a decision here conflicts with `prd.md`, the PRD wins.
> If we must deviate from a PRD constraint, the deviation is recorded in this
> file with an explicit reference to the PRD clause it affects.

---

## ADR-001: Use `uv` for environment and package management

**Status:** Accepted (Phase 1)
**Date:** 2026-09-09

### Context

The project needed a reproducible Python toolchain. The machine shipped only
Python 3.14, which is too new for the pinned dependency stack (torch wheels,
stable-baselines3). Phase 1 calls for a dedicated virtual environment with a
curated dependency set.

### Decision

Adopt `uv` as the single toolchain for:

- A **managed CPython 3.11.16** interpreter (`uv python install 3.11`), pinned
  via `.python-version` and `requires-python = ">=3.11,<3.12"`.
- Virtual environment creation and `uv.lock`-locked, declarative dependency
  management driven by `pyproject.toml` (`uv add` / `uv sync` / `uv run`).

Run every project command through `uv run python ...` so the venv is always the
source of truth.

### Consequences

- All dependency versions are reproducible via `uv.lock`.
- Python upgrades are managed by `uv`, not system installers.
- `uv` is not installed system-wide by default distribution channels; the
  binary path is documented in `README.md` for contributors on Windows.

---

## ADR-002: Pin PyTorch to the CPU build and an older stable release

**Status:** Accepted (Phase 1)
**Date:** 2026-09-09

### Context

PRD Non-Functional Requirements require "no hard GPU dependency anywhere in the
main pipeline", and the build machine has no NVIDIA GPU. The default PyPI
`torch` wheel bundles a CUDA runtime (~2.5 GB). Furthermore, `torch==2.14.0`
(the newest version resolved at Phase 1) failed to load on this machine with
`OSError: [WinError 1114]` while initializing `c10.dll`; `stable-baselines3 2.9`
requires `torch>=2.8`.

### Decision

- Route only `torch` through PyTorch's dedicated CPU index
  (`https://download.pytorch.org/whl/cpu`) via `[tool.uv.index]` + `[tool.uv.sources]`
  in `pyproject.toml`; all other packages resolve from PyPI.
- Pin `torch==2.8.0` (`2.8.0+cpu`), a battle-tested stable release that loads
  cleanly on this Windows 11 build and satisfies `stable-baselines3>=2.8`.

### Consequences

- Main-pipeline install is ~120 MB instead of ~2.5 GB.
- No CUDA code paths are reachable on the main pipeline; GPU-only work is
  confined to `llm_validation.py` (run on Colab).
- Torch is pinned; upgrades must be deliberate and re-verified on this machine.

---

## ADR-006: Config-driven pipeline; 3-task chaining flagged

**Status:** Accepted (Phase 7)
**Date:** 2026-09-09

### Context

PRD G1/FR1 allow "2-3 cooperative tasks". The sequential machinery built in
Phases 4-5 (`memory.run_condition`) and its reporting schema
(`ConditionResult`, the stage/task CSV layout) are shaped around exactly two
tasks: learn task1 → learn task2 → measure Backward Transfer on task1. A third
task would require generalising the measurement to "evaluate every earlier
task after each new task" and rippling through `ConditionResult`, `report.py`
and the plot — a real design change, not a config tweak.

### Decision

- `config.py` validates that the `tasks` list contains exactly 2 entries in
  this release, and raises a clear `ConfigError` otherwise.
- All run parameters are centralized in `config.yaml` (PRD FR7): agent count,
  per-task `env` + `timesteps`, `memory_method` (incl. the `all` full
  comparison sweep), `rounds`, evaluation `episodes`,
  `replay_budget_per_burst`, `seeds`, `output_dir`.
- **Scope flag (per Phases.md "flag it rather than silently adding it"):**
  3-task sequential chaining is declared future work. The architecture
  (per-method per-seed `run_condition` rows) is designed so a 3rd task can be
  appended without redesigning the training core; only the measurement and
  report schema need extension.

### Consequences

- `config.yaml` task lists are enforced at exactly 2 tasks today.
- The "2-3 tasks" PRD goal is partially met (2-task sweeps fully supported);
  the gap is explicitly tracked rather than silently ignored.

---

## ADR-005: Layer-freezing target and rehearsal mechanics

**Status:** Accepted (Phase 5)
**Date:** 2026-09-09

### Context

PRD requires regularization via "layer freezing on shared/early network layers"
(full EWC is out of scope) and replay as "rehearsal-style periodic short
retraining bursts", not a stored buffer. SB3 2.9's `MlpPolicy` builds the two
64-unit hidden layers as **separate** `policy_net` and `value_net` branches —
there is no literal shared trunk to freeze.

### Decision

- **Freeze target:** the first (input-projection) layer of each branch —
  `mlp_extractor.policy_net.0.{weight,bias}` and
  `mlp_extractor.value_net.0.{weight,bias}` (2 432 of 11 142 params ≈ 22%).
  These are the earliest layers in each network, i.e. the closest proxy for
  "shared/early" features under the PRD's simplified framework.
- **Freeze mechanics:** set `requires_grad = False`, then *rebuild the Adam
  optimizer* over the remaining trainable parameters only (explicit, safe).
- **Verification:** every frozen parameter is snapshotted at freeze time and a
  real `assert_unchanged()` (bit-identical `torch.equal`) runs after Task 2.
- **Rehearsal:** carried out by re-using `agent.train_agent` to run short
  retraining rounds on Task 1 between Task 2 rounds — i.e. genuine additional
  gradient updates on the old task, interleaved, no stored transitions.
- **Scheduler parity:** the Task 2 phase uses the exact environment-seed
  scheme of `agent.train_team` (`(seed + 10) * 1000 + r * 100 + i`), so the
  `none` condition in `memory.run_condition` is a drop-in baseline with
  identical bookkeeping to Phase 4.

### Consequences

- Freezing removes ~22% of parameters from optimisation, visibly slowing
  Task 2 adaptation for regularization conditions — measurable via
  `score_task2` in the Phase 5 table.
- Rehearsal adds compute proportional to the burst budget (config-driven in
  Phase 7) but reuses the same sequential machinery.

---

## ADR-004: Differentiate tasks by horizon/reward weight, not team size

**Status:** Accepted (Phase 2)
**Date:** 2026-09-09

### Context

Phases.md Phase 4 requires continuing training the **same model object** on
Task 2 after Task 1. A policy network's input layer is fixed at build time, so
its observation dimensionality must be identical across tasks. MPE
simple_spread uses `num_landmarks == N`, and per-agent observations scale with
`N` (landmarks) and `N - 1` (other agents): changing the team size changes
observation size and breaks same-model continuation. The PRD explicitly allows
differentiating tasks by *episode length*.

### Decision

Fix the team size at `N = 3` for all tasks and differentiate through:

- `max_cycles` (episode length), and
- `local_ratio` (cooperative vs collision-avoidance reward weighting).

Canonical tasks: `spread_3a_50c` (50c), `spread_3a_25c` (25c), optional
`spread_3a_75c` (75c). Observation dimension is `6N = 18` for every task.

### Consequences

- A single MLP policy (fixed 18-dim input) can be trained sequentially across
  all tasks, satisfying Phase 4's same-model constraint.
- Task 1 vs Task 2 genuinely differ (25 vs 50 frames), confirmed by the
  `env.py` smoke test rather than assumed.
- Team-size variation across tasks would additionally require per-N model sets
  and is out of scope for this analysis.

---

## ADR-003: Replace `pettingzoo[mpe]` with the `mpe2` package

**Status:** Accepted (Phase 1)
**Date:** 2026-09-09

### Context

`pettingzoo==1.27.0` no longer ships MPE: importing `pettingzoo.mpe` raises
`ImportError: MPE has been moved into its own package: MPE2`. The PRD Technical
Constraints say, "PettingZoo MPE `simple_spread` (or a documented equivalent
cooperative task)". "Different 'tasks'" are to be created "by varying agent
count / landmark configuration / episode length".

### Decision

- Install and use the maintained successor package **`mpe2`** (Farama org),
  importing `from mpe2.simple_spread_v3 import raw_env`.
- Treat this as the PRD-sanctioned "documented equivalent": `mpe2.simple_spread_v3`
  is the same cooperative "cover all landmarks" task with the same naming
  convention (v3) and the same AEC API semantics.
- Task differentiation is implemented via the `N` (agents = landmarks) and
  `max_cycles` (episode length) parameters. Landmark configuration follows the
  agent count by design of the environment (`num_landmarks == N`).

### Consequences

- Import path changed from `pettingzoo.mpe.simple_spread_v3` to
  `mpe2.simple_spread_v3`; the rest of the pipeline is unaffected because we
  only consume the standard AEC/parallel API through a single-agent wrapper
  (see `agent.py` in Phase 3).
- `pettingzoo` remains a dependency (mpe2 builds on its API adapters).