"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Fingerprint, MousePointerClick, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ARCH_DIAGRAMS, type ArchDiagram, type ArchNode } from "@/lib/data";

const NODE_H = 13; // node height in viewBox units (percent of panel height)

const COLOR_MAP: Record<string, { ring: string; chip: string; text: string }> = {
  sky: { ring: "bg-sky-100 text-sky-700", chip: "border-sky-200 bg-sky-50", text: "text-sky-700" },
  indigo: { ring: "bg-indigo-100 text-indigo-700", chip: "border-indigo-200 bg-indigo-50", text: "text-indigo-700" },
  violet: { ring: "bg-violet-100 text-violet-700", chip: "border-violet-200 bg-violet-50", text: "text-violet-700" },
  emerald: { ring: "bg-emerald-100 text-emerald-700", chip: "border-emerald-200 bg-emerald-50", text: "text-emerald-700" },
  slate: { ring: "bg-slate-200 text-slate-700", chip: "border-slate-300 bg-slate-50", text: "text-slate-700" },
  amber: { ring: "bg-amber-100 text-amber-700", chip: "border-amber-200 bg-amber-50", text: "text-amber-700" },
  rose: { ring: "bg-rose-100 text-rose-700", chip: "border-rose-200 bg-rose-50", text: "text-rose-700" },
};

function nodeCenter(n: ArchNode) {
  return { cx: n.x + n.w / 2, cy: n.y + NODE_H / 2 };
}

function edgePath(from: ArchNode, to: ArchNode, k: number) {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const mx = (a.cx + b.cx) / 2;
  const my = (a.cy + b.cy) / 2;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const sag = Math.min(8, Math.max(3, len * 0.12));
  const off = (k % 2 === 0 ? 1 : -1) * sag;
  return {
    d: `M ${a.cx} ${a.cy} Q ${mx + nx * off} ${my + ny * off} ${b.cx} ${b.cy}`,
    mid: { x: mx + nx * off, y: my + ny * off },
  };
}

function DeepPanel({ node }: { node: ArchNode | null }) {
  return (
    <div className="min-h-[176px] rounded-2xl border border-border bg-slate-50/70 p-5">
      <AnimatePresence mode="wait">
        {node ? (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", COLOR_MAP[node.color].ring)}>
                {node.sub}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{node.id}</span>
            </div>
            <h4 className="mt-2 text-lg font-bold tracking-tight text-slate-900">{node.label}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{node.desc}</p>
            <ul className="mt-3 space-y-1.5">
              {node.deep.map((d) => (
                <li key={d} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {d}
                </li>
              ))}
            </ul>
            {node.formula && (
              <div className="mt-3 inline-block rounded-lg border border-indigo-100 bg-white px-3 py-1.5 font-mono text-xs text-indigo-700 shadow-sm">
                {node.formula}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center"
          >
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <p className="text-sm text-muted-foreground">
              Hover any block — it expands here into the deeper explanation.
            </p>
            <p className="text-xs text-slate-400">
              Click to pin. Tabs switch between agent internals, training, and the measurement loop.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Diagram({ diagram }: { diagram: ArchDiagram }) {
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const interacted = useRef(false);

  const order = useMemo(() => diagram.nodes.map((n) => n.id), [diagram]);

  // Auto tour until the user interacts.
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      if (interacted.current) return;
      setActive(order[i % order.length]);
      i += 1;
    }, 2400);
    return () => clearInterval(t);
  }, [order]);

  const byId = useMemo(() => {
    const m = new Map<string, ArchNode>();
    diagram.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [diagram]);

  const activeNode = active ? byId.get(active) ?? null : null;
  const neighbors = useMemo(() => {
    if (!active) return [] as string[];
    const s = new Set<string>();
    diagram.edges.forEach((e) => {
      if (e.from === active) s.add(e.to);
      if (e.to === active) s.add(e.from);
    });
    return [...s];
  }, [active, diagram]);

  const setActiveFromUser = (id: string) => {
    interacted.current = true;
    setActive(id);
    setPinned((p) => (p === id ? null : id));
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900">{diagram.title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {diagram.intro}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
          <MousePointerClick className="h-3.5 w-3.5" />
          {diagram.hint}
        </span>
      </div>

      {/* diagram canvas */}
      <div className="relative mt-6 aspect-[16/12] w-full overflow-hidden rounded-2xl border border-border bg-white sm:aspect-[16/11]">
        {/* edge layer */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {diagram.edges.map((e, k) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const { d, mid } = edgePath(a, b, k);
            const on = active === e.from || active === e.to;
            return (
              <g key={`${e.from}-${e.to}`}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={on ? "#4f46e5" : "#cbd5e1"}
                  strokeWidth={on ? 1.6 : 1}
                  strokeDasharray={on ? undefined : "2.2 2.6"}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: on ? 0.9 : 0.7 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
                {e.label && (
                  <circle
                    cx={mid.x}
                    cy={mid.y}
                    r={0.6}
                    fill="#e2e8f0"
                    className="animate-pulse-soft"
                  />
                )}
                {on && (
                  <>
                    <circle
                      cx={mid.x}
                      cy={mid.y}
                      r={2}
                      fill="#4f46e5"
                      className="animate-pulse-soft"
                    />
                    {e.label && (
                      <text
                        x={mid.x}
                        y={mid.y}
                        fill="#6366f1"
                        fontSize={2.6}
                        textAnchor="middle"
                        className="font-medium"
                      >
                        {e.label}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* node layer */}
        {diagram.nodes.map((n) => {
          const activeHere = active === n.id;
          const c = COLOR_MAP[n.color];
          return (
            <button
              key={n.id}
              onMouseEnter={() => {
                interacted.current = true;
                setActive(n.id);
              }}
              onMouseLeave={() => {
                if (!pinned) setActive(null);
              }}
              onClick={() => setActiveFromUser(n.id)}
              className={cn(
                "absolute overflow-hidden rounded-xl border px-1.5 py-1 text-left transition-all duration-300",
                c.chip,
                activeHere
                  ? "z-10 scale-[1.04] shadow-xl ring-2 ring-indigo-400"
                  : "shadow-sm hover:scale-[1.02] hover:shadow-md",
              )}
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                width: `${n.w}%`,
                height: `${NODE_H}%`,
              }}
            >
              <div className={cn("flex h-full flex-col justify-center gap-0.5")}>
                <span className={cn("truncate text-[11px] font-bold leading-tight sm:text-xs", c.text)}>
                  {n.label}
                </span>
                <span className="truncate text-[9px] leading-tight text-slate-500 sm:text-[10px]">
                  {n.sub}
                </span>
              </div>
            </button>
          );
        })}

        {/* connected-to chips in-canvas */}
        {activeNode && neighbors.length > 0 && (
          <div className="absolute right-3 top-3 z-20 flex max-w-[46%] flex-wrap justify-end gap-1">
            {neighbors.map((id) => {
              const nn = byId.get(id);
              if (!nn) return null;
              return (
                <span
                  key={id}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    COLOR_MAP[nn.color].chip,
                    COLOR_MAP[nn.color].text,
                  )}
                >
                  {nn.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4">
        <DeepPanel node={activeNode} />
      </div>

      {/* floating hint of active node id with fingerprint */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <Fingerprint className="h-3.5 w-3.5" />
        {activeNode ? (
          <span>
            Inspecting <strong className="text-slate-600">{activeNode.label}</strong>
            {pinned ? " · pinned" : " · hover to follow, click to pin"}
          </span>
        ) : (
          <span>Awaiting your cursor…</span>
        )}
      </div>
    </div>
  );
}

export function ArchitectureExplorer() {
  return (
    <section id="architecture" className="bg-slate-50/60 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Interactive architecture"
          title="Peek inside the model"
          lead="Three lenses on the same pipeline. Every block is explorable — hover to reveal the deeper mechanics, formulas, and the design decisions (ADRs) behind them."
        />

        <div className="paper-lift rounded-3xl border border-border bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6 lg:p-8">
          <Tabs defaultValue="network">
            <TabsList className="w-full sm:w-auto">
              {ARCH_DIAGRAMS.map((d) => (
                <TabsTrigger key={d.id} value={d.id} className="flex-1 sm:flex-none">
                  {d.tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {ARCH_DIAGRAMS.map((d) => (
              <TabsContent key={d.id} value={d.id}>
                <Diagram diagram={d} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}