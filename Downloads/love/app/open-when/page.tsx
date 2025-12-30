import { db } from "@/lib/db";
import type { OpenWhenLetter } from "@/components/open-when-tile";
import { OpenWhenGrid } from "./open-when-grid";

type RawRow = Record<string, unknown>;

async function getOpenWhenLetters(): Promise<OpenWhenLetter[]> {
  const result = await db.execute({
    sql: `
      SELECT
        letters.id,
        letters.title,
        letters.open_when,
        letters.cover_emoji,
        letters.mood_tags,
        letters.created_at,
        l.pin_hash,
        l.quiz_answer_hash
      FROM letters
      LEFT JOIN locks l ON l.letter_id = letters.id
      WHERE letters.is_archived = 0 AND letters.status = 'sent'
      ORDER BY letters.created_at DESC
    `,
    args: [],
  });

  return result.rows.map((row) => {
    const r = row as RawRow;
    const rawTags = String(r.mood_tags ?? "").trim();
    const tags =
      rawTags.length > 0
        ? rawTags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : String(r.open_when ?? "")
            .split(" ")
            .slice(0, 3)
            .map((t) => t.trim())
            .filter(Boolean);

    const isLocked =
      (r.pin_hash as string | null) !== null ||
      (r.quiz_answer_hash as string | null) !== null;

    return {
      id: String(r.id),
      title: String(r.title),
      openWhen: String(r.open_when),
      tags,
      coverEmoji: (r.cover_emoji as string | null) ?? null,
      isLocked,
      createdAt: String(r.created_at ?? ""),
    };
  });
}

export default async function OpenWhenPage() {
  const letters = await getOpenWhenLetters();

  return (
    <main className="min-h-screen px-5 py-12 sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Open When...
          </p>
          <h1 className="text-3xl font-display text-foreground sm:text-4xl">
            A Quilt of Sealed Letters
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Pick a mood, tap an envelope, and the lock will guide you through.
          </p>
        </header>

        <OpenWhenGrid letters={letters} />
      </section>
    </main>
  );
}
