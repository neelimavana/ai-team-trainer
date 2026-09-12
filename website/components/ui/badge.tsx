import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground bg-card",
        soft: "border-transparent bg-indigo-50 text-indigo-600",
        sky: "border-transparent bg-sky-50 text-sky-600",
        amber: "border-transparent bg-amber-50 text-amber-600",
        emerald: "border-transparent bg-emerald-50 text-emerald-600",
        rose: "border-transparent bg-rose-50 text-rose-600",
        violet: "border-transparent bg-violet-50 text-violet-600",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };