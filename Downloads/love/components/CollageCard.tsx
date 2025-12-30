import { cn } from "@/lib/utils";

type CollageCardProps = {
  title: string;
  subtitle?: string;
  sticker?: string;
  children?: React.ReactNode;
  className?: string;
};

export function CollageCard({
  title,
  subtitle,
  sticker = "✶",
  children,
  className,
}: CollageCardProps) {
  return (
    <div className={cn("collage-card", className)}>
      <div className="collage-card__layer collage-card__layer--tape" aria-hidden />
      <div className="collage-card__layer collage-card__layer--paper" aria-hidden />
      <div className="collage-card__layer collage-card__layer--accent" aria-hidden />
      <div className="collage-card__content">
        <div className="flex items-center gap-2">
          <span className="collage-card__sticker">{sticker}</span>
          <h3 className="font-display text-lg text-foreground">{title}</h3>
        </div>
        {subtitle ? (
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-3 space-y-2 text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}
