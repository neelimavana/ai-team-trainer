# AI Team Trainer — Explained Simply

## What problem are we solving?

Imagine you teach a robot to play soccer. It gets good at it.
Then you teach the same robot to play basketball.
Problem: after learning basketball, the robot forgets how to play soccer.

This is called **"catastrophic forgetting"** — AI agents lose old skills
when they learn new ones. It gets worse with a *team* of agents, because
if one forgets, the whole team's teamwork breaks.

## What does this project do?

It's a tool that:
1. Trains a small team of AI agents on **Task 1** (a game).
2. Then trains the same team on **Task 2** (a similar but different game).
3. Tests them on Task 1 again to see **how much they forgot**.
4. Tries two fixes and checks if the fixes actually help:
   - **Replay** — every so often during Task 2 training, quickly remind
     the agents of Task 1 (like flashcards / revision).
   - **Freezing** — lock the early "core skills" part of the brain so
     it can't be overwritten, only the later "fine details" part changes.
5. Reports the results as a table and a graph.

## The "game" they play

A cooperative game called `simple_spread`: a few agents must each cover
a different landmark/spot on a map without bumping into each other.
Task 1 and Task 2 are two versions of this game (different agent count /
landmark spacing), so it's genuinely a different skill, not just a repeat.

## The 4 things we compare

| Method | What it does |
|---|---|
| `none` | Just train normally, no fix — this is the baseline |
| `experience_replay` | Sprinkle in Task 1 practice while learning Task 2 |
| `regularization` | Freeze the "core" of the brain after Task 1 |
| `both` | Do both fixes together |

## How we measure "forgetting"

```
forgetting = (score on Task 1 right after learning it)
           − (score on Task 1 after also learning Task 2)
```

Bigger number = forgot more. Negative number = actually got a little
better (rare, but possible, and we report it honestly either way).

## What comes out at the end

- `outputs/scores.csv` — a spreadsheet of every score, every method,
  every seed (we repeat 3 times with different random luck to be fair).
- `outputs/forgetting_report.png` — a chart: score over time, one line
  per method, so you can see visually which fix works best.

## Bonus experiment

We also try the same idea on a real (tiny) language model — does it
forget old behavior after learning something new? Same before/after/
forgetting idea, just on text instead of a game.

## One-line summary

**"Teach it something new, check how much it forgot from before,
and see if two simple tricks (revision and locking) reduce the damage."**
