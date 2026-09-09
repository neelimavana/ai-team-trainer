# Product Requirements Document — AI Team Trainer

**Parent project title:** Mitigating Catastrophic Forgetting in Multi-Agents using Reinforcement Learning for Large Language Models
**This deliverable:** Mini Project — AI Team Trainer

> Read this file in full before writing any code. It defines what to build and the hard constraints the implementation must respect. `phases.md` defines how to build it, one phase at a time. If anything in `phases.md` ever conflicts with this file, this file wins.

---

## 1. Overview

AI Team Trainer is a config-driven software tool that trains a small team of coordinating agents on a sequence of cooperative Reinforcement Learning (RL) tasks, automatically measures how much each agent forgets earlier tasks as it learns new ones (catastrophic forgetting), applies two mitigation techniques (experience replay and regularization), and reports the results. One supplementary experiment validates the same pattern on an actual small pretrained language model.

## 2. Problem Statement

Multi-agent systems built on Large Language Models are increasingly used for tasks requiring coordination between agents. When such agents are trained sequentially on new tasks using RL, they suffer catastrophic forgetting — losing previously learned task performance. In coordinating multi-agent systems, one agent forgetting its skills can also break the team's overall coordination, not just its own performance. There is no readily available, reusable tool to measure and mitigate this specifically for coordinating multi-agent systems.

## 3. Goals

- G1: Train 2–4 coordinating agents sequentially on 2–3 cooperative RL tasks.
- G2: Automatically measure forgetting (Backward Transfer) after each new task is learned.
- G3: Implement and compare experience replay and regularization against a no-mitigation baseline.
- G4: Validate the findings hold at LLM scale via one supplementary experiment on a real small pretrained language model.
- G5: Deliver a reusable, config-driven tool — not a one-off script — that automates training, measurement, and reporting.

## 4. Non-Goals (explicitly out of scope)

- Full-scale or commercial LLMs as the primary training subject.
- Real-world or physical agents/robots.
- Teams larger than 4 agents.
- Skill storage/reuse between tasks (reserved for the major project).
- A web dashboard, database, or multi-user system (reserved for the major project).
- Implementing full Elastic Weight Consolidation (EWC) — use the simplified layer-freezing proxy specified below.
- Any external/pre-collected dataset — training data is generated only through agent-environment interaction.

## 5. Success Criteria (Definition of Done for the whole project)

The project is complete when all of the following are true:

- [ ] A single command (`python main.py --config config.yaml`) runs the full pipeline end to end with no manual intervention.
- [ ] The tool trains 2–4 agents on 2–3 tasks sequentially and produces a forgetting measurement for every task at every stage.
- [ ] All four mitigation conditions (none, experience_replay, regularization, both) run and produce comparable results using identical evaluation code.
- [ ] Results are averaged across at least 3 random seeds, reported as mean ± standard deviation.
- [ ] `scores.csv` and `forgetting_report.png` are generated automatically after every run.
- [ ] The frozen-layer regularization check passes (frozen weights are provably unchanged after further training).
- [ ] One supplementary script trains a small pretrained LLM via PPO (TRL) and reproduces the same forgetting measurement on at least one task pair.
- [ ] A person other than the builder can clone the repo, follow only the README, and complete a run successfully.

## 6. Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | The system trains N agents (2–4, configurable) on M cooperative tasks (2–3, configurable) sequentially using PPO. |
| FR2 | After training each new task, the system evaluates agents on every previously-learned task. |
| FR3 | The system computes and logs Backward Transfer (`score_before − score_after`) per task, per stage, per condition. |
| FR4 | The system supports 4 mitigation modes, selected via config: `none`, `experience_replay`, `regularization`, `both`. |
| FR5 | Regularization is verified functionally — frozen parameters must be asserted identical before/after further training, not just assumed from code. |
| FR6 | The system writes all results to `scores.csv` and generates `forgetting_report.png` automatically, no manual plotting. |
| FR7 | All run parameters (agent count, task list, timesteps, method, seed) live in a single `config.yaml` — no hardcoded experiment values in code. |
| FR8 | The system supports running across multiple seeds and aggregating mean ± std automatically. |
| FR9 | A supplementary script trains a small pretrained LLM via PPO (Hugging Face TRL), separate from the main pipeline, reusing the same evaluation/forgetting logic where feasible. |
| FR10 | The full pipeline runs via one command with no code edits required between runs — only config edits. |

## 7. Non-Functional Requirements

- **Compute:** The main pipeline must run on CPU only. Do not introduce a hard GPU dependency anywhere in the main pipeline.
- **Reproducibility:** A fixed seed must produce identical results across two separate runs.
- **Runtime budget:** A full 4-condition × 3-seed sweep on 2 tasks should complete in a few hours on a typical laptop CPU. If a design choice would blow this budget significantly, flag it rather than silently proceeding.
- **Readability:** This is an academic deliverable that will be read and defended, not just run. Code must be reasonably documented — docstrings on non-trivial functions, no unexplained magic numbers.
- **Config validity:** Invalid config values (e.g., `memory_method: banana`) should fail loudly with a clear error, not silently do the wrong thing.

## 8. Technical Constraints

- **Agent architecture:** MLP policy, 2 hidden layers, 64 neurons each (~10,000–15,000 trainable parameters per agent). Do not scale this up without being explicitly told to.
- **Simulation environment:** PettingZoo MPE `simple_spread` (or a documented equivalent cooperative task). Different "tasks" are created by varying agent count / landmark configuration, not by switching environment families, unless instructed otherwise.
- **No external datasets.** All training data comes from agent-environment interaction. Do not add a data-loading module for a static dataset.
- **Regularization method:** Layer freezing on shared/early network layers, not full EWC (no Fisher information matrix computation).
- **Replay method:** Rehearsal-style — periodic short retraining bursts on earlier tasks — not a full replay buffer with prioritized sampling.
- **Independent learners:** Each agent trains its own separate policy network. No shared/centralized policy across agents unless explicitly instructed.

## 9. Tech Stack

- Python 3.9+
- PyTorch (CPU build for the main pipeline)
- Stable-Baselines3 (PPO)
- PettingZoo `[mpe]`
- Gymnasium
- Matplotlib
- pandas
- PyYAML
- Hugging Face `transformers` + `trl` (supplementary LLM experiment only — not a main-pipeline dependency)

## 10. Repository Structure

```
ai-team-trainer/
|-- prd.md
|-- phases.md
|-- config.yaml
|-- main.py
|-- env.py            # task environment + single-agent wrapper
|-- agent.py           # agent setup + training helpers
|-- memory.py          # experience replay + regularization logic
|-- report.py           # CSV + graph generation
|-- llm_validation.py    # supplementary TRL/PPO experiment (separate entry point)
|-- README.md
|-- outputs/
    |-- scores.csv
    |-- forgetting_report.png
    |-- agent1_task1.zip
    |-- agent1_task2.zip
```

## 11. Metrics

- **Task score:** mean episodic reward over 20 evaluation episodes.
- **Forgetting score (Backward Transfer):** `score_before − score_after` for a given task, measured immediately after that task is learned vs. after a later task is learned.
- **Team-level success rate:** whether the cooperative goal is completed (e.g., landmarks covered), tracked separately from raw reward to isolate coordination breakdown from individual skill loss.
- All metrics reported as **mean ± standard deviation across ≥3 seeds**, never a single run.

## 12. Deliverables

1. Working codebase matching the repository structure above.
2. An example `config.yaml`.
3. Sample output artifacts: `scores.csv`, `forgetting_report.png`.
4. `README.md` covering install, config, and how to run.
5. `llm_validation.py` and its own small results summary (supplementary experiment).

## 13. Glossary

- **Catastrophic forgetting** — loss of previously learned task performance after training on a new task.
- **Backward Transfer (BWT)** — the standard continual-learning metric: performance on an old task after training on a new one, relative to performance right after the old task was learned.
- **Experience replay** — periodically retraining on older task data to prevent it being overwritten.
- **Regularization (here: layer freezing)** — locking certain network weights so later training cannot change them.
- **Baseline** — the same pipeline run with no mitigation method applied, used as the comparison point.
- **PPO (Proximal Policy Optimization)** — the RL algorithm used to train every agent.
- **Sequential training** — training on Task 1 to completion, then Task 2, then Task 3 — never jointly.