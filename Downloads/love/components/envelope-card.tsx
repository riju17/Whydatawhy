import Link from "next/link";
import { cn } from "@/lib/utils";

type EnvelopeCardProps = {
  id: string;
  title: string;
  openWhen: string;
  isNew?: boolean;
};

export function EnvelopeCard({ id, title, openWhen, isNew }: EnvelopeCardProps) {
  return (
    <Link
      href={`/letter/${id}`}
      className="envelope-card group relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="envelope-card__outer">
        <div className="envelope-card__inner">
          <div className="envelope-card__top">
            <div className="flex items-center gap-3">
              <span className="stamp-dot" aria-hidden />
              <div className="flex flex-col">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Open when
                </p>
                <p className="text-sm font-semibold text-foreground">{openWhen}</p>
              </div>
            </div>
            <span className="envelope-card__mini-stamp">✶</span>
          </div>

          <div className="envelope-card__body">
            <h3 className="line-clamp-2 font-display text-xl text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap to break the seal and read.
            </p>
          </div>

          <div
            className={cn(
              "envelope-card__meta",
              isNew ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="seal" aria-hidden />
              {isNew ? "Newly sealed" : "Sealed"}
            </span>
            <span className="transition duration-150 group-hover:translate-x-1">
              Open →
            </span>
          </div>
        </div>
        <span className="envelope-card__tab" />
      </div>
    </Link>
  );
}
