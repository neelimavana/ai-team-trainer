# AI Team Trainer

Config-driven tool that trains a team of independent-learner RL agents
sequentially on two cooperative multi-agent tasks, measures catastrophic
forgetting (Backward Transfer), and compares two mitigation methods
(experience replay and regularization) against a no-mitigation baseline.

Runs entirely on CPU. See `docs/PRD.md` for the full requirements and
`docs/Phases.md` for how the project was built phase by phase.

## Install

Requires Python 3.11 and [uv](https://docs.astral.sh/uv/).

```bash
uv sync
```

This installs the CPU build of PyTorch plus `gymnasium`, `pettingzoo[mpe]`,
`stable-baselines3`, `matplotlib`, `pandas`, and `pyyaml`.

## Run

```bash
uv run python main.py --config config.yaml
```

This is the only command needed. It reads `config.yaml`, trains each agent
sequentially on Task 1 then Task 2 under all four mitigation modes
(`none`, `experience_replay`, `regularization`, `both`) across every
configured seed, measures forgetting, and writes:

- `outputs/scores.csv` — one row per (stage, task, method, seed)
- `outputs/forgetting_report.png` — score vs. training stage, mean ± std
  across seeds, one line per task/method

Edit `config.yaml` to change agent count, tasks, timesteps, mitigation
method, episodes, or seeds — no code changes are needed between runs.

## Project layout

| File | Purpose |
|---|---|
| `config.py` / `config.yaml` | Config schema + loader (Phase 7) |
| `env.py` | Cooperative task environments (PettingZoo MPE `simple_spread`) |
| `agent.py` | Independent-learner PPO wrapper + evaluation |
| `memory.py` | Experience replay (rehearsal bursts) + regularization (layer freezing) |
| `report.py` | CSV logging + forgetting plot |
| `main.py` | Single-command pipeline entry point (Phase 8) |
| `docs/` | PRD, ADRs, phase plan, architecture notes |
| `paper/` | Research paper (Word) + diagrams |
| `website/` | Research explainer site (Next.js) |

## Supplementary: LLM validation

`llm_validation.py` (separate from the main pipeline) validates the same
forgetting pattern on a small pretrained language model
(`distilgpt2` via TRL `PPOTrainer`). It requires `transformers`/`trl`
(not installed by `uv sync`) and is intended to run on a GPU (e.g. Colab):

```bash
uv run --with transformers --with trl python llm_validation.py
```

## Website

The `website/` directory is a standalone Next.js app; see
`website/README.md` for its own setup instructions.
