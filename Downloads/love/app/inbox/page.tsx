import { db } from "@/lib/db";
import { EnvelopeCard } from "@/components/envelope-card";

type Letter = {
  id: string;
  title: string;
  openWhen: string;
  isNew: boolean;
  tags: string[];
  createdAt: string;
};

async function getRecipientLetters(search?: string): Promise<Letter[]> {
  try {
    const result = await db.execute({
      sql: `
        SELECT id, title, open_when, is_archived, mood_tags, created_at
        FROM letters
        WHERE status = 'sent' AND is_archived = 0
        ORDER BY created_at DESC
      `,
      args: [],
    });

    const filtered = result.rows.map((row) => {
      const record = row as Record<string, unknown>;
      const isArchived = Number(record.is_archived ?? 0) === 1;

      return {
        id: String(record.id),
        title: String(record.title),
        openWhen: String(record.open_when),
        isNew: !isArchived,
        tags: parseTags(record.mood_tags, record.open_when),
        createdAt: String(record.created_at ?? ""),
      };
    });

    if (search) {
      const term = search.toLowerCase();
      return filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(term) ||
          l.openWhen.toLowerCase().includes(term) ||
          l.tags.some((t) => t.toLowerCase().includes(term)),
      );
    }

    return filtered;
  } catch (error) {
    console.warn("DB not reachable; using sample inbox data.", error);
    return [
      {
        id: "sample-1",
        title: "Open when you need a smile",
        openWhen: "you need a smile",
        isNew: true,
        tags: ["smile"],
        createdAt: "",
      },
      {
        id: "sample-2",
        title: "Open when it's late and quiet",
        openWhen: "you can't sleep",
        isNew: true,
        tags: ["night"],
        createdAt: "",
      },
    ];
  }
}

function parseTags(raw: unknown, fallback: unknown) {
  const base = String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (base.length) return base;
  return String(fallback ?? "")
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const letters = await getRecipientLetters(q);

  const timeline = letters.reduce<Record<string, number>>((acc, letter) => {
    if (!letter.createdAt) return acc;
    const d = new Date(letter.createdAt);
    if (Number.isNaN(d.getTime())) return acc;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const timelineEntries = Object.entries(timeline).sort(([a], [b]) => (a > b ? -1 : 1));

  return (
    <main className="min-h-screen px-5 py-12 sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Recipient
          </p>
          <h1 className="text-3xl font-display text-foreground sm:text-4xl">
            Your Inbox
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Sealed envelopes waiting to be opened. Hover to preview; tap to open.
          </p>
        </header>

        <form className="flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by title or tag..."
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-96"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Search
          </button>
        </form>

        {letters.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center shadow-inner">
            <div className="space-y-2">
              <p className="text-lg font-display text-foreground">
                No letters yet
              </p>
              <p className="text-sm text-muted-foreground">
                When a new letter arrives, it will appear here as a sealed envelope.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            {letters.map((letter) => (
              <EnvelopeCard
                key={letter.id}
                id={letter.id}
                title={letter.title}
                openWhen={letter.openWhen}
                isNew={letter.isNew}
              />
            ))}
          </div>
        )}

        {timelineEntries.length > 0 ? (
          <div className="rounded-3xl bg-card/80 p-5 shadow-card ring-1 ring-border">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Timeline
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {timelineEntries.map(([month, count]) => (
                <div
                  key={month}
                  className="flex items-center justify-between rounded-2xl bg-background/70 px-3 py-2 text-sm shadow-inner ring-1 ring-border/70"
                >
                  <span className="font-semibold text-foreground">
                    {formatMonth(month)}
                  </span>
                  <span className="text-xs text-muted-foreground">{count} letters</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function formatMonth(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
