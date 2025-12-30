import Link from "next/link";
import { db } from "@/lib/db";

type LetterRow = {
  id: string;
  title: string;
  openWhen: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  sendAt?: string | null;
  opensCount?: number;
  lastViewedAt?: string | null;
  favoriteToggles?: number;
};

async function getDrafts(): Promise<LetterRow[]> {
  try {
    const res = await db.execute({
      sql: `
        SELECT id, title, open_when, created_at, updated_at, status
        FROM letters
        WHERE status = 'draft'
        ORDER BY updated_at DESC
      `,
      args: [],
    });
    return res.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        title: String(r.title ?? "Untitled"),
        openWhen: String(r.open_when ?? ""),
        createdAt: String(r.created_at ?? ""),
        updatedAt: String(r.updated_at ?? r.created_at ?? ""),
        status: String(r.status ?? "draft"),
      };
    });
  } catch (error) {
    console.warn("Drafts fetch failed; returning empty list.", error);
    return [];
  }
}

async function getSent(): Promise<LetterRow[]> {
  try {
    const res = await db.execute({
      sql: `
        SELECT id, title, open_when, created_at, updated_at, status, opens_count, last_viewed_at, favorite_toggles
        FROM letters
        WHERE status = 'sent'
        ORDER BY created_at DESC
      `,
      args: [],
    });
    return res.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        title: String(r.title ?? "Untitled"),
        openWhen: String(r.open_when ?? ""),
        createdAt: String(r.created_at ?? ""),
        updatedAt: String(r.updated_at ?? r.created_at ?? ""),
        status: String(r.status ?? "sent"),
        opensCount: Number(r.opens_count ?? 0),
        lastViewedAt: (r.last_viewed_at as string | null) ?? null,
        favoriteToggles: Number(r.favorite_toggles ?? 0),
      };
    });
  } catch (error) {
    console.warn("Sent fetch failed; returning empty list.", error);
    return [];
  }
}

async function getScheduled(): Promise<LetterRow[]> {
  try {
    const res = await db.execute({
      sql: `
        SELECT id, title, open_when, created_at, updated_at, status, send_at
        FROM letters
        WHERE status = 'scheduled'
        ORDER BY send_at ASC NULLS LAST, updated_at DESC
      `,
      args: [],
    });
    return res.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        title: String(r.title ?? "Untitled"),
        openWhen: String(r.open_when ?? ""),
        createdAt: String(r.created_at ?? ""),
        updatedAt: String(r.updated_at ?? r.created_at ?? ""),
        status: String(r.status ?? "scheduled"),
        sendAt: (r.send_at as string | null) ?? null,
      };
    });
  } catch (error) {
    console.warn("Scheduled fetch failed; returning empty list.", error);
    return [];
  }
}

async function getMostLoved(): Promise<LetterRow[]> {
  try {
    const res = await db.execute({
      sql: `
        SELECT id, title, open_when, favorite_toggles
        FROM letters
        WHERE status = 'sent'
        ORDER BY favorite_toggles DESC NULLS LAST, created_at DESC
        LIMIT 5
      `,
      args: [],
    });
    return res.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        title: String(r.title ?? "Untitled"),
        openWhen: String(r.open_when ?? ""),
        createdAt: "",
        updatedAt: "",
        status: "sent",
        favoriteToggles: Number(r.favorite_toggles ?? 0),
      };
    });
  } catch (error) {
    console.warn("Most loved fetch failed; returning empty list.", error);
    return [];
  }
}

async function getRecentlyOpened(): Promise<LetterRow[]> {
  try {
    const res = await db.execute({
      sql: `
        SELECT id, title, open_when, last_viewed_at
        FROM letters
        WHERE status = 'sent' AND last_viewed_at IS NOT NULL
        ORDER BY last_viewed_at DESC
        LIMIT 5
      `,
      args: [],
    });
    return res.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        title: String(r.title ?? "Untitled"),
        openWhen: String(r.open_when ?? ""),
        createdAt: "",
        updatedAt: "",
        status: "sent",
        lastViewedAt: (r.last_viewed_at as string | null) ?? null,
      };
    });
  } catch (error) {
    console.warn("Recently opened fetch failed; returning empty list.", error);
    return [];
  }
}

async function getOpenWhenUsage() {
  try {
    const res = await db.execute({
      sql: `
        SELECT open_when, COUNT(*) as count
        FROM letters
        WHERE status = 'sent'
        GROUP BY open_when
        ORDER BY count DESC
        LIMIT 12
      `,
      args: [],
    });
    return res.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { openWhen: String(r.open_when ?? ""), count: Number(r.count ?? 0) };
    });
  } catch (error) {
    console.warn("Open when usage fetch failed; returning empty list.", error);
    return [];
  }
}

export default async function AdminPage() {
  const [drafts, sent, scheduled, mostLoved, recentlyOpened, usage] = await Promise.all([
    getDrafts(),
    getSent(),
    getScheduled(),
    getMostLoved(),
    getRecentlyOpened(),
    getOpenWhenUsage(),
  ]);

  return (
    <main className="min-h-screen px-6 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Admin
              </p>
              <h1 className="text-3xl font-display text-foreground sm:text-4xl">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose what to do next: Open When, a note, or view stats.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/compose?template=openwhen"
              className="group rounded-3xl border border-border bg-card/80 p-5 shadow-card transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Open When
              </p>
              <h3 className="mt-1 text-xl font-display text-foreground">Write an Open When</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                One-way letters with the special stamp look.
              </p>
              <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Start <span aria-hidden>→</span>
              </span>
            </Link>

            <Link
              href="/admin/compose?template=postcard"
              className="group rounded-3xl border border-border bg-card/80 p-5 shadow-card transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Notes
              </p>
              <h3 className="mt-1 text-xl font-display text-foreground">Send a note</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Two-way templates: postcard, polaroid, sticky, telegram, etc.
              </p>
              <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Start <span aria-hidden>→</span>
              </span>
            </Link>

            <Link
              href="#stats"
              className="group rounded-3xl border border-border bg-card/80 p-5 shadow-card transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Stats
              </p>
              <h3 className="mt-1 text-xl font-display text-foreground">View activity</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Opens, favorites, timelines, and usage insights.
              </p>
              <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                View <span aria-hidden>→</span>
              </span>
            </Link>
          </div>
        </header>

        <section className="rounded-3xl bg-card/80 p-6 shadow-card ring-1 ring-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display text-foreground">Scheduled</h2>
            <span className="text-sm text-muted-foreground">
              {scheduled.length} scheduled
            </span>
          </div>
          {scheduled.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing scheduled yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {scheduled.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-1 rounded-2xl bg-background/70 p-3 shadow-inner ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Open when {s.openWhen || "..."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Sends {s.sendAt ? new Date(s.sendAt).toLocaleString() : "TBD"}
                    </span>
                    <Link
                      href={`/letter/${s.id}`}
                      className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="stats" className="grid gap-4 rounded-3xl bg-card/80 p-6 shadow-card ring-1 ring-border md:grid-cols-2">
          <div>
            <h2 className="text-xl font-display text-foreground">Most loved</h2>
            <p className="text-sm text-muted-foreground">Based on favorite toggles</p>
            <div className="mt-3 space-y-2">
              {mostLoved.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-2xl bg-background/70 px-3 py-2 text-sm shadow-inner ring-1 ring-border/70"
                >
                  <span className="font-semibold text-foreground">{row.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.favoriteToggles} ♥
                  </span>
                </div>
              ))}
              {mostLoved.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : null}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display text-foreground">Recently opened</h2>
            <p className="text-sm text-muted-foreground">Last viewed times</p>
            <div className="mt-3 space-y-2">
              {recentlyOpened.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-2xl bg-background/70 px-3 py-2 text-sm shadow-inner ring-1 ring-border/70"
                >
                  <span className="font-semibold text-foreground">{row.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.lastViewedAt
                      ? new Date(row.lastViewedAt).toLocaleString()
                      : "n/a"}
                  </span>
                </div>
              ))}
              {recentlyOpened.length === 0 ? (
                <p className="text-sm text-muted-foreground">No openings yet.</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-card/80 p-6 shadow-card ring-1 ring-border">
          <h2 className="text-xl font-display text-foreground">Open When usage</h2>
          <p className="text-sm text-muted-foreground">Top “Open when...” phrases</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {usage.map((item) => (
              <div
                key={item.openWhen}
                className="flex items-center justify-between rounded-2xl bg-background/70 px-3 py-2 text-sm shadow-inner ring-1 ring-border/70"
              >
                <span className="font-semibold text-foreground">
                  {item.openWhen || "Unspecified"}
                </span>
                <span className="text-xs text-muted-foreground">{item.count}×</span>
              </div>
            ))}
            {usage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl bg-card/80 p-6 shadow-card ring-1 ring-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display text-foreground">Drafts</h2>
            <span className="text-sm text-muted-foreground">
              {drafts.length} draft{drafts.length === 1 ? "" : "s"}
            </span>
          </div>
          {drafts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No drafts yet. Start one from Compose.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col gap-1 rounded-2xl bg-background/70 p-3 shadow-inner ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{d.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Open when {d.openWhen || "..." }
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Updated {new Date(d.updatedAt).toLocaleString()}</span>
                    <Link
                      href={`/letter/${d.id}`}
                      className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-card/80 p-6 shadow-card ring-1 ring-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display text-foreground">Sent</h2>
            <span className="text-sm text-muted-foreground">
              {sent.length} sent
            </span>
          </div>
          {sent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing sent yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {sent.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-1 rounded-2xl bg-background/70 p-3 shadow-inner ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Open when {s.openWhen || "..." }
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Sent {new Date(s.createdAt).toLocaleString()}</span>
                    <Link
                      href={`/letter/${s.id}`}
                      className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
