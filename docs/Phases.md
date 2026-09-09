# Implementation Phases — AI Team Trainer

> Read `prd.md` in full before starting Phase 1. It defines requirements and constraints this file must not violate.

## How to Use This File

- Implement **exactly one phase at a time**, in order. Never start a later phase before the current one's Definition of Done is confirmed.
- After finishing a phase's tasks, actually run the commands in that phase's **Verification** section yourself and report the real output — do not assume or describe expected output as if it were observed.
- Do not expand scope beyond what a phase specifies. If something seems missing, flag it rather than silently adding it.
- If a step is ambiguous or underspecified, ask a clarifying question rather than guessing and moving on.
- Stop after each phase and wait for explicit confirmation before proceeding to the next one.

---

## Phase 1 — Environment Setup

**Objective:** A working Python environment with every dependency the rest of the project needs.

**Tasks**
- [ ] Create a virtual environment.
- [ ] Install: `torch gymnasium "pettingzoo[mpe]" stable-baselines3 matplotlib pyyaml pandas`.
- [ ] Do not install `transformers`/`trl` yet — those belong to Phase-9-equivalent (the supplementary LLM script), not the main pipeline.

**Verification**
```bash
python -c "import torch, gymnasium, pettingzoo, stable_baselines3, matplotlib, yaml, pandas; print('OK')"
python -c "import torch; print(torch.__version__)"
```

**Definition of Done:** Both commands run with no ImportError and print real version output.

---

## Phase 2 — Task Environment Setup

**Objective:** A working cooperative multi-agent environment with at least two distinct task variants.

**Tasks**
- [ ] Create `env.py`.
- [ ] Import `simple_spread_v3` from `pettingzoo.mpe`.
- [ ] Define at least two task configs that differ in a real way (agent count, landmark layout, or episode length).
- [ ] Write a smoke test that resets each environment and takes several random steps.

**Verification**
```bash
python env.py   # or however the smoke test is invoked
```
- [ ] `env.agents` returns the expected agent count for each task.
- [ ] `reset()` returns one observation per agent, no exception.
- [ ] 5 random steps run cleanly, rewards print as numbers.
- [ ] At least one config value genuinely differs between Task 1 and Task 2.

**Definition of Done:** Both environments reset/step without error, and the task difference is confirmed, not assumed.

---

## Phase 3 — Single-Task Baseline Training

**Objective:** Train an agent on Task 1 alone and establish a baseline score.

**Tasks**
- [ ] Create `agent.py` with a `SingleAgentWrapper` (per `prd.md` — independent learners, no shared policy).
- [ ] Add an `evaluate(model, env, episodes=20)` function returning mean reward.
- [ ] Train a PPO model on Task 1 for a fixed timestep budget (default: 50,000).
- [ ] Save the trained model.
- [ ] Evaluate both the trained model and a freshly-initialized (untrained) model for comparison.

**Verification**
- [ ] `model.learn()` completes with no NaN loss.
- [ ] Trained score clearly exceeds the untrained/random baseline.
- [ ] Model file exists on disk after saving.

**Definition of Done:** Trained score > random baseline by a clear, consistent margin; model file saves successfully.

---

## Phase 4 — Sequential Training & Forgetting Measurement

**Objective:** Continue training the same model on Task 2, then re-test on Task 1 to measure forgetting.

**Tasks**
- [ ] Record `score_before` (Task 1, right after Phase 3).
- [ ] Continue training the **same model object** on Task 2 (never a fresh model — this is load-bearing for the whole project).
- [ ] Record `score_after` (Task 1, post-Task-2-training).
- [ ] Record `score_task2` to confirm the new task was actually learned.
- [ ] Compute `forgetting_value = score_before - score_after` and log it.

**Verification**
- [ ] `score_task2` clearly exceeds a random-policy baseline on Task 2.
- [ ] `forgetting_value` is a clean number, no NaN or crash.
- [ ] If `forgetting_value` is ≤ 0, log it as-is — do not treat it as a bug or discard it.
- [ ] Re-run once with a different seed to confirm the direction of the result is consistent.

**Definition of Done:** `score_before`, `score_after`, and `score_task2` are all produced as clean numbers, regardless of the forgetting magnitude.

---

## Phase 5 — Memory-Saving Methods

**Objective:** Implement experience replay and regularization (per the constraints in `prd.md`), and validate both against Phase 4's baseline.

**Tasks**
- [ ] Create `memory.py`.
- [ ] Implement experience replay as periodic rehearsal bursts (not a stored replay buffer) — interleave short Task 1 retraining during Task 2 training.
- [ ] Implement regularization as shared/early-layer freezing after Task 1 training — not full EWC.
- [ ] Run the Phase 4 measurement loop under all four conditions: `none`, `experience_replay`, `regularization`, `both`.
- [ ] Log all four results into one shared results structure.

**Verification**
- [ ] All four conditions complete without error, using identical `evaluate()` code.
- [ ] Frozen-layer check: assert frozen parameters are bit-identical before and after further training. This must be a real assertion in code, not a comment claiming it works.
- [ ] A method is not required to outperform baseline to pass this phase — the requirement is clean, comparable numbers across all four conditions.

**Definition of Done:** All four conditions produce a complete result row, and the frozen-layer assertion passes.

---

## Phase 6 — Automated Testing & Reporting

**Objective:** Turn manual print statements into automatic logging and reporting.

**Tasks**
- [ ] Create `report.py`.
- [ ] Collect every run's results into a list of dicts (stage, task, method, score).
- [ ] Write results to `outputs/scores.csv` via pandas.
- [ ] Plot score vs. training stage, one line per task, via matplotlib.
- [ ] Save the plot to `outputs/forgetting_report.png`.

**Verification**
- [ ] `scores.csv` exists; row count matches the number of experiment conditions run.
- [ ] `forgetting_report.png` exists and is non-empty.
- [ ] Spot-check 2–3 CSV rows against console output from Phase 4/5 to confirm no logging bugs.

**Definition of Done:** Both output files exist with correct, verifiable contents.

---

## Phase 7 — Config File Integration

**Objective:** Move every hardcoded value into `config.yaml`.

**Tasks**
- [ ] Define the config schema: `agents`, `tasks` (list of `name`/`timesteps`), `memory_method`, `seed`.
- [ ] Write a config loader.
- [ ] Refactor the training script to read all settings from config — remove hardcoded values from Phases 3–6.

**Verification**
- [ ] Run once with hardcoded values (fixed seed), record results.
- [ ] Run again driven entirely by `config.yaml` with identical settings and seed; confirm results match exactly.
- [ ] Edit `memory_method` in the config, re-run, confirm behavior changes in the expected direction.

**Definition of Done:** Config-driven run reproduces the hardcoded run exactly, and editing the config measurably changes behavior.

---

## Phase 8 — End-to-End Pipeline Validation

**Objective:** The whole tool runs as a single command from a clean folder.

**Tasks**
- [ ] Create `main.py` tying together config loading, environment setup, sequential training, memory-saving methods, and reporting.
- [ ] Write `README.md` covering install and how to run.
- [ ] Delete all previous outputs and run from a clean folder.

**Verification**
```bash
python main.py --config config.yaml
```
- [ ] Completes with zero manual intervention.
- [ ] All expected output files exist afterward (`scores.csv`, `forgetting_report.png`, saved model files).
- [ ] A second person, using only the README, completes a run successfully without live help.

**Definition of Done:** Clean-room run succeeds with zero manual fixes; an independent second-person run also succeeds.

---

## Supplementary — LLM Validation Experiment

**Objective:** Confirm the forgetting/mitigation pattern holds on a real small pretrained language model. This is a separate script, not part of the main pipeline, and does not block Phases 1–8.

**Tasks**
- [ ] Create `llm_validation.py`.
- [ ] Install `transformers` and `trl` (only here, not in the main environment from Phase 1).
- [ ] Load a small pretrained model (e.g. `distilgpt2`) via `AutoModelForCausalLMWithValueHead`.
- [ ] Train via PPO (TRL's `PPOTrainer`) on one task, measure forgetting on a second task, reusing the evaluation logic from `agent.py` where feasible.

**Verification**
- [ ] Script runs to completion on a GPU (Colab or equivalent) without requiring changes to the main pipeline.
- [ ] Produces a forgetting measurement comparable in form (not necessarily magnitude) to the main pipeline's output.

**Definition of Done:** A forgetting value is produced for the real LLM, confirming or refuting whether the small-model pattern transfers.

---

## Appendix — Folder Structure Reference

```
ai-team-trainer/
|-- prd.md
|-- phases.md
|-- config.yaml
|-- main.py
|-- env.py
|-- agent.py
|-- memory.py
|-- report.py
|-- llm_validation.py
|-- README.md
|-- outputs/
    |-- scores.csv
    |-- forgetting_report.png
    |-- agent1_task1.zip
    |-- agent1_task2.zip
```

## Appendix — Common Failure Points

- **`pettingzoo[mpe]` import fails:** reinstall with quotes: `pip install "pettingzoo[mpe]"`.
- **Rewards always zero:** the action dict passed to `env.step()` must include every active agent, not just the learning agent.
- **Frozen-layer assertion fails:** confirm `requires_grad = False` is set *before* the next `model.learn()` call, and that the parameter-name filter actually matches the real layer names (print `model.policy.named_parameters()` to check).
- **Config-driven run doesn't match hardcoded run:** confirm the seed is set identically for numpy, torch, and the environment itself, not just one of the three.