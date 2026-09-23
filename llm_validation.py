"""Supplementary experiment: validate the forgetting pattern on a real LLM.

Separate from the main pipeline (PRD FR9). Trains a small pretrained language
model (distilgpt2) via TRL's PPOTrainer on one task, then measures how much
its performance on an earlier task degrades — the same Backward Transfer
metric used by ``agent.py``/``memory.py``, redefined here for token-sequence
reward instead of episodic RL reward since there is no shared environment
between the RL and LLM settings.

Requires ``transformers`` and ``trl``, intentionally not part of the main
Phase-1 environment. Intended to run on a GPU (e.g. Colab):

    uv run --with transformers --with trl python llm_validation.py

Task 1: reward completions for containing "positive"-associated words.
Task 2: reward completions for containing digits.
Both tasks share the same prompt set and reward-scoring shape as
``agent.py.evaluate`` (mean score over N eval prompts), so results are
directly comparable in form to the main pipeline's CSV rows.
"""

from __future__ import annotations

from dataclasses import dataclass

MODEL_NAME = "distilgpt2"
EVAL_PROMPTS = [
    "The weather today is",
    "My favorite thing about this project is",
    "In the future, technology will",
    "The most important lesson I learned was",
]
POSITIVE_WORDS = ("good", "great", "happy", "love", "best", "wonderful", "amazing")


@dataclass
class LLMTaskResult:
    stage: str
    task: str
    score: float
    forgetting: float | None = None


def score_positive_words(text: str) -> float:
    """Task 1 reward: fraction of positive-sentiment words in the completion."""
    words = text.lower().split()
    if not words:
        return 0.0
    return sum(w.strip(".,!?") in POSITIVE_WORDS for w in words) / len(words)


def score_digits(text: str) -> float:
    """Task 2 reward: fraction of characters that are digits."""
    if not text:
        return 0.0
    return sum(c.isdigit() for c in text) / len(text)


def evaluate_llm(model, tokenizer, score_fn, prompts=EVAL_PROMPTS) -> float:
    """Mirror of ``agent.evaluate``: mean reward over a fixed prompt set."""
    import torch

    scores = []
    for prompt in prompts:
        inputs = tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            out = model.generate(
                **inputs, max_new_tokens=20, do_sample=True, pad_token_id=tokenizer.eos_token_id
            )
        completion = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        scores.append(score_fn(completion))
    return sum(scores) / len(scores)


def train_ppo_round(trainer, tokenizer, prompts, score_fn, steps: int = 20):
    """Run a small number of PPO update steps rewarding ``score_fn``."""
    import torch

    for _ in range(steps):
        prompt = prompts[_ % len(prompts)]
        query_tensor = tokenizer(prompt, return_tensors="pt").input_ids[0]
        response_tensor = trainer.generate(
            query_tensor, max_new_tokens=20, do_sample=True, pad_token_id=tokenizer.eos_token_id
        )
        response_text = tokenizer.decode(response_tensor[len(query_tensor):], skip_special_tokens=True)
        reward = torch.tensor(score_fn(response_text))
        trainer.step([query_tensor], [response_tensor[len(query_tensor):]], [reward])


def main() -> int:
    from transformers import AutoTokenizer
    from trl import AutoModelForCausalLMWithValueHead, PPOConfig, PPOTrainer

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLMWithValueHead.from_pretrained(MODEL_NAME)

    config = PPOConfig(batch_size=1, mini_batch_size=1)
    trainer = PPOTrainer(config, model, ref_model=None, tokenizer=tokenizer)

    print("Training on Task 1 (positive-word reward)...")
    train_ppo_round(trainer, tokenizer, EVAL_PROMPTS, score_positive_words)
    score_before = evaluate_llm(model, tokenizer, score_positive_words)
    print(f"score_before (Task 1): {score_before:.4f}")

    print("Training on Task 2 (digit-density reward)...")
    train_ppo_round(trainer, tokenizer, EVAL_PROMPTS, score_digits)
    score_after = evaluate_llm(model, tokenizer, score_positive_words)
    score_task2 = evaluate_llm(model, tokenizer, score_digits)

    forgetting = score_before - score_after
    print(f"score_after  (Task 1, post-task2): {score_after:.4f}")
    print(f"score_task2  (Task 2, post-task2): {score_task2:.4f}")
    print(f"forgetting (score_before - score_after) = {forgetting:+.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
