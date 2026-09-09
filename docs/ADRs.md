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