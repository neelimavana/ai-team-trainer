"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";
import { LITERATURE, LITERATURE_THEMES } from "@/lib/data";

export function Literature() {
  const [theme, setTheme] = useState<string>("All themes");
  const [open, setOpen] = useState<string | null>(null);

  const papers = useMemo(
    () => (theme === "All themes" ? LITERATURE : LITERATURE.filter((p) => p.theme === theme)),
    [theme],
  );

  return (
    <section id="literature" className="bg-slate-50/60 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Literature review"
          title="The research this project builds on"
          lead="Four threads converge here — the psychology of forgetting, weight-regularization, experience replay, and collaborative RL. Filter by thread; click a paper for its takeaway."
        />

        {/* theme filter */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 flex flex-wrap justify-center gap-2"
        >
          {["All themes", ...LITERATURE_THEMES].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTheme(t);
                setOpen(null);
              }}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                theme === t
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "border-border bg-white text-muted-foreground hover:border-indigo-200 hover:text-slate-900",
              )}
            >
              {t}
            </button>
          ))}
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {papers.map((p) => {
              const isOpen = open === p.title;
              return (
                <motion.article
                  key={p.title}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "paper-lift group cursor-pointer rounded-2xl border bg-white p-5",
                    isOpen ? "border-indigo-300 ring-4 ring-indigo-100" : "border-border",
                  )}
                  onClick={() => setOpen(isOpen ? null : p.title)}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>

                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-indigo-500">
                    {p.theme}
                  </div>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-slate-900">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.authors} · {p.year} · <span className="italic">{p.venue}</span>
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
                        <p className="pt-3 text-sm leading-relaxed text-slate-600">
                          {p.takeaway}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {p.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground"
        >
          <strong className="text-slate-700">Why this framing:</strong> the PRD
          deliberately simplifies EWC to <em>early-layer freezing</em> and replay
          buffers to <em>rehearsal bursts</em> — both validated proxies for the
          literature above, chosen so the whole experiment runs on two CPU cores
          without sacred-cow assumptions.
        </motion.p>
      </div>
    </section>
  );
}