import { cookies } from "next/headers";
import { ThemedSurface } from "@/components/ThemedSurface";
import { ThemeToggle } from "./theme-toggle";

export default async function SettingsPage() {
  const theme = (await cookies()).get("theme")?.value ?? "cozy";

  return (
    <main className="min-h-screen px-5 py-12 sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <ThemedSurface variant="panel" className="p-6 sm:p-8">
          <header className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Settings
            </p>
            <h1 className="text-3xl font-display text-foreground sm:text-4xl">
              Theme &amp; Feel
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Swap the look to match your mood. Changes apply across the whole site.
            </p>
          </header>

          <div className="mt-6">
            <ThemeToggle current={theme} />
          </div>
        </ThemedSurface>
      </section>
    </main>
  );
}
