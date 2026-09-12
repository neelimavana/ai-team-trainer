"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Terminal } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { METHOD_STEPS } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Methodology() {
  const [active, setActive] = useState<number>(2);

  return (
    <section id="method" className="relative py-24 sm:py-28">
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Methodology"
          title="Six phases, one reproducible pipeline"
          lead="Each step maps to a module in the repo and a command you can actually run. The pipeline is deliberately sequential so every claim has a checkable Definition of Done."
        />

        <div className="mx-auto max-w-4xl">
          {METHOD_STEPS.map((step, i) => {
            const isOpen = active === i;
            return (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="relative pl-16 sm:pl-20"
              >
                {/* connector */}
                {i < METHOD_STEPS.length - 1 && (
                  <span className="absolute left-[1.66rem] top-14 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-indigo-200 to-sky-200 sm:left-[1.9rem]" />
                )}
                {/* node */}
                <button
                  onClick={() => setActive(isOpen ? -1 : i)}
                  className={cn(
                    "absolute left-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 sm:left-5",
                    isOpen
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110"
                      : "bg-white text-indigo-600 ring-1 ring-indigo-200",
                  )}
                  aria-label={`Step ${step.n}`}
                >
                  {step.n}
                </button>

                <div
                  className={cn(
                    "paper-lift group mb-5 cursor-pointer rounded-2xl border p-5 transition-colors sm:p-6",
                    isOpen ? "border-indigo-300 bg-gradient-to-r from-white to-indigo-50/50" : "border-border bg-card",
                  )}
                  onClick={() => setActive(isOpen ? -1 : i)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-500">
                      {step.module}
                    </span>
                    <ChevronRight
                      className={cn(
                        "ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-90",
                      )}
                    />
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="mt-4 space-y-2">
                          {step.points.map((pt) => (
                            <li
                              key={pt}
                              className="flex gap-2 text-sm leading-relaxed text-slate-600"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                              {pt}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 font-mono text-xs text-slate-100">
                          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                          {step.cmd}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}