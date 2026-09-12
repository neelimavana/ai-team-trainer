"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HERO_STATS, PROJECT } from "@/lib/data";

const EASE = [0.22, 1, 0.36, 1] as const;

function AnimatedNetwork() {
  const nodes = [
    { x: 8, y: 22 }, { x: 26, y: 14 }, { x: 44, y: 30 }, { x: 68, y: 16 },
    { x: 86, y: 26 }, { x: 16, y: 66 }, { x: 38, y: 74 }, { x: 60, y: 68 },
    { x: 82, y: 72 },
  ];
  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.55]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b, j) => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > 30) return null;
          return (
            <motion.line
              key={`${i}-${j}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#c7d2fe"
              strokeWidth={0.4}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 1.4, delay: 0.4 + i * 0.06, ease: "easeOut" }}
            />
          );
        }),
      )}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={1.5}
          fill={i % 3 === 0 ? "#6366f1" : i % 3 === 1 ? "#38bdf8" : "#a78bfa"}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.08, type: "spring" }}
        />
      ))}
    </svg>
  );
}

export function Hero() {
  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="overview" className="relative overflow-hidden">
      {/* background washes */}
      <div className="absolute left-1/2 top-[-28rem] h-[42rem] w-[70rem] -translate-x-1/2 animate-aurora rounded-full bg-gradient-to-br from-indigo-200/70 via-sky-100/60 to-violet-200/60 blur-3xl" />
      <div className="absolute inset-0 bg-dots opacity-60" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Badge variant="soft" className="mb-5 text-sm">
                <BrainCircuit className="h-3.5 w-3.5" />
                Continual Learning × Cooperative Multi-Agent RL — research project
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl"
            >
              Can a team of agents{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-violet-500 bg-clip-text text-transparent">
                learn new tasks
              </span>{" "}
              without forgetting how to work together?
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
              className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground"
            >
              {PROJECT.tagline}. We train independent PPO agents on a cooperative
              task, make them learn a second task, and test whether{" "}
              <em className="text-slate-700">experience replay</em> and{" "}
              <em className="text-slate-700">early-layer freezing</em> protect what
              they learned — all measured, not assumed.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.34, ease: EASE }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button size="lg" onClick={() => go("architecture")}>
                Explore the model
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => go("results")}>
                See results
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <a href={PROJECT.repo} target="_blank" rel="noreferrer">
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-xs font-medium uppercase tracking-widest text-slate-400"
            >
              Built with · {PROJECT.builtWith.join(" · ")}
            </motion.p>
          </div>

          {/* animated stats panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 to-sky-400/10 blur-2xl" />
            <div className="relative z-10 grid grid-cols-2 gap-3">
              {HERO_STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: EASE }}
                  className="paper-ring rounded-2xl border border-border bg-white/90 p-5 backdrop-blur"
                >
                  <div className="text-3xl font-extrabold tracking-tight text-indigo-600">
                    {s.value.toLocaleString()}
                    {s.suffix}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">{s.label}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {s.note}
                  </div>
                </motion.div>
              ))}
            </div>
            <AnimatedNetwork />
          </motion.div>
        </div>
      </div>
    </section>
  );
}