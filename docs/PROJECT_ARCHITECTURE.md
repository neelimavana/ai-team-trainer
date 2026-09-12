# Project Architecture — AI Team Trainer

How the pieces fit together, what each module owns, and the invariants that
later changes must preserve. Read `docs/PRD.md` (contract) and `docs/Phases.md`
(build plan) alongside this file.

## 1. Overview

The project empirically measures and mitigates **catastrophic forgetting** in a
cooperative multi-agent RL team, then verifies the finding on a real
pretrained language model (supplementary, GPU-only).

The core experiment:

1. Train a team of independent PPO agents on **Task 1** (cooperative
   simple-spread, 50-frame episodes).
2. **Continue the same model objects** on **Task 2** (same env, 25-frame
   episodes) — never fresh models.
3. Re-evaluate on Task 1 to measure `forgetting = score_before - score_after`.
4. Repeat under mitigation conditions (`none`, `experience_replay`,
   `regularization`, `both`) and compare.

Everything a run needs — agent count, task list, per-task timesteps, method,
seeds — lives in one file: `config.yaml` (PRD FR7). Nothing else needs to be
edited between runs.

## 2. Module map

```
config.yaml         Single source of truth for a run (PRD FR7).
config.py           load_config(path) -> ExperimentConfig (strict validation).
env.py              Task definitions + wrappers around mpe2 simple_spread.
agent.py            SingleAgentWrapper (gymnasium.Env) + PPO training/eval.
memory.py           Sequential pipeline under each mitigation condition.
report.py           Results -> outputs/scores.csv + forgetting_report.png.
main.py             run_experiment(cfg) + CLI: uv run python main.py --config
llm_validation.py   Supplementary: TRL PPO on distilgpt2 (GPU/Colab).
docs/               PRD.md, Phases.md, ADRs.md, this file.
outputs/            scores.csv, forgetting_report.png (tracked), *.zip (gitignored).
```

## 3. Data flow (one `main.py` invocation)

```
main: load_config(config.yaml)
   -> for each seed:
        set_global_seed(seed)
        -> for each method (or all 4 via memory_method: all):
             memory.run_condition(method, task1, task2,
                                  timesteps, timesteps_task2,
                                  seed, rounds, replay_budget_per_burst)
             -> agent.train_team(task1, timesteps, seed, rounds)   # learn T1
             -> evaluate(t1)                      -> score_before
             -> freeze_early_layers()             # regularization | both
             -> per round: train_agent(task2) + optional _rehearse(task1)
             -> evaluate(t1)                      -> score_after
             -> evaluate(t2)                      -> score_task2
             -> ConditionResult(...)               # one row per (seed, method)
   -> flatten_results -> outputs/scores.csv
   -> plot_forgetting_report -> outputs/forgetting_report.png
   -> console summary (mean +/- std per method)
```

`ConditionResult.as_row()` (in `memory.py`) defines the canonical row layout:
seed, method, stage, task, score, forgetting. `report.py` only reformats —
it never recomputes.

## 4. Determinism & seeding (do not touch casually)

Everything is reproducible from `config.yaml` + seed. Mappings are
insertion-ordered (no set iteration). The seed scheme is load-bearing and
spelled out in `agent.py`/`memory.py`:

- Task 1 auto-encoder block: `seed*1000 + r*100 + i`
- Task 2 block:            `(seed+10)*1000 + r*100 + i`
- Rehearsal burst block:   `(seed+50)*1000 + r*100 + i`
- `env_seed < 2**32` is asserted.
- SB3 constructs `PPO(seed=...)`, which seeds numpy/torch/random globally per
  agent creation — the whole `run_condition` sequence is deterministic across
  processes, which is what the Phase 7 hardcoded-vs-config parity check
  exploits (must remain exact).

## 5. Key design constraints (each is enforced in code or by ADR)

| Constraint | Where enforced | Why |
|---|---|---|
| Tasks share observation dim (6N=18) | `config.load_config` cross-task check | same model object must accept both tasks (ADR-004) |
| `num_agents == agents` | config cross-task check | team size fixed at N=3 for every task |
| Exactly 2 tasks this release | config validation | sequential/measurement machinery is 2-task (ADR-006, flagged) |
| `memory_method` valid / `all` swept | config validation + main | typos fail loudly; `all` = full comparison table |
| Same-model continuation | `memory.run_condition` passes the `models` list through | Phase 4 requirement (load-bearing) |
| Frozen params bit-identical after Task 2 | `FrozenLayerSnapshot.assert_unchanged()` — real `torch.equal` | Phase 5 requirement, real assertion, not a comment |
| Fix-2.14 torch c10.dll failure | `torch==2.8.0+cpu` pinned via CPU index in `pyproject.toml` | 2.14.0 fails `WinError 1114` at import (ADR-002) |

## 6. SB3 / mpe2 integration notes

- `mpe2.simple_spread_v3` replaces the removed `pettingzoo[mpe]` (ADR-003).
  Import is `from mpe2.simple_spread_v3 import parallel_env`; there is no
  `env.observe()` — observations come from the `reset`/`step` return dicts.
- SB3 2.9 requires a `gymnasium.Env` subclass: `agent.SingleAgentWrapper`
  wraps the parallel env and implements `step`/`reset` with an explicit action
  dict including every teammate (omitting one is the classic "always zero
  reward" bug — `agent.py` tests for it).
- `create_ppo` probes observation/action spaces with a `_ProbeEnv`, then
  `model.set_env(wrapper)` **before** `learn()` (SB3 2.9 behaviour).
- In SB3 2.9 `MlpPolicy`, the two 64-unit hidden layers are separate
  `mlp_extractor.policy_net` and `mlp_extractor.value_net` branches. The
  "early layer" freeze therefore targets `.0.{weight,bias}` of *each* branch
  (2 432 / 11 142 params ≈ 22%, ADR-005). Freeze = `requires_grad=False` +
  fully rebuilt Adam optimizer over remaining params (SB3 won't drop frozen
  params from an existing optimizer otherwise).

## 7. Config schema (config.yaml)

```yaml
agents: 3                 # 2-4; must equal num_agents of every task
memory_method: all        # none|experience_replay|regularization|both|all
episodes: 20              # evaluation episodes per metric (PRD sec. 11)
rounds: 5                 # alternating per-agent rounds per task phase
replay_budget_per_burst: 2500 # rehearsal timesteps/agent (replay|both)
seeds: [0]                # repeated runs; reported as mean +/- std
output_dir: outputs
tasks:
  - name: task1
    env: spread_3a_50c    # must exist in env.TASK_CONFIGS
    timesteps: 50000      # per-agent budget for this task phase
  - name: task2
    env: spread_3a_25c
    timesteps: 50000
```

Validation is strict and cumulative: every problem is reported in one error
message, never a silent default. Adding a 3rd task is *flagged*, not silently
accepted (ADR-006).

## 8. Known scope flags / future work

- **3-task chaining**: declared future work (ADR-006). The per-(seed, method,
  task) row structure generalizes; the measurement/report schema is the part
  that needs extending.
- **Regularization proxy**: freezing is a stand-in for EWC (explicitly
  allowed by the PRD's simplified framework, ADR-005).
- **Rehearsal, not replay buffer**: "experience replay" here means short
  interleaved Task 1 retraining bursts (ADR-005) — the PRD's wording.
- **CPU-only**: the multi-agent pipeline runs on CPU (torch 2.8.0+cpu). The
  LLM supplement is GPU-only and is a separate script/environment.

## 9. How to run

```bash
uv run python env.py                  # Phase 2 smoke test
uv run python agent.py 3              # single-task baseline (Phase 3)
uv run python agent.py 4              # sequential + forgetting (Phase 4)
uv run python memory.py               # all four conditions (Phase 5)
uv run python report.py               # regenerate CSV + plot (Phase 6)
uv run python config.py               # config smoke test (Phase 7)
uv run python main.py --config config.yaml   # whole pipeline (Phase 8)
```

Outputs land in `outputs/`; scratch logs live in `logs/` (gitignored).