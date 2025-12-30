import { cn } from "@/lib/utils";

type PaperSheetProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "plain" | "postcard" | "ancient" | "sticky" | "polaroid" | "telegram";
};

export function PaperSheet({
  children,
  className,
  variant = "plain",
}: PaperSheetProps) {
  return (
    <div className={cn("paper-sheet", `paper-sheet--${variant}`, className)}>
      {children}
    </div>
  );
}
