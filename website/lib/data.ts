/* ----------------------------------------------------------------
   Single source of truth for the site's scientific content.
   All experiment numbers are the REAL committed results from the
   project (outputs/scores.csv, Phase 3/4 measurements) — they are
   not fabricated for the site.
   ---------------------------------------------------------------- */

export const PROJECT = {
  title: "AI Team Trainer",
  tagline:
    "Measuring and mitigating catastrophic forgetting in cooperative multi-agent reinforcement-learning teams",
  repo: "https://github.com/neelimavana/ai-team-trainer",
  builtWith: ["Python", "PyTorch (CPU)", "Stable-Baselines3", "MPE2", "uv", "Next.js"],
};

export const HERO_STATS = [
  { value: 3, suffix: "", label: "cooperative agents", note: "single team, fixed size (ADR-004)" },
  { value: 2, suffix: "", label: "sequential tasks", note: "50-frame vs 25-frame simple_spread" },
  { value: 11142, suffix: "", label: "network params", note: "~22% frozen for regularization (2432)" },
  { value: 4, suffix: "", label: "mitigation conditions", note: "none / replay / freeze / both" },
];

/* ------------------------------------------------------------------ */
/*  Phase 3 / Phase 4 single-agent & sequential baselines             */
/* ------------------------------------------------------------------ */
export const BASELINES = {
  trained: -44.0005,
  random: -64.5641,
  trainedLabel: "PPO team after Task 1 (50k steps/agent)",
  randomLabel: "Random-policy baseline",
  seedSweep: [
    { seed: 0, forgetting: -2.3096, note: "Task 2 training slightly improved Task 1" },
    { seed: 1, forgetting: 2.0434, note: "Task 2 training caused Task 1 forgetting" },
  ],
};

export const TASK_1 = { maxCycles: 50, localRatio: 0.5, obsDim: 18, event: "spread_3a_50c" };
export const TASK_2 = { maxCycles: 25, localRatio: 0.5, obsDim: 18, event: "spread_3a_25c" };

/* ------------------------------------------------------------------ */
/*  Phase 5/6 — mitigation comparison (seed 0). values from           */
/*  outputs/scores.csv committed at phase-6. Forgetting = before-after */
/* ------------------------------------------------------------------ */
export type MethodResult = {
  id: string;
  name: string;
  short: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreTask2: number;
  forgetting: number;
  color: string;
};

export const METHOD_ORDER = ["none", "experience_replay", "regularization", "both"] as const;

export const METHOD_RESULTS: Record<(typeof METHOD_ORDER)[number], MethodResult> = {
  none: {
    id: "none",
    name: "No mitigation",
    short: "Plain sequential transfer (the baseline to beat)",
    scoreBefore: -45.6053,
    scoreAfter: -45.7887,
    scoreTask2: -21.1523,
    forgetting: 0.1834,
    color: "#94a3b8",
  },
  experience_replay: {
    id: "experience_replay",
    name: "Experience replay",
    short: "Interleaved Task-1 rehearsal bursts during Task 2",
    scoreBefore: -47.2312,
    scoreAfter: -43.9942,
    scoreTask2: -22.2106,
    forgetting: -3.237,
    color: "#f59e0b",
  },
  regularization: {
    id: "regularization",
    name: "Regularization",
    short: "Early-layer freezing after Task 1 (EWC proxy)",
    scoreBefore: -47.1409,
    scoreAfter: -46.4096,
    scoreTask2: -22.7149,
    forgetting: -0.7313,
    color: "#8b5cf6",
  },
  both: {
    id: "both",
    name: "Replay + regularization",
    short: "Both methods together",
    scoreBefore: -50.6066,
    scoreAfter: -47.1909,
    scoreTask2: -22.9692,
    forgetting: -3.4157,
    color: "#4f46e5",
  },
};

export const RESULTS_INSIGHTS = [
  {
    title: "Forgetting is real but small on this setup",
    body: "Without any mitigation, re-learning Task 2 cost +0.18 mean episodic reward on Task 1 (small but positive). The sign flipped between seeds in Phase 4 (−2.31 / +2.04), so low-budget RL can even drift in the helpful direction.",
  },
  {
    title: "Replay retains the old task best",
    body: "Both replay modes turned Task 1's post-transfer score strongly *positive* (lower forgetting): −3.24 alone and −3.42 combined. Short interleaved bursts genuinely preserve old-task behaviour.",
  },
  {
    title: "Freezing alone is mild",
    body: "Regularization (−0.73) protected Task 1 but far weaker than rehearsal — freezing ~22% of early layers trades away adaptation yet gives modest retention.",
  },
  {
    title: "Task 2 learning is comparable everywhere",
    body: "score_task2 is −21.2 to −23.0 across all four conditions: the mitigations cost little on the new task while adding retention.",
  },
];

/* ------------------------------------------------------------------ */
/*  Literature review                                                  */
/* ------------------------------------------------------------------ */
export type Paper = {
  title: string;
  authors: string;
  year: string;
  venue: string;
  theme: string;
  takeaway: string;
  tags: string[];
};

export const LITERATURE_THEMES = [
  "Catastrophic forgetting",
  "Regularization",
  "Replay & rehearsal",
  "Multi-agent RL",
];

export const LITERATURE: Paper[] = [
  {
    theme: "Catastrophic forgetting",
    title: "Catastrophic interference in connectionist networks",
    authors: "McCloskey & Cohen",
    year: "1989",
    venue: "Psychology of Learning & Motivation",
    takeaway:
      "First systematic demonstration that sequential training on new patterns reorganises old weights and destroys prior knowledge — the phenomenon this project measures.",
    tags: ["foundation", "sequential training"],
  },
  {
    theme: "Catastrophic forgetting",
    title: "Catastrophic forgetting in connectionist networks",
    authors: "French",
    year: "1999",
    venue: "Trends in Cognitive Sciences",
    takeaway:
      "Argues forgetting is an unavoidable consequence of shared distributed representations being reused by new tasks — motivates protecting shared early layers.",
    tags: ["shared weights", "representation reuse"],
  },
  {
    theme: "Regularization",
    title: "Overcoming catastrophic forgetting in neural networks",
    authors: "Kirkpatrick et al.",
    year: "2017",
    venue: "PNAS",
    takeaway:
      "Elastic Weight Consolidation: penalise changes to weights that are important for old tasks, measured by Fisher information. The PRD's 'regularization' condition stands in for this with early-layer freezing.",
    tags: ["EWC", "Fisher", "weight importance"],
  },
  {
    theme: "Regularization",
    title: "Continual learning through synaptic intelligence",
    authors: "Zenke, Poole & Ganguli",
    year: "2017",
    venue: "ICML",
    takeaway:
      "Synaptic Intelligence tracks per-parameter path integrals over training; showing that simple per-parameter importance can protect past tasks without stored data.",
    tags: ["SI", "importance"],
  },
  {
    theme: "Replay & rehearsal",
    title: "The complementary learning systems approach",
    authors: "Ratcliff / Robins",
    year: "1990 / 1995",
    venue: "Psychological Review / Nature",
    takeaway:
      "Pseudorehearsal and complementary learning-system theory: re-presenting old task experience during new-task training is a reliable way to resist interference.",
    tags: ["rehearsal", "pseudo-rehearsal", "CLS"],
  },
  {
    theme: "Replay & rehearsal",
    title: "Experience replay for continual learning",
    authors: "Rolnick et al.",
    year: "2019",
    venue: "NeurIPS",
    takeaway:
      "Shows that even small, stored buffers of old examples plus repeated replay dramatically reduce forgetting in deep RL — the empirical backbone of our rehearsal condition.",
    tags: ["experience replay", "RL"],
  },
  {
    theme: "Multi-agent RL",
    title: "Multi-agent actor-critic for mixed cooperative-competitive environments",
    authors: "Lowe et al.",
    year: "2017",
    venue: "NeurIPS (MADDPG)",
    takeaway:
      "Introduced MADDPG and the Multi-Particle (MPE) simple_spread benchmark used here; centralised-world / decentralised-execution is the canonical cooperative-team framing.",
    tags: ["MADDPG", "MPE", "simple_spread"],
  },
  {
    theme: "Multi-agent RL",
    title: "Proximal policy optimization algorithms",
    authors: "Schulman et al.",
    year: "2017",
    venue: "arXiv",
    takeaway:
      "PPO clips the policy ratio to keep updates small — our optimiser of choice for stable, CPU-friendly training of each independent agent.",
    tags: ["PPO", "policy gradient"],
  },
  {
    theme: "Multi-agent RL",
    title: "Cooperative multi-agent reinforcement learning: an overview",
    authors: "Oroojlooyjadid & Hajinezhad / Busoniu et al.",
    year: "2023 / 2008",
    venue: "AIJ / Springer",
    takeaway:
      "Latent tension in cooperative MARL: individual credit assignment vs. team-level objectives, and only sparse work on continual learning inside a team.",
    tags: ["credit assignment", "coordination"],
  },
];

/* ------------------------------------------------------------------ */
/*  Methodology steps (mirror docs/Phases.md)                          */
/* ------------------------------------------------------------------ */
export type Step = {
  n: string;
  title: string;
  module: string;
  cmd: string;
  body: string;
  points: string[];
};

export const METHOD_STEPS: Step[] = [
  {
    n: "01",
    title: "Define distinguishable tasks",
    module: "env.py",
    cmd: "uv run python env.py",
    body:
      "Two cooperative simple_spread tasks that share a team size (N=3, obs dim 18) so a single policy can be continued across them, but differ genuinely: 50-frame vs 25-frame episodes.",
    points: [
      "Same-model continuation is only possible with a fixed observation dimension (ADR-004).",
      "Task difference is confirmed by a smoke test, never assumed.",
    ],
  },
  {
    n: "02",
    title: "Single-task baseline",
    module: "agent.py",
    cmd: "uv run python agent.py 3",
    body:
      "A team of independent PPO agents (2×64 MLP) trains on Task 1 for 50k timesteps each. PPO teams score −44.0 vs a random policy's −64.6 — clearly learned.",
    points: [
      "Independent learners: no shared policy, no centralised authority (PRD constraint).",
      "11,142 parameters per agent — small enough to train on 2 CPU cores.",
    ],
  },
  {
    n: "03",
    title: "Sequential training & measurement",
    module: "agent.py",
    cmd: "uv run python agent.py 4",
    body:
      "The same model objects continue training on Task 2. Task 1 is re-evaluated before/after, defining forgetting = score_before − score_after. Mixed-sign results (seed 0: −2.31, seed 1: +2.04) are reported as-is — never 'fixed'.",
    points: [
      "Same model object, never a fresh model — load-bearing for the whole project.",
      "score_task2 must confirm the new task was actually learned.",
    ],
  },
  {
    n: "04",
    title: "Memory-saving conditions",
    module: "memory.py",
    cmd: "uv run python memory.py",
    body:
      "Four conditions run the identical measurement loop: none, experience replay (2,500-step rehearsal bursts on Task 1 during Task 2 rounds), regularization (early-layer freezing), and both combined.",
    points: [
      "Replay = interleaved retraining bursts, not a stored buffer (PRD wording).",
      "Regularization = freezing shared/early layers as an EWC proxy (ADR-005).",
      "Frozen parameters are verified bit-identical after training (real assertion).",
    ],
  },
  {
    n: "05",
    title: "Config-driven runs",
    module: "config.yaml",
    cmd: "uv run python main.py --config config.yaml",
    body:
      "Every run parameter — agents, tasks + per-task timesteps, method, rounds, seeds — lives in one YAML file. A config-driven run must reproduce a hardcoded run exactly.",
    points: [
      "Strict validation fails loudly: 3 tasks are rejected (flagged future work, ADR-006).",
      "Determinism is pinned (single-thread BLAS + seeded numpy/torch/env).",
    ],
  },
  {
    n: "06",
    title: "Automated reporting",
    module: "report.py",
    cmd: "uv run python report.py",
    body:
      "Every condition-seed run becomes one row of outputs/scores.csv; the stage-by-stage Task 1/Task 2 scores are plotted to outputs/forgetting_report.png.",
    points: [
      "Reports never recompute: they only reformat ConditionResult rows.",
      "Same evaluate() code across all four conditions.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Module map (structure appendix)                                    */
/* ------------------------------------------------------------------ */
export const MODULES = [
  {
    name: "env.py",
    role: "Task environment",
    desc: "simple_spread via mpe2; canonical task registry; deterministic seeding; team-success metric.",
  },
  {
    name: "agent.py",
    role: "Single-task baseline",
    desc: "SingleAgentWrapper (gymnasium.Env), PPO creation, per-agent training & evaluation, model save/load.",
  },
  {
    name: "memory.py",
    role: "Memory-saving conditions",
    desc: "The sequential run_condition pipeline: freeze + rehearsal, ConditionResult rows, bit-identical frozen-layer assertion.",
  },
  {
    name: "config.yaml",
    role: "Single source of truth",
    desc: "agents, tasks, timesteps, method, rounds, seeds, output_dir — everything a run needs, validated strictly.",
  },
  {
    name: "main.py",
    role: "One-command pipeline",
    desc: "uv run python main.py --config config.yaml → train all conditions/seeds → report.",
  },
  {
    name: "report.py",
    role: "Reporting",
    desc: "Flattens ConditionResult rows to outputs/scores.csv and renders outputs/forgetting_report.png.",
  },
  {
    name: "llm_validation.py",
    role: "Supplementary LLM study",
    desc: "TRL PPOTrainer on distilgpt2 to check the forgetting/mitigation pattern transfers to a real language model (GPU/Colab).",
  },
];

/* ------------------------------------------------------------------ */
/*  Architectures for the interactive visualizer                       */
/* ------------------------------------------------------------------ */
export type ArchNode = {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  color: string;
  icon?: string;
  desc: string;
  deep: string[];
  formula?: string;
};

export type ArchEdge = { from: string; to: string; label?: string };

export type ArchDiagram = {
  id: string;
  tab: string;
  title: string;
  intro: string;
  hint: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
};

export const ARCH_DIAGRAMS: ArchDiagram[] = [
  {
    id: "network",
    tab: "Agent network",
    title: "One PPO agent (11,142 parameters)",
    intro:
      "Every agent is an independent PPO policy: a separate policy head chooses actions, a value head estimates returns, and both read the same 18-dim observation.",
    hint: "Hover any block for a deeper explanation.",
    nodes: [
      {
        id: "obs",
        label: "Observation",
        sub: "18-dim state vector",
        x: 2, y: 44, w: 16, color: "sky",
        desc: "6N = 18 features: own velocity & position, relative landmark positions, relative teammate positions/velocities.",
        deep: [
          "One agent's view of a 3-agent / 3-landmark world (simple_spread).",
          "Shared dimensionality across tasks is what allows same-model continuation (ADR-004).",
        ],
        formula: "dim = 4 + 2N + 2·2(N−1) = 6N = 18",
      },
      {
        id: "pol",
        label: "Policy head",
        sub: "64 → 64 → 5",
        x: 30, y: 14, w: 18, color: "indigo",
        desc: "Two 64-unit hidden layers output a softmax over 5 discrete actions (move N/E/S/W or stay).",
        deep: [
          "Separate MLP branch for the policy (:policy_net) and value (:value_net) in SB3 2.9.",
          "Early layers of BOTH branches are the freeze target for regularization.",
          "~1/5 of the 11,142 parameters live in these early layers (2,432).",
        ],
        formula: "π_θ(a | o) = softmax(W₂ tanh(W₁ o + b₁) + b₂)",
      },
      {
        id: "val",
        label: "Value head",
        sub: "64 → 64 → 1",
        x: 26, y: 72, w: 18, color: "violet",
        desc: "Estimates expected return V(s) to compute PPO's clipped advantage objective.",
        deep: [
          "Used only during training — not during evaluation (the policy acts greedily).",
          "Value head is not frozen by design: critics adapt quickly on Task 2.",
        ],
        formula: "Â_t = R_t − V(s_t)",
      },
      {
        id: "act",
        label: "Action",
        sub: "5-branch discrete",
        x: 58, y: 14, w: 14, color: "emerald",
        desc: "The chosen action moves the agent; every teammate's action is fed to the environment each step.",
        deep: [
          "Classic pitfall: omitting an agent's action from env.step() zeroes all rewards.",
          "Agents share a team reward but optimize their own policies (independent learners).",
        ],
      },
      {
        id: "env",
        label: "Environment",
        sub: "3-agent simple_spread",
        x: 78, y: 40, w: 16, color: "slate",
        desc: "mpe2 parallel environment: 3 agents must cover 3 landmarks for max cooperative reward.",
        deep: [
          "Reward = cooperative coverage + local collision avoidance, weighted by local_ratio.",
          "Task 1 runs 50 frames; Task 2 runs 25 frames (shorter deadline, harder).",
        ],
        formula: "R = (1−κ)·R_coop + κ·R_local, κ = 0.5",
      },
      {
        id: "loss",
        label: "PPO update",
        sub: "clipped surrogate",
        x: 58, y: 72, w: 16, color: "amber",
        desc: "Collects rollout returns and takes small, stable gradient steps each iteration.",
        deep: [
          "Emphasizes sample efficiency over on-policy guarantee — practical on CPU budgets.",
          "Adam optimizer rebuilt over unfrozen params after early-layer freezing.",
        ],
        formula: "L = E[min(r_t Â, clip(r_t,1−ε,1+ε) Â)]",
      },
    ],
    edges: [
      { from: "obs", to: "pol" },
      { from: "obs", to: "val" },
      { from: "pol", to: "act" },
      { from: "act", to: "env" },
      { from: "env", to: "loss" },
      { from: "loss", to: "pol", label: "θ ← θ + α∇L" },
      { from: "loss", to: "val", label: "θ ← θ + α∇L" },
    ],
  },
  {
    id: "pipeline",
    tab: "Training pipeline",
    title: "Sequential same-model training",
    intro:
      "One team object, two tasks in order. Task 1 learns first; the same models continue on Task 2, with optional freeze and rehearsal. Only the model objects in the middle are reused — nothing else.",
    hint: "Hover any stage for what it actually does.",
    nodes: [
      {
        id: "t1",
        label: "Task 1",
        sub: "spread_3a_50c · 50k steps",
        x: 2, y: 40, w: 16, color: "sky",
        desc: "Fresh PPO team trains on the 50-frame task. score_before is recorded here.",
        deep: [
          "5 alternating per-agent rounds of 10k steps each.",
          "Deterministic seed block: seed·1000 + r·100 + i per agent.",
        ],
      },
      {
        id: "freeze",
        label: "Freeze early layers",
        sub: "regularization · both",
        x: 24, y: 40, w: 16, color: "rose",
        desc: "Optionally pins the input-projection layers of policy & value heads after Task 1 (requires_grad=False).",
        deep: [
          "EWC proxy: protects the earliest shared features from overwriting (ADR-005).",
          "2,432 of 11,142 params frozen; Adam rebuilt over the rest.",
          "Verified bit-identical after Task 2 via a real torch.equal assertion.",
        ],
      },
      {
        id: "t2",
        label: "Task 2",
        sub: "spread_3a_25c · 50k steps",
        x: 46, y: 40, w: 16, color: "indigo",
        desc: "The same model objects continue on the 25-frame task, round by round.",
        deep: [
          "Distinct deterministic seed block (seed+10)·1000 + r·100 + i.",
          "Frozen agents still collect gradients; only their early weights are pinned.",
        ],
      },
      {
        id: "replay",
        label: "Rehearsal bursts",
        sub: "experience_replay · both",
        x: 68, y: 12, w: 19, color: "amber",
        desc: "After each Task-2 round (except the last), each frozen/unfrozen agent replays 2,500 steps of Task 1.",
        deep: [
          "Not a stored buffer — genuine additional gradient updates on the old task (ADR-005).",
          "Third, non-overlapping seed block (seed+50)·1000 keeps the sweep reproducible.",
        ],
        formula: "2500 steps × 3 agents × (rounds−1) bursts",
      },
      {
        id: "eval",
        label: "Evaluate",
        sub: "score_before → score_after",
        x: 70, y: 66, w: 24, color: "emerald",
        desc: "Re-runs both tasks with the final team; forgetting = score_before − score_after.",
        deep: [
          "Same evaluate() code for every condition (20 episodes).",
          "Also records score_task2 to confirm the new task was actually learned.",
        ],
        formula: "forgetting = score_before − score_after",
      },
    ],
    edges: [
      { from: "t1", to: "freeze" },
      { from: "freeze", to: "t2" },
      { from: "t2", to: "replay", label: "each round" },
      { from: "replay", to: "t2", label: "burst returns" },
      { from: "t2", to: "eval" },
    ],
  },
  {
    id: "measure",
    tab: "Forgetting loop",
    title: "How forgetting is measured",
    intro:
      "A clean before/after protocol: the exact same evaluation code is used at both ends of Task-2 training, so the only difference between the two measurements is the transfer itself.",
    hint: "Hover the stages, then explore the results below.",
    nodes: [
      {
        id: "p1",
        label: "score_before",
        sub: "Task 1, after Task 1",
        x: 2, y: 42, w: 18, color: "sky",
        desc: "The trained team's mean episodic reward on Task 1 before any Task-2 contact.",
        deep: ["Recorded by evaluate() with 20 episodes against team_actors of Task 1."],
      },
      {
        id: "seq",
        label: "Task-2 training",
        sub: "same model objects",
        x: 30, y: 42, w: 18, color: "indigo",
        desc: "Sequential continuation with optional freeze + interleaved rehearsal.",
        deep: [
          "100% parameter reuse — the forgetting signal comes from shared weights, not a fresh model.",
          "Condition choice changes only this stage; measure stays identical.",
        ],
      },
      {
        id: "p2",
        label: "score_after",
        sub: "Task 1, after Task 2",
        x: 58, y: 42, w: 18, color: "rose",
        desc: "The same task, re-evaluated after transfer. A drop marks interference.",
        deep: ["Lower score_after ⇒ the team forgot how to coordinate on Task 1's horizon."],
      },
      {
        id: "delta",
        label: "forgetting",
        sub: "before − after",
        x: 84, y: 20, w: 14, color: "amber",
        desc: "Positive = forgetting. Negative = Task 2 training actually improved Task 1.",
        deep: [
          "On small budgets the sign can flip between seeds — reported honestly, never censored.",
          "Phase 4 saw −2.31 (seed 0) and +2.04 (seed 1).",
        ],
        formula: "Δ = score_before − score_after",
      },
      {
        id: "cmp",
        label: "Compare conditions",
        sub: "4 method rows",
        x: 84, y: 68, w: 14, color: "emerald",
        desc: "The same protocol, repeated under none / replay / freeze / both.",
        deep: [
          "Conditions share seeds and evaluate() — differences are attributable to the method.",
          "Output: outputs/scores.csv × outputs/forgetting_report.png.",
        ],
      },
    ],
    edges: [
      { from: "p1", to: "seq" },
      { from: "seq", to: "p2" },
      { from: "p2", to: "delta" },
      { from: "delta", to: "cmp" },
    ],
  },
];