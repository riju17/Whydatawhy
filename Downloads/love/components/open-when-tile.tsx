import Link from "next/link";
import { cn } from "@/lib/utils";

export type OpenWhenLetter = {
  id: string;
  title: string;
  openWhen: string;
  tags: string[];
  coverEmoji?: string | null;
  isLocked: boolean;
  createdAt: string;
};

export function OpenWhenTile({
  letter,
  accent,
}: {
  letter: OpenWhenLetter;
  accent: string;
}) {
  return (
    <Link
      href={`/letter/${letter.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-3xl p-4 shadow-card ring-1 ring-border transition duration-200 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        accent,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-overlay [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_2px,transparent_2px,transparent_6px)]" />
      <div className="pointer-events-none absolute -left-14 -top-14 h-36 w-36 rounded-full bg-white/18 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-12 h-36 w-36 rounded-full bg-black/10 blur-2xl" />

      <div className="relative flex h-full flex-col gap-3 rounded-2xl bg-white/70 p-4 shadow-inner backdrop-blur-sm ring-1 ring-border/60 dark:bg-card/70">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <span>Open when</span>
            {letter.isLocked ? (
              <span className="rounded-full bg-foreground/10 px-2 py-1 text-[10px] font-semibold text-foreground">
                Locked
              </span>
            ) : (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                New
              </span>
            )}
          </div>
          <span className="text-lg leading-none">
            {letter.coverEmoji ?? "✉️"}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {letter.openWhen}
          </p>
          <h3 className="text-xl font-display text-foreground line-clamp-2">
            {letter.title}
          </h3>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {letter.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition duration-150 group-hover:translate-x-1">
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}
