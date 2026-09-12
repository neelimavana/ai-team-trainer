import { BeakerIcon, Github } from "lucide-react";
import { PROJECT } from "@/lib/data";

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
              <BeakerIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900">AI Team Trainer</div>
              <div className="text-xs text-muted-foreground">
                Continual learning × cooperative multi-agent RL · research project
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <a
              href={PROJECT.repo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 font-medium text-slate-700 transition-colors hover:bg-secondary"
            >
              <Github className="h-3.5 w-3.5" />
              View on GitHub
            </a>
            <span className="hidden sm:inline">
              docs/PRD.md · docs/Phases.md · docs/ADRs.md
            </span>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            All results are real computed outputs of the pipeline — never illustrative.
            Determinism is pinned to the seed via single-thread BLAS + fully-seeded RNGs.
          </p>
          <p className="font-mono text-[11px]">uv run python main.py --config config.yaml</p>
        </div>
      </div>
    </footer>
  );
}