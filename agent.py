"""Agent policies, training helpers and evaluation for the AI Team Trainer.

Every agent owns an independent policy network (PRD: independent learners, no
shared/centralized policy). Training happens through a :class:`SingleAgentWrapper`
that exposes the multi-agent parallel environment as a single-agent gymnasium
Environ for exactly one *learning* agent; the other agents act through their
own (frozen) policies or random actions.

The module deliberately has no hardcoded experiment values — timesteps, seeds
and task choice come from callers (and later from ``config.yaml``).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import gymnasium
import numpy as np
from stable_baselines3 import PPO

from env import TaskConfig, make_env, set_global_seed, team_success

#: Extra policy architecture: two hidden layers, 64 neurons each (PRD).
POLICY_NET_ARCH = [64, 64]
#: All training/evaluation is CPU-only (PRD NFR).
DEVICE = "cpu"
#: Expected per-agent trainable parameter bracket (~10-15k per PRD).
_PARAM_LOW, _PARAM_HIGH = 9_000, 16_000


@dataclass
class EvaluationResult:
    """Aggregated result of evaluating a team of policies."""

    episodes: int
    mean_reward: float
    per_agent: dict[str, float]
    team_success: float
    per_agent_episode_rewards: dict[str, list[float]] = field(default_factory=dict)


def model_to_actor(model: PPO):
    """Wrap an SB3 model as a callable ``obs -> action`` (deterministic)."""
    return lambda obs: int(model.predict(obs, deterministic=True)[0])


def random_actor(env, agent_name: str):
    """Callable actor sampling uniformly from an agent's action space."""
    space = env.action_space(agent_name)
    return lambda obs: int(space.sample())


class SingleAgentWrapper(gymnasium.Env):
    """Expose one agent of a multi-agent parallel env to a single-agent trainer.

    The wrapper implements the gymnasium Env protocol consumed by SB3. It
    steps *all* agents on every ``step()``:

    - the learning agent uses the action supplied by the trainer, and
    - every other agent follows its frozen teammate policy (if provided) or
      takes random actions.

    Attributes:
        agent: Name of the wrapped (learning) agent, e.g. ``"agent_0"``.
        observation_space / action_space: Spaces of the learning agent, so a
            single-agent policy can be built directly.
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        env,
        agent_name: str,
        teammate_policies: dict | None = None,
        seed: int = 0,
    ) -> None:
        super().__init__()
        self._env = env
        self.agent = agent_name
        self._teammates = teammate_policies if teammate_policies is not None else {}
        self.observation_space = env.observation_space(agent_name)
        self.action_space = env.action_space(agent_name)
        self._seed = seed
        self._episode = 0
        self._agents: list[str] = []
        self._last_obs: dict = {}

    def reset(self, *, seed: int | None = None, options: dict | None = None):
        """Reset the team and return ``(obs, info)`` for the learning agent.

        Each episode advances an internal seed counter so the trajectory of
        initial states is reproducible but not identical across episodes.
        """
        obs_dict, _ = self._env.reset(
            seed=(seed if seed is not None else self._seed) + self._episode
        )
        self._episode += 1
        self._agents = list(self._env.agents)
        self._last_obs = {a: obs_dict[a] for a in self._agents}
        return self._last_obs[self.agent], {}

    def step(self, action):
        """Advance the whole team one frame for the given agent action."""
        actions: dict = {}
        for name in self._agents:
            if name == self.agent:
                actions[name] = action
            elif name in self._teammates:
                actions[name] = self._teammates[name](self._last_obs[name])
            else:
                actions[name] = int(self._env.action_space(name).sample())

        obs_dict, rewards, terminated, truncated, infos = self._env.step(actions)
        self._last_obs = obs_dict
        return (
            obs_dict[self.agent],
            float(rewards[self.agent]),
            bool(terminated[self.agent]),
            bool(truncated[self.agent]),
            infos[self.agent],
        )

    def close(self) -> None:
        self._env.close()

    @property
    def unwrapped(self):
        return self._env.unwrapped


def create_ppo(obs_dim: int, action_dim: int, seed: int) -> PPO:
    """Create an untrained PPO policy with the PRD MLP architecture.

    The policy is returned *untrained* so callers control exactly when
    learning starts (used both for training and as the random baseline).
    """
    if obs_dim <= 0 or action_dim <= 0:
        raise ValueError(f"Invalid spaces: obs={obs_dim}, action={action_dim}")
    from gymnasium.spaces import Box, Discrete

    env = _ProbeEnv(Box(low=-np.inf, high=np.inf, shape=(obs_dim,)), Discrete(action_dim))
    model = PPO(
        "MlpPolicy",
        env,
        policy_kwargs={"net_arch": POLICY_NET_ARCH},
        seed=seed,
        device=DEVICE,
        verbose=0,
        # Keep defaults explicit rather than magic: this is the classic PPO set.
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,
    )
    n_params = count_parameters(model)
    if not _PARAM_LOW <= n_params <= _PARAM_HIGH:
        raise AssertionError(
            f"Policy has {n_params} trainable parameters; PRD requires "
            f"{_PARAM_LOW}-{_PARAM_HIGH} (2x64 MLP)."
        )
    return model


class _ProbeEnv(gymnasium.Env):
    """Gym-environment stand-in so PPO can be constructed without a live env.

    SB3 only inspects the env's spaces at construction time; nothing ever
    steps this env.
    """

    metadata = {"render_modes": []}

    def __init__(self, obs_space, act_space):
        super().__init__()
        self.observation_space = obs_space
        self.action_space = act_space


def count_parameters(model: PPO) -> int:
    """Total number of trainable parameters across the policy+value nets."""
    return int(sum(p.numel() for p in model.policy.parameters() if p.requires_grad))


def _assert_finite_policy(model: PPO) -> None:
    """Fail loudly unless every policy parameter is finite (NaN guard)."""
    for name, p in model.policy.named_parameters():
        if not np.all(np.isfinite(p.detach().cpu().numpy())):
            raise ValueError(f"Non-finite parameter detected in policy: {name}")


def train_agent(
    cfg: TaskConfig,
    agent_index: int,
    timesteps: int,
    seed: int,
    teammate_policies: dict | None = None,
    model: PPO | None = None,
) -> PPO:
    """Train one agent's policy on ``cfg`` and return the trained model.

    Args:
        cfg: Task to train on.
        agent_index: Index of the agent (0-based) whose policy is trained.
        timesteps: Total number of training timesteps for this policy.
        seed: RNG seed; the environment seed block for this call.
        teammate_policies: Frozen policies for the other agents, keyed by
            agent name, used when the trainer steps the environment.
        model: Existing policy to continue training on (required by Phase 4's
            same-model sequential constraint); a fresh one is created if None.
    """
    env = make_env(cfg)
    agent_name = f"agent_{agent_index}"
    wrapper = SingleAgentWrapper(env, agent_name, teammate_policies, seed=seed)

    if model is None:
        model = create_ppo(
            int(wrapper.observation_space.shape[0]),
            int(wrapper.action_space.n),
            seed=seed,
        )
    # create_ppo builds against a probe env (spaces only); bind the real
    # multi-agent wrapper before learning.
    model.set_env(wrapper)
    model.learn(total_timesteps=timesteps, progress_bar=False)
    _assert_finite_policy(model)
    wrapper.close()
    return model


def _frozen_teammates(
    cfg: TaskConfig, models: list[PPO | None]
) -> dict[str, object]:
    """Build ``{agent_name: actor}`` for every agent with a trained model.

    Agents whose model is ``None`` (untrained) are omitted so the wrapper
    drives them with random actions instead.
    """
    policies: dict[str, object] = {}
    for i, model in enumerate(models):
        if model is not None:
            policies[f"agent_{i}"] = model_to_actor(model)
    return policies


def train_team(
    cfg: TaskConfig,
    timesteps: int,
    seed: int,
    rounds: int = 5,
) -> list[PPO]:
    """Train a whole team of independent policies on ``cfg``.

    The team is trained in alternating rounds (independent learners): each
    round, agent ``i`` trains for ``timesteps / rounds`` steps while the other
    agents act through their current, frozen policies. This co-adaptation is
    what lets a coordinated policy emerge from the cooperative environment.

    Args:
        cfg: Task to train on.
        timesteps: Total timesteps budget **per agent**.
        seed: Base RNG seed; each (agent, round) gets a distinct sub-seed so
            training is reproducible but not degenerate.
        rounds: Number of alternating training rounds.

    Returns:
        List of one trained PPO model per agent (index-aligned).
    """
    if rounds < 1:
        raise ValueError("rounds must be >= 1")
    per_round = max(1, timesteps // rounds)

    models = [None] * cfg.num_agents
    for r in range(rounds):
        for i in range(cfg.num_agents):
            env_seed = seed * 1_000 + r * 100 + i
            assert env_seed < 2**32
            teammates = _frozen_teammates(cfg, models)
            models[i] = train_agent(
                cfg,
                agent_index=i,
                timesteps=per_round,
                seed=env_seed,
                teammate_policies=teammates,
                model=models[i],
            )
    return models


def evaluate(
    policies: dict | None,
    cfg: TaskConfig,
    episodes: int = 20,
    seed: int = 0,
) -> EvaluationResult:
    """Evaluate a team of policies on ``cfg`` and aggregate metrics.

    Args:
        policies: Mapping ``agent_name -> callable(obs) -> action``. Agents
            without an entry act randomly, which also serves as the untrained
            baseline.
        cfg: Task to evaluate on.
        episodes: Number of evaluation episodes (PRD: mean over 20).
        seed: Base seed; each episode gets a distinct reproducible seed.
    """
    env = make_env(cfg)
    agent_names = [f"agent_{i}" for i in range(cfg.num_agents)]
    policies = policies if policies is not None else {}

    rewards: dict[str, list[float]] = {a: [] for a in agent_names}
    coverage: list[float] = []

    for ep in range(episodes):
        obs_dict, _ = env.reset(seed=seed + ep)
        per_agent = {a: 0.0 for a in agent_names}
        best_cover = 0.0
        done = False
        while not done:
            actions = {}
            for name in agent_names:
                actor = policies.get(name)
                actions[name] = actor(obs_dict[name]) if actor else int(
                    env.action_space(name).sample()
                )
            obs_dict, rew, term, trunc, _ = env.step(actions)
            for name in agent_names:
                per_agent[name] += float(rew[name])
            cover = team_success(env)
            best_cover = max(best_cover, cover)
            done = any(term[a] or trunc[a] for a in agent_names)
        coverage.append(best_cover)
        for name in agent_names:
            rewards[name].append(per_agent[name])

    per_agent_mean = {a: float(np.mean(rewards[a])) for a in agent_names}
    return EvaluationResult(
        episodes=episodes,
        mean_reward=float(np.mean(list(per_agent_mean.values()))),
        per_agent=per_agent_mean,
        team_success=float(np.mean(coverage)),
        per_agent_episode_rewards=rewards,
    )


def save_model(model: PPO, path: str) -> None:
    """Persist an SB3 model, creating parent directories as needed.

    SB3 appends the ``.zip`` extension to ``path``; this helper documents that
    contract and verifies the file actually landed on disk.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    model.save(path)
    artifact = path + ".zip"
    if not os.path.exists(artifact):
        raise OSError(f"Model file was not created: {artifact}")


def _phase3_main() -> int:
    """Phase 3 verification: train the Task 1 team baseline vs random."""
    from env import TASK_CONFIGS

    cfg = TASK_CONFIGS["spread_3a_50c"]
    seed = 0
    timesteps = 50_000
    rounds = 5
    print("=" * 62)
    print(f"Phase 3 — single-task baseline training on {cfg.name}")
    print("=" * 62)
    print("Seeding all global RNGs...")
    set_global_seed(seed)

    import time

    t0 = time.time()
    print(f"Training team of {cfg.num_agents} agents "
          f"({timesteps} timesteps x {cfg.num_agents}, {rounds} rounds, seed {seed})...")
    models = train_team(cfg, timesteps=timesteps, seed=seed, rounds=rounds)
    print(f"Team trained in {time.time() - t0:.1f}s")
    for i, model in enumerate(models):
        print(f"agent_{i}: {count_parameters(model)} trainable parameters")
        _assert_finite_policy(model)
    print("Finite-policy check passed (no NaN/Inf parameters).")

    for i, model in enumerate(models):
        save_model(model, f"outputs/agent_{i}_{cfg.name}")
    print("Saved outputs/agent_{0,1,2}_spread_3a_50c.zip")

    trained = _frozen_teammates(cfg, models)
    result_trained = evaluate(trained, cfg, episodes=20)
    result_random = evaluate(None, cfg, episodes=20)
    print(f"\nMean episodic reward (trained team): {result_trained.mean_reward:+.4f}"
          f"  team_success={result_trained.team_success:.3f}")
    print(f"Mean episodic reward (random team):  {result_random.mean_reward:+.4f}"
          f"  team_success={result_random.team_success:.3f}")

    if not np.isfinite(result_trained.mean_reward):
        print("FAIL: trained score is not finite")
        return 1
    if result_trained.mean_reward <= result_random.mean_reward:
        print("FAIL: trained score does not clearly exceed the random baseline")
        return 1
    print(f"PASS: trained > random by "
          f"{result_trained.mean_reward - result_random.mean_reward:+.4f}")
    print("PHASE 3 PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(_phase3_main())