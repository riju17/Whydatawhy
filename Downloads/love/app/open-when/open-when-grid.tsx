"use client";

import { useMemo, useState } from "react";
import { OpenWhenTile, type OpenWhenLetter } from "@/components/open-when-tile";
import { cn } from "@/lib/utils";

const accents = [
  "bg-[linear-gradient(135deg,#fef3e8,#f8e3d1)]",
  "bg-[linear-gradient(135deg,#e8f3fe,#dce7fb)]",
  "bg-[linear-gradient(135deg,#f0f4ec,#e1ecdc)]",
  "bg-[linear-gradient(135deg,#f7e9f5,#f2dff0)]",
];

function uniqueTags(letters: OpenWhenLetter[]) {
  const set = new Set<string>();
  letters.forEach((l) => l.tags.forEach((t) => set.add(t)));
  return Array.from(set);
}

export function OpenWhenGrid({ letters }: { letters: OpenWhenLetter[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const tags = useMemo(() => uniqueTags(letters), [letters]);

  const filtered = useMemo(() => {
    if (!activeTag) return letters;
    return letters.filter((letter) =>
      letter.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase()),
    );
  }, [activeTag, letters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-foreground">Filter by mood:</span>
        <FilterPills tags={tags} active={activeTag} onSelect={setActiveTag} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-open-when-grid
        >
          {filtered.map((letter, idx) => (
            <OpenWhenTile
              key={letter.id}
              letter={letter}
              accent={accents[idx % accents.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPills({
  tags,
  active,
  onSelect,
}: {
  tags: string[];
  active: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterPill label="All" isActive={active === null} onClick={() => onSelect(null)} />
      {tags.map((tag) => (
        <FilterPill key={tag} label={tag} isActive={active === tag} onClick={() => onSelect(tag)} />
      ))}
    </div>
  );
}

function FilterPill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition",
        isActive
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center shadow-inner">
      <div className="space-y-2">
        <p className="text-lg font-display text-foreground">
          No “Open When...” letters yet
        </p>
        <p className="text-sm text-muted-foreground">
          Once you add them, they will appear here as a cozy quilt of envelopes.
        </p>
      </div>
    </div>
  );
}
