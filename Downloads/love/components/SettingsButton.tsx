"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsButton() {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith("/settings");

  return (
    <Link
      href="/settings"
      className={`fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ring-1 transition backdrop-blur ${
        isSettings
          ? "bg-primary text-primary-foreground ring-primary/40"
          : "bg-card/90 text-foreground ring-border hover:-translate-y-0.5 hover:shadow-xl"
      }`}
    >
      <span aria-hidden>⚙️</span>
      <span>Settings</span>
    </Link>
  );
}
