"use client";

import { motion } from "framer-motion";
import {
  Brain, FlaskConical, Gauge, Layers, Repeat, Scale,
} from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";

const OBJECTIVES = [
  {
    icon: Brain,
    title: "Measure forgetting honestly",
    body: "Record a trained team's Task-1 score, learn Task 2 with the same model objects, and report score_before, score_after, score_task2 as clean numbers — whether the sign is good or bad. No cherry-picking.",
  },
  {
    icon: Repeat,
    title: "Mitigate via the PRD's toolkit",
    body: "Experience replay as short interleaved rehearsal bursts, and regularization as early-layer freezing (an EWC proxy) — matching the project brief's simplified framework rather than full-blown EWC or replay buffers.",
  },
  {
    icon: Layers,
    title: "Separate tasks from environments",
    body: "Tasks differ by episode length and reward weighting — not team size — so a single policy's observation dimension stays fixed and same-model continuation is legitimately possible.",
  },
  {
    icon: FlaskConical,
    title: "Reproducible to the bit",
    body: "One config.yaml drives every run. Identical seeds reproduce identical numbers across processes (single-thread BLAS + fully-seeded numpy/torch/environment).",
  },
  {
    icon: Gauge,
    title: "Atomic, verifiable phases",
    body: "Baseline → sequential transfer → four mitigation conditions → automated reporting. Every phase has a measurable Definition of Done checked by actually running it.",
  },
  {
    icon: Scale,
    title: "Generalise to real models",
    body: "A supplementary, GPU-only experiment (TRL PPO on distilgpt2) checks whether the small-model forgetting pattern transfers to a genuine pretrained language model.",
  },
];

export function Objectives() {
  return (
    <section id="objectives" className="relative py-24 sm:py-28">
      <div className="absolute inset-0 bg-grid-slate opacity-70" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Objectives"
          title="What this research actually tries to answer"
          lead="Six measurable goals, defined in the PRD and enforced by phased definitions of done."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OBJECTIVES.map((o, i) => (
            <motion.div
              key={o.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="paper-lift group rounded-2xl border border-border bg-card p-6 hover:border-indigo-200"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                <o.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
            </motion.div>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-6 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Gauge className="h-5 w-5" />
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              <strong className="text-slate-900">North star metric:</strong>{" "}
              forgetting = score_before − score_after on Task 1, evaluated across
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-600 ring-1 ring-border">none</code>,
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-600 ring-1 ring-border">experience_replay</code>,
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-600 ring-1 ring-border">regularization</code>,
              and <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-600 ring-1 ring-border">both</code>.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}