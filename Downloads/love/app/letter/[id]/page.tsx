/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { isLetterUnlocked } from "@/lib/auth/unlock-token";
import { getSession } from "@/lib/auth/session";
import { ReplyForm } from "./reply-form";
import { LockForm } from "./lock-form";
import { markOpened, type LockState } from "./lock-actions";
import { toggleFavoriteAction } from "./toggle-favorite-action";
import { PaperSheet } from "@/components/PaperSheet";
import { WaxSeal } from "@/components/WaxSeal";
import { StampCard } from "@/components/StampCard";

type Letter = {
  id: string;
  title: string;
  openWhen: string;
  content: string;
  template: string;
  createdAt: string;
  imageUrl?: string | null;
  palette?: string | null;
  isFavorite: boolean;
  isOpened: boolean;
  lock: LockInfo;
  replies: Reply[];
};

export type LockInfo = {
  type: "none" | "pin" | "quiz";
  hint: string | null;
  allowSkip: boolean;
  attempts: number;
  quizPrompt: string | null;
};

type Reply = {
  id: string;
  reaction: string;
  message: string;
  createdAt: string;
};

async function getLetter(id: string, unlocked: boolean): Promise<Letter | null> {
  const result = await db.execute({
    sql: `
      SELECT
        letters.id,
        letters.title,
        letters.open_when,
        ${unlocked ? "letters.content_md" : "NULL as content_md"},
        letters.template,
        letters.created_at,
        letters.image_url,
        letters.palette,
        letters.is_favorite,
        letters.opened_at,
        letters.status,
        letters.send_at,
        letters.sent_at,
        letters.last_viewed_at,
        l.pin_hash,
        l.quiz_prompt,
        l.quiz_answer_hash,
        l.hint,
        l.allow_skip,
        l.attempts
      FROM letters
      LEFT JOIN locks l ON l.letter_id = letters.id
      WHERE letters.id = ?
      LIMIT 1
      `,
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title),
    openWhen: String(row.open_when),
    content: String(row.content_md ?? ""),
    template: String(row.template ?? "postcard"),
    createdAt: String(row.created_at ?? ""),
    imageUrl: (row.image_url as string | null) ?? null,
    palette: (row.palette as string | null) ?? null,
    isFavorite: Number(row.is_favorite ?? 0) === 1,
    isOpened: Boolean(row.opened_at),
    lock: {
      type: row.pin_hash
        ? "pin"
        : row.quiz_answer_hash
          ? "quiz"
          : "none",
      hint: (row.hint as string | null) ?? null,
      allowSkip: Number(row.allow_skip ?? 0) === 1,
      attempts: Number(row.attempts ?? 0),
      quizPrompt: (row.quiz_prompt as string | null) ?? null,
    },
    replies: await getReplies(id),
  };
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const openWhenPalettes = {
  rose: {
    bg: "#f7f1e8",
    text: "#b4373a",
    border: "#d65b5c",
    accent: "#d65b5c",
  },
  navy: {
    bg: "#f1f4fb",
    text: "#1f355b",
    border: "#3a4f7a",
    accent: "#6fa3ff",
  },
  sage: {
    bg: "#f4f7f3",
    text: "#3d5a4a",
    border: "#6f9c87",
    accent: "#9bbfa9",
  },
} as const;

type PaletteKey = keyof typeof openWhenPalettes;

function TemplateRenderer({ letter }: { letter: Letter }) {
  const { template } = letter;

  switch (template) {
    case "ancient":
      return <AncientTemplate letter={letter} />;
    case "sticky":
      return <StickyTemplate letter={letter} />;
    case "polaroid":
      return <PolaroidTemplate letter={letter} />;
    case "telegram":
      return <TelegramTemplate letter={letter} />;
    case "openwhen":
      return <OpenWhenTemplate letter={letter} />;
    case "postcard":
    default:
      return <PostcardTemplate letter={letter} />;
  }
}

export default async function LetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const unlocked = await isLetterUnlocked(id);
  const letter = await getLetter(id, unlocked);
  if (!letter) return notFound();

  if (unlocked) {
    await markOpened(id);
  }

  const session = await getSession();
  const isRecipient = session?.role === "recipient";

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Open when: {letter.openWhen}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-display text-foreground sm:text-4xl">
              {letter.title}
            </h1>
            <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground ring-1 ring-border">
              {letter.template || "postcard"}
            </span>
            {letter.isOpened ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground ring-1 ring-border">
                Opened
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatDate(letter.createdAt)}</span>
          </div>
        </header>

        <div className="envelope-shell">
          {letter.lock.type !== "none" && !unlocked ? (
            <LockPanel letterId={letter.id} lock={letter.lock} />
          ) : (
            <TemplateRenderer letter={letter} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form action={toggleFavoriteAction} className="w-fit">
            <input type="hidden" name="id" value={letter.id} />
            <button
              type="submit"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                letter.isFavorite
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <span aria-hidden>★</span>
              {letter.isFavorite ? "Favorited" : "Mark favorite"}
            </button>
          </form>
        </div>

        {unlocked && isRecipient ? (
          <div className="space-y-4 rounded-3xl bg-card/70 p-5 shadow-card ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Reply
                </p>
                <h2 className="text-xl font-display text-foreground">
                  Send a short reply
                </h2>
              </div>
            </div>

            <ReplyForm letterId={letter.id} />

            <ReplyList replies={letter.replies} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

function LockPanel({
  letterId,
  lock,
}: {
  letterId: string;
  lock: LockInfo;
}) {
  const initialState: LockState = {
    status: "locked",
    attempts: lock.attempts,
    allowSkip: lock.allowSkip,
    showHint: lock.attempts >= 1 && !!lock.hint,
    hint: lock.attempts >= 1 ? lock.hint : null,
    canSkip: lock.allowSkip && lock.attempts >= 2,
  };

  return (
    <LockForm
      letterId={letterId}
      lock={lock}
      initialState={initialState}
    />
  );
}

async function getReplies(letterId: string): Promise<Reply[]> {
  const result = await db.execute({
    sql: `
      SELECT id, content_md, created_at
      FROM replies
      WHERE letter_id = ?
      ORDER BY created_at DESC
    `,
    args: [letterId],
  });

  return result.rows.map((row) => {
    const record = row as Record<string, unknown>;
    const raw = String(record.content_md ?? "");
    const parsed = parseStoredReply(raw);
    return {
      id: String(record.id),
      reaction: parsed.reaction,
      message: parsed.message,
      createdAt: String(record.created_at ?? ""),
    };
  });
}

function parseStoredReply(raw: string) {
  if (raw.startsWith("REACTION:")) {
    const [, rest] = raw.split("REACTION:");
    const [reactionLine, ...contentLines] = rest.split("\n");
    const reaction = reactionLine?.trim() || "💌";
    const message = contentLines.join("\n").trim();
    return { reaction, message };
  }
  return { reaction: "💌", message: raw };
}

function ReplyList({ replies }: { replies: Reply[] }) {
  if (!replies.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No replies yet. Your words will show here once sent.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className="flex items-start gap-3 rounded-2xl bg-background/70 p-3 shadow-inner ring-1 ring-border/60"
        >
          <span className="text-lg">{reply.reaction}</span>
          <div className="flex flex-col">
            <p className="text-sm text-foreground">{reply.message}</p>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(reply.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PostcardTemplate({ letter }: { letter: Letter }) {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.05fr_0.95fr]">
      <PaperSheet variant="postcard" className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Postcard
            </p>
            <h3 className="mt-2 font-display text-2xl text-foreground">{letter.title}</h3>
            <p className="text-sm text-muted-foreground">Open when {letter.openWhen}</p>
          </div>
          <StampCard cornerText="Air Mail" className="w-28">
            <p className="text-center text-lg">✸</p>
          </StampCard>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-foreground">
          {letter.content.split("\n").map((line, idx) => (
            <p key={idx} className="whitespace-pre-wrap">
              {line}
            </p>
          ))}
        </div>
      </PaperSheet>

      <PaperSheet variant="postcard" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.05)_0_1px,transparent_1px_12px)] opacity-40" />
        <div className="relative grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">To</p>
            <p className="font-display text-xl text-foreground">Recipient</p>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">From</p>
            <p className="font-display text-xl text-foreground">Sender</p>
          </div>
        </div>
      </PaperSheet>
    </div>
  );
}

function AncientTemplate({ letter }: { letter: Letter }) {
  return (
    <PaperSheet variant="ancient" className="relative mx-auto max-w-3xl space-y-5 text-[#3a2c1a]">
      <div className="absolute right-6 top-6">
        <WaxSeal />
      </div>
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#6b5235]">
            Ancient scroll
          </p>
          <h2 className="mt-1 font-display text-3xl text-[#3a2c1a]">{letter.title}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#e7d5b8] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5a4125] shadow-inner ring-1 ring-[#d6bd95]">
          <span>Wax seal</span>
          <span aria-hidden>✧</span>
        </div>
      </div>

      <div className="relative space-y-4 text-[17px] leading-[1.8] text-[#3a2c1a]">
        {letter.content.split("\n").map((line, idx) => (
          <p key={idx} className="first-letter:text-2xl first-letter:font-semibold">
            {line}
          </p>
        ))}
      </div>
    </PaperSheet>
  );
}

function StickyTemplate({ letter }: { letter: Letter }) {
  return (
    <PaperSheet variant="sticky" className="mx-auto max-w-xl">
      <div className="relative space-y-4 font-hand text-[18px] leading-7 text-[#5b4a1e]">
        {letter.content.split("\n").map((line, idx) => (
          <p key={idx} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
      </div>
    </PaperSheet>
  );
}

function PolaroidTemplate({ letter }: { letter: Letter }) {
  return (
    <PaperSheet variant="polaroid" className="mx-auto flex max-w-xl flex-col items-center gap-4">
      <div className="h-64 w-full overflow-hidden rounded-[18px] bg-gradient-to-br from-secondary to-primary/40 shadow-inner">
        {letter.imageUrl ? (
          <img
            src={letter.imageUrl}
            alt={letter.title}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="w-full rounded-xl bg-white p-4 shadow-inner ring-1 ring-border/70">
        <h3 className="font-display text-xl text-foreground">{letter.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {letter.content.slice(0, 120)}...
        </p>
      </div>
    </PaperSheet>
  );
}

function TelegramTemplate({ letter }: { letter: Letter }) {
  return (
    <PaperSheet variant="telegram" className="font-mono text-[13px] leading-relaxed text-foreground">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>Telegram</span>
        <span>{formatDate(letter.createdAt)}</span>
      </div>
      <div className="space-y-2 whitespace-pre-wrap">
        {letter.content.split("\n").map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>
    </PaperSheet>
  );
}

function OpenWhenTemplate({ letter }: { letter: Letter }) {
  const palette =
    openWhenPalettes[(letter.palette as PaletteKey) ?? "rose"] ??
    openWhenPalettes.rose;

  return (
    <div
      className="openwhen-frame relative mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10 shadow-card"
      style={{
        background: palette.bg,
        color: palette.text,
        boxShadow: `0 0 0 1px ${palette.border}`,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: palette.text }}>
            Open when
          </p>
          <h1 className="text-3xl font-display" style={{ color: palette.text }}>
            {letter.openWhen}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {[letter.coverEmoji || "💌", "❤️"].map((stamp, idx) => (
            <div
              key={idx}
              className="flex h-16 w-14 items-center justify-center rounded-md border-2 bg-white/70 text-xl shadow-inner"
              style={{ borderColor: palette.border, color: palette.text }}
            >
              {stamp}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <p className="font-hand text-2xl" style={{ color: palette.text }}>
          My love,
        </p>

        {letter.imageUrl ? (
          <div
            className="overflow-hidden rounded-xl border bg-white/80"
            style={{ borderColor: palette.border }}
          >
            <img
              src={letter.imageUrl}
              alt={letter.title}
              className="h-56 w-full object-cover"
            />
          </div>
        ) : null}

        <div className="space-y-4 font-hand text-[18px] leading-7" style={{ color: palette.text }}>
          {letter.content.split("\n").map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>

        <div
          className="flex items-center justify-between text-sm uppercase tracking-[0.2em]"
          style={{ color: palette.text }}
        >
          <span>{formatDate(letter.createdAt)}</span>
          <span className="font-display text-base" style={{ color: palette.text }}>
            Sealed with love
          </span>
        </div>
      </div>
    </div>
  );
}
