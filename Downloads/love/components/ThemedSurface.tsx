"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ThemedSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "card" | "panel" | "paper" | "transparent";
  asChild?: boolean;
};

export const ThemedSurface = forwardRef<HTMLDivElement, ThemedSurfaceProps>(
  ({ className, variant = "card", ...props }, ref) => {
    const base = {
      card: "themed-surface shadow-card ring-1 ring-[color-mix(in_srgb,var(--surface-border),transparent_20%)]",
      panel:
        "themed-surface themed-surface-panel shadow-card ring-1 ring-[color-mix(in_srgb,var(--surface-border),transparent_30%)]",
      paper:
        "themed-surface themed-surface-paper shadow-paper ring-1 ring-[color-mix(in_srgb,var(--surface-border),transparent_25%)]",
      transparent: "themed-surface themed-surface-ghost",
    }[variant];

    return (
      <div
        ref={ref}
        className={cn(base, className)}
        {...props}
      />
    );
  },
);

ThemedSurface.displayName = "ThemedSurface";
