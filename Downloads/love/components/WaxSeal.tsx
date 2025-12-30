import { cn } from "@/lib/utils";

export function WaxSeal({ className }: { className?: string }) {
  return (
    <span className={cn("wax-seal", className)}>
      <span className="wax-seal__shine" />
      <span className="wax-seal__icon">♥</span>
    </span>
  );
}
