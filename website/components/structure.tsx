"use client";

import { motion } from "framer-motion";
import { FileCode2, FolderGit2, TerminalSquare } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { MODULES, PROJECT } from "@/lib/data";

const RUNS = [
  { cmd: "uv run python env.py", label: "environment smoke test" },
  { cmd: "uv run python agent.py 3", label: "single-task baseline" },
  { cmd: "uv run python agent.py 4", label: "sequential + forgetting" },
  { cmd: "uv run python memory.py", label: "all four conditions" },
  { cmd: "uv run python report.py", label: "scores.csv + report.png" },
  { cmd: "uv run python main.py --config config.yaml", label: "whole pipeline (recommended)" },
];

export function Structure() {
  return (
    <section id="structure" className="bg-slate-50/60 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Repository structure"
          title="A small repo with clear ownership"
          lead="One module per responsibility — environments, agents, memory conditions, reporting, configuration. Hover a module to see what it owns."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {MODULES.map((m, i) => (
              <motion.button
                key={m.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="paper-lift group rounded-2xl border border-border bg-card p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-indigo-500" />
                  <span className="font-mono text-sm font-bold text-slate-900">{m.name}</span>
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-500">
                  {m.role}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {m.desc}
                </p>
              </motion.button>
            ))}
          </div>

          <div className="flex flex-col gap-5">
            <div className="paper-lift rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-indigo-500" />
                <h3 className="text-base font-semibold text-slate-900">How to run</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Every phase has an executable command. The whole study runs from one config:
              </p>
              <div className="mt-4 space-y-2.5">
                {RUNS.map((r) => (
                  <div key={r.cmd}>
                    <code className="block rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
                      <TerminalSquare className="mr-1.5 inline h-3.5 w-3.5 text-emerald-400" />
                      {r.cmd}
                    </code>
                    <div className="mt-1 pl-1 text-[11px] text-muted-foreground">{r.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6"
            >
              <h3 className="text-base font-semibold text-slate-900">
                One command, zero edits between runs
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                PRD FR7: all run parameters — agents, tasks, per-task timesteps, method,
                rounds, seeds, output directory — live in{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-600 ring-1 ring-border">config.yaml</code>.
                Strict validation rejects invalid values loudly, and a config-driven run
                reproduces a hardcoded run to the exact last bit.
              </p>
              <div className="mt-3 text-xs text-slate-500">
                Repo: <a href={PROJECT.repo} className="font-medium text-indigo-600 hover:underline" target="_blank" rel="noreferrer">{PROJECT.repo}</a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}