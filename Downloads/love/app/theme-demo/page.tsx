import Link from "next/link";
import { EnvelopeCard } from "@/components/envelope-card";
import { StampCard } from "@/components/StampCard";
import { QuiltTile } from "@/components/QuiltTile";
import { CollageCard } from "@/components/CollageCard";
import { ThemedSurface } from "@/components/ThemedSurface";
import { PaperSheet } from "@/components/PaperSheet";
import { WaxSeal } from "@/components/WaxSeal";

export default function ThemeDemoPage() {
  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Theme Lab
            </p>
            <h1 className="text-3xl font-display text-foreground sm:text-4xl">
              Immersive theme demo
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Switch themes in Settings and reload this page to see every element update.
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open Settings
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <ThemedSurface variant="panel" className="p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-display text-foreground">Surfaces</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ThemedSurface variant="card" className="p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Card</p>
                <p className="text-sm text-muted-foreground">Base surface styling.</p>
              </ThemedSurface>
              <ThemedSurface variant="paper" className="p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Paper</p>
                <p className="text-sm text-muted-foreground">Paper sheet texture.</p>
              </ThemedSurface>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StampCard cornerText="Stamp">
                <p className="text-sm text-foreground">Perforated edges + ink.</p>
              </StampCard>
              <QuiltTile title="Quilt tile" description="Patchwork blocks" moodTag="cozy" />
              <CollageCard title="Collage" subtitle="Scrapbook">
                <p>Layered paper + tape sticker.</p>
              </CollageCard>
            </div>
          </ThemedSurface>

          <ThemedSurface variant="panel" className="p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-display text-foreground">Envelope & Wax</h2>
            <EnvelopeCard id="demo" title="Demo letter" openWhen="you need to smile" isNew />
            <div className="flex gap-3">
              <WaxSeal />
              <WaxSeal />
            </div>
          </ThemedSurface>
        </div>

        <ThemedSurface variant="paper" className="p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-display text-foreground">Letter sheets</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <PaperSheet variant="postcard">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Postcard</p>
              <p className="mt-2 text-foreground">Front/back lines and stamp corner.</p>
            </PaperSheet>
            <PaperSheet variant="ancient">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Ancient</p>
              <p className="mt-2 text-foreground">Parchment + wax seal texture.</p>
            </PaperSheet>
            <PaperSheet variant="sticky">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Sticky</p>
              <p className="mt-2 text-foreground">Taped sticky note.</p>
            </PaperSheet>
            <PaperSheet variant="telegram">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Telegram</p>
              <p className="mt-2 text-foreground">Mono paper strip.</p>
            </PaperSheet>
          </div>
        </ThemedSurface>
      </div>
    </main>
  );
}
