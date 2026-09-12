import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  lead,
  align = "center",
  children,
}: {
  kicker: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-12 flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
      )}
    >
      <Reveal>
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-600">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          {kicker}
        </span>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="max-w-3xl text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h2>
      </Reveal>
      {lead ? (
        <Reveal delay={0.1}>
          <p
            className={cn(
              "max-w-2xl text-base leading-relaxed text-muted-foreground",
              align === "center" && "mx-auto",
            )}
          >
            {lead}
          </p>
        </Reveal>
      ) : null}
      {children}
    </div>
  );
}