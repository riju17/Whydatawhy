import { cn } from "@/lib/utils";

type StampCardProps = {
  children: React.ReactNode;
  className?: string;
  cornerText?: string;
};

export function StampCard({ children, className, cornerText }: StampCardProps) {
  return (
    <div className={cn("stamp-card", className)}>
      {cornerText ? <span className="stamp-card__corner">{cornerText}</span> : null}
      <div className="stamp-card__inner">{children}</div>
    </div>
  );
}
