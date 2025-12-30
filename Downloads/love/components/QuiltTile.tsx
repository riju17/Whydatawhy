import { cn } from "@/lib/utils";

type QuiltTileProps = {
  title: string;
  description?: string;
  moodTag?: string;
  href?: string;
  className?: string;
  children?: React.ReactNode;
};

export function QuiltTile({
  title,
  description,
  moodTag,
  href,
  className,
  children,
}: QuiltTileProps) {
  const content = (
    <div className={cn("quilt-tile", className)}>
      <div className="quilt-tile__patchwork" aria-hidden />
      <div className="relative space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg text-foreground">{title}</h3>
          {moodTag ? (
            <span className="quilt-tile__tag">{moodTag}</span>
          ) : null}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {content}
      </a>
    );
  }

  return content;
}
