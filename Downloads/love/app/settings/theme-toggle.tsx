"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTheme } from "@/providers/ThemeProvider";
import { setThemeAction, type ThemeState } from "./actions";

const themes = [
  {
    id: "stamps",
    label: "Vintage Stamps",
    description: "Postage collage, pine + burgundy, perforated edges.",
    swatch: "bg-[radial-gradient(circle_at_20%_20%,#f7ede1,transparent_55%),radial-gradient(circle_at_80%_10%,#b53b3d33,transparent_50%),linear-gradient(135deg,#f3e5d0,#e6d4c0)]",
  },
  {
    id: "quilt",
    label: "Autumn Quilt",
    description: "Patchwork blocks, stitches, cozy earth tones.",
    swatch: "bg-[linear-gradient(45deg,#f5e8da 0%,#d8c2a8 100%)]",
  },
  {
    id: "cozy",
    label: "Cozy Night",
    description: "Candle glow, warm vignette, soft fabric.",
    swatch: "bg-[radial-gradient(circle at 30% 30%,#f8cfa0aa,transparent_55%),linear-gradient(160deg,#1a120f,#0f0a0a)]",
  },
  {
    id: "blue",
    label: "Blue Scrapbook",
    description: "Layered paper, torn edges, tape stickers.",
    swatch: "bg-[radial-gradient(circle at 70% 10%,#b8d4ff99,transparent_50%),linear-gradient(150deg,#e7f0ff,#c8d7f3)]",
  },
] as const;

const initialState: ThemeState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save for server pages"}
    </button>
  );
}

export function ThemeToggle({ current }: { current: string }) {
  const { theme, setTheme } = useTheme();
  const [state, formAction] = useActionState(setThemeAction, initialState);
  const [selected, setSelected] = useState<string>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.dataset.theme || theme || current;
    }
    return theme || current;
  });
  const [activeTheme, setActiveTheme] = useState<string>(() => selected);

  useEffect(() => {
    setSelected(theme);
    setActiveTheme(theme);
  }, [theme]);

  // Sync with document dataset to avoid visual mismatch (SSR cookie vs client)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const ds = document.documentElement.dataset.theme;
    if (ds && ds !== selected) {
      setSelected(ds);
      setActiveTheme(ds);
    }
  }, [selected]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="theme" value={selected} readOnly />
      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelected(t.id);
                setActiveTheme(t.id);
                setTheme(t.id as typeof themes[number]["id"]);
              }}
              className={`group relative overflow-hidden rounded-3xl border p-4 text-left shadow-card ring-1 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                activeTheme === t.id
                  ? "border-primary/70 ring-primary/40 shadow-2xl"
                  : "border-border/60 bg-card/60 opacity-60 hover:border-primary/40 hover:opacity-90"
              }`}
            >
              <div className="relative h-28 overflow-hidden rounded-2xl border border-border/70 shadow-inner">
                <div className={`absolute inset-0 ${t.swatch} ${activeTheme === t.id ? "" : "brightness-50 saturate-75"}`} />
                <div className="absolute inset-0 bg-[url('/textures/noise.png')] opacity-30 mix-blend-soft-light [background-size:240px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.18),transparent_60%)] opacity-50" />
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-sm ring-1 ring-border/70 backdrop-blur">
                  {t.label}
                </div>
                {active ? (
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase text-primary-foreground shadow-sm">
                    Active
                  </span>
                ) : null}
                <div className="absolute bottom-2 right-3 rounded-xl bg-background/70 px-3 py-2 text-xs text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur">
                  {t.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {state.status === "success" ? (
        <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          Saved for SSR pages. Theme is applied instantly client-side.
        </p>
      ) : state.status === "error" && state.message ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
