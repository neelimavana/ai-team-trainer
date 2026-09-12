"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Info, TrendingDown } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BASELINES,
  METHOD_ORDER,
  METHOD_RESULTS,
  RESULTS_INSIGHTS,
  type MethodResult,
} from "@/lib/data";

/* ---------------- Forgetting bars ---------------- */

function ForgettingBars() {
  const results = METHOD_ORDER.map((id) => METHOD_RESULTS[id]);
  const maxAbs = useMemo(
    () => Math.max(...results.map((r) => Math.abs(r.forgetting))),
    [results],
  );

  return (
    <Card className="paper-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-indigo-500" />
          Forgetting by condition — seed 0
        </CardTitle>
        <CardDescription>
          Mean episodic reward change on Task 1 after Task 2. Zero line = no change; bars
          to the left mean the old task actually <em>improved</em>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* zero line */}
          <div className="absolute left-1/2 top-0 h-full w-px bg-slate-300" />
          <div className="space-y-5 pt-1">
            {results.map((r, i) => {
              const neg = r.forgetting < 0;
              const width = (Math.abs(r.forgetting) / maxAbs) * 96;
              return (
                <div key={r.id} className="group relative">
                  <div className="relative h-9">
                    <div className="absolute inset-0 flex items-center">
                      {/* bar extends either side of center */}
                      {neg ? (
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${width}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute right-1/2 h-9 rounded-l-xl border border-emerald-200 bg-gradient-to-l from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-500/20"
                        />
                      ) : (
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${width}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-1/2 h-9 rounded-r-xl border border-rose-200 bg-gradient-to-r from-rose-400 to-rose-500 shadow-sm shadow-rose-500/20"
                        />
                      )}
                    </div>
                    {/* label */}
                    <span className="absolute left-0 top-1/2 z-10 w-[30%] -translate-y-1/2 truncate pr-3 text-xs font-semibold text-slate-700 sm:w-[26%]">
                      {r.name}
                    </span>
                    {/* value */}
                    <span
                      className={cn(
                        "absolute top-1/2 z-10 whitespace-nowrap -translate-y-1/2 font-mono text-xs font-bold text-white",
                        neg ? "left-0" : "right-0",
                      )}
                      style={
                        neg
                          ? { left: `calc(50% - ${width}%)`, paddingLeft: 6 }
                          : { right: `calc(50% - ${width}%)`, paddingRight: 6 }
                      }
                    >
                      {r.forgetting > 0 ? "+" : ""}
                      {r.forgetting.toFixed(2)}
                    </span>
                  </div>

                  {/* hover tooltip */}
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-[320px] -translate-x-1/2 rounded-xl border border-border bg-white p-3 text-xs shadow-xl shadow-slate-900/10 group-hover:block">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="mt-1 grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <div>
                        <div className="text-slate-400">Task 1 before</div>
                        <div className="font-semibold text-slate-700">{r.scoreBefore.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Task 1 after</div>
                        <div className="font-semibold text-slate-700">{r.scoreAfter.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Task 2</div>
                        <div className="font-semibold text-slate-700">{r.scoreTask2.toFixed(2)}</div>
                      </div>
                    </div>
                    <p className="mt-2 leading-relaxed text-slate-500">{r.short}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> retained old task
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> forgot old task
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Info className="h-3 w-3" /> lower is better; negative = old task improved
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Trajectory line chart ---------------- */

const STAGES = ["Task 1 — before", "Task 1 — after", "Task 2 — after"];
const Y_MIN = -54;
const Y_MAX = -18;

function TrajectoryChart() {
  const [hover, setHover] = useState<string | null>(null);

  const results = METHOD_ORDER.map((id) => METHOD_RESULTS[id]);

  const y = (v: number) => 20 + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * 200;
  const xs = [60, 220, 380];
  const H = 240;
  const W = 440;

  const series = (r: MethodResult) => ({
    r,
    points: [y(r.scoreBefore), y(r.scoreAfter), y(r.scoreTask2)],
  });

  const grid = 4;
  return (
    <Card className="paper-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-500" />
          Full trajectory per condition
        </CardTitle>
        <CardDescription>
          Every condition's three measurements on one scale. Play with the legend to
          isolate a method.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-md"
          role="img"
          aria-label="Trajectory chart"
        >
          {/* gridlines */}
          {Array.from({ length: grid + 1 }).map((_, i) => {
            const yy = 20 + (i * 200) / grid;
            const v = Y_MAX - (i * (Y_MAX - Y_MIN)) / grid;
            return (
              <g key={i}>
                <line x1={60} x2={380} y1={yy} y2={yy} stroke="#eef2f7" />
                <text x={12} y={yy + 3} fontSize={9} fill="#94a3b8" fontFamily="monospace">
                  {v.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* x labels */}
          {STAGES.map((s, i) => (
            <text
              key={s}
              x={xs[i]}
              y={H - 16}
              fontSize={9}
              fill="#64748b"
              textAnchor="middle"
            >
              {s}
            </text>
          ))}

          {/* lines */}
          {seriesLines(series, results, hover, xs)}
        </svg>

        {/* legend */}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                hover === r.id
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-border bg-white text-slate-500 hover:text-slate-800",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.name}
            </button>
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          Task 2 is learned everywhere (−21.2 to −23.0), while mitigation shows up only
          in the Task 1 slope.
        </p>
      </CardContent>
    </Card>
  );
}

function seriesLines(
  series: { r: MethodResult; points: number[] }[],
  results: MethodResult[],
  hover: string | null,
  xs: number[],
) {
  const byId = new Map(results.map((r) => [r.id, r]));
  return series.map(({ r, points }) => {
    const dim = hover !== null && hover !== r.id;
    const pathD = `M ${xs[0]} ${points[0]} L ${xs[1]} ${points[1]} L ${xs[2]} ${points[2]}`;
    return (
      <g
        key={r.id}
        style={{ transition: "opacity 0.2s" }}
        opacity={dim ? 0.18 : 1}
        stroke={byId.get(r.id)?.color}
      >
        <motion.path
          key={r.id + "m"}
          d={pathD}
          fill="none"
          strokeWidth={hover === r.id ? 3 : 2}
          strokeLinecap="round"
          cursor="pointer"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {points.map((py, i) => (
          <circle
            key={i}
            cx={xs[i]}
            cy={py}
            r={hover === r.id ? 5 : 3.5}
            fill="#fff"
            strokeWidth={hover === r.id ? 2.5 : 2}
          />
        ))}
      </g>
    );
  });
}

/* ---------------- Layout ---------------- */

export function Results() {
  return (
    <section id="results" className="relative py-24 sm:py-28">
      <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-violet-100/60 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Experiments & results"
          title="What the numbers say"
          lead="All figures below are the real, committed outputs of the pipeline (outputs/scores.csv) — not illustrative numbers. Hover the bars and legend to inspect them."
        />

        {/* baseline comparison cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {[
            { title: "Task 1 baseline", trained: BASELINES.trained, random: BASELINES.random, trainedLabel: BASELINES.trainedLabel, randomLabel: BASELINES.randomLabel },
          ].map((b) => (
            <Card key="baseline" className="paper-lift overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>{b.title}</CardTitle>
                <CardDescription>PPO team vs random policy after 50k steps/agent (Phase 3).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-6">
                  <div className="flex-1">
                    <motion.div
                      initial={{ height: 4 }}
                      whileInView={{ height: 148 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      className="w-16 rounded-t-xl bg-gradient-to-t from-indigo-500 to-sky-400 shadow-lg shadow-indigo-500/20"
                    />
                    <div className="mt-2 font-mono text-lg font-bold text-indigo-600">{b.trained.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">{b.trainedLabel}</div>
                  </div>
                  <div className="flex-1">
                    <motion.div
                      initial={{ height: 4 }}
                      whileInView={{ height: 96 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="w-16 rounded-t-xl bg-gradient-to-t from-slate-300 to-slate-200"
                    />
                    <div className="mt-2 font-mono text-lg font-bold text-slate-500">{b.random.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">{b.randomLabel}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="paper-lift">
            <CardHeader className="pb-3">
              <CardTitle>Phase 4 — mixed-sign forgetting</CardTitle>
              <CardDescription>
                Same protocol, two seeds: forgetting is −2.31 (seed 0) and +2.04 (seed 1). Reported as measured.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {BASELINES.seedSweep.map((s) => (
                <div key={s.seed} className="rounded-xl border border-border bg-slate-50/60 p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    seed {s.seed}
                  </div>
                  <div className={cn("font-mono text-xl font-bold", s.forgetting < 0 ? "text-emerald-600" : "text-rose-600")}>
                    {s.forgetting > 0 ? "+" : ""}
                    {s.forgetting.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{s.note}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <ForgettingBars />
          <TrajectoryChart />
        </div>

        {/* insight cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {RESULTS_INSIGHTS.map((ins, i) => (
            <motion.div
              key={ins.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="paper-lift rounded-2xl border border-border bg-gradient-to-br from-white to-indigo-50/40 p-5"
            >
              <h4 className="text-base font-semibold text-slate-900">{ins.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{ins.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}