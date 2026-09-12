"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";

const FINDINGS = [
  {
    title: "Catastrophic forgetting is measurable here — but modest",
    body: "Without mitigation, Task 2 transfer cost +0.18 points on Task 1 (seed 0), and the sign flipped across seeds in Phase 4. Continual learning on small cooperative teams is noisy, which is exactly why repeated, seeded measurement matters.",
    verdict: "observed",
  },
  {
    title: "Rehearsal is the stronger lever",
    body: "Experience replay (−3.24) and replay + freeze (−3.42) both turned Task 1 retention strongly positive, far outweighing freeze alone (−0.73). Short interleaved bursts genuinely protect old-task behaviour at little cost to Task 2 (−21.2…−23.0 everywhere).",
    verdict: "evidence",
  },
  {
    title: "Freezing is a faithful EWC proxy, and it's weak alone",
    body: "Pinning the first 22% of parameters (2,432/11,142) preserves early features but can't match rehearsal without stored experience. As theory predicts: importance-mediated regularization helps least when old data is cheap.",
    verdict: "theory-confirmed",
  },
];

const LIMITS = [
  "Regularization is frozen-early-layers (an EWC proxy), not full EWC — per the PRD's simplified framework.",
  "Experience replay is interleaved rehearsal bursts, not a stored replay buffer.",
  "Single-team size (N=3) and exactly two sequential tasks in this release; 3-task chaining is flagged future work (ADR-006).",
  "CPU-only training; the TL;DR of the multi-agent study will be cross-checked on a real pretrained LLM (GPU / Colab).",
];

export function Conclusion() {
  return (
    <section id="conclusion" className="relative py-24 sm:py-28">
      <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Conclusions"
          title="What we can and cannot claim"
          lead="The headline result is reproducible and honest; the caveats are explicit rather than hidden."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {FINDINGS.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="paper-lift flex flex-col rounded-2xl border border-border bg-card p-6"
            >
              <Badge
                variant={i === 1 ? "emerald" : i === 0 ? "amber" : "soft"}
                className="mb-3 w-fit"
              >
                {i === 1 ? "primary evidence" : i === 0 ? "observed" : "theory confirmed"}
              </Badge>
              <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* limitations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-base font-semibold text-slate-900">Honest limitations</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {LIMITS.map((l) => (
                <li key={l} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {l}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* next steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
              <h3 className="text-base font-semibold text-slate-900">Next steps</h3>
            </div>
            <ul className="mt-4 flex-1 space-y-3">
              {[
                "Cross-check the pattern on a real pretrained LLM: TRL PPO on distilgpt2 (llm_validation.py, Colab/GPU).",
                "Wire 3-task sequential chaining by generalising the measurement/report schema (current release is 2-task).",
                "Sweep rehearsal budget and freeze depth to map the retention/adaptation trade-off.",
                "Move the interactive dashboard from this explainer to a live results view over scores.csv.",
              ].map((s) => (
                <li key={s} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl border border-border bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Reproduce the headline number
              </div>
              <code className="mt-1 block font-mono text-xs text-indigo-700">
                uv run python main.py --config config.yaml
              </code>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}