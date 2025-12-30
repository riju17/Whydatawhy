"use server";

import { randomUUID, createHash } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";

const templates = ["postcard", "ancient", "sticky", "polaroid", "telegram", "openwhen"] as const;
const lockTypes = ["none", "pin", "quiz"] as const;

const palettes = ["rose", "navy", "sage"] as const;

const draftSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().optional().default(""),
  openWhen: z.string().trim().optional().default(""),
  content: z.string().trim().optional().default(""),
  template: z.enum(templates).default("postcard"),
  palette: z.enum(palettes).optional().default("rose"),
  coverEmoji: z.string().trim().max(8).optional().nullable(),
  lockType: z.enum(lockTypes).default("none"),
  pin: z.string().trim().optional().nullable(),
  quizPrompt: z.string().trim().optional().nullable(),
  quizAnswer: z.string().trim().optional().nullable(),
  hint: z.string().trim().max(160).optional().nullable(),
  allowSkip: z.boolean().optional(),
  sendAt: z.string().trim().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

const sendSchema = draftSchema.extend({
  title: z.string().trim().min(3, "Title is required"),
  openWhen: z.string().trim().min(3, "Open when is required"),
  content: z.string().trim().min(10, "Content needs at least 10 characters"),
});

const scheduleSchema = sendSchema.extend({
  sendAt: z.string().trim().min(1, "Send time required"),
});

export type ComposeState = {
  status?: "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  draftId?: string;
};

const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const upsertLock = async (letterId: string, data: z.infer<typeof draftSchema>) => {
  const isPin = data.lockType === "pin";
  const isQuiz = data.lockType === "quiz";
  const hasLock = isPin || isQuiz;

  const lockRow = await db.execute({
    sql: `SELECT id FROM locks WHERE letter_id = ? LIMIT 1`,
    args: [letterId],
  });
  const existingId =
    lockRow.rows.length > 0
      ? String((lockRow.rows[0] as Record<string, unknown>).id)
      : null;

  if (!hasLock) {
    if (existingId) {
      await db.execute({
        sql: `DELETE FROM locks WHERE letter_id = ?`,
        args: [letterId],
      });
    }
    return;
  }

  // Validate locks when present
  if (isPin && !data.pin) {
    throw new Error("PIN is required for PIN lock.");
  }
  if (isQuiz && (!data.quizPrompt || !data.quizAnswer)) {
    throw new Error("Quiz prompt and answer are required for quiz lock.");
  }

  const pinHash = isPin && data.pin ? hashValue(data.pin) : null;
  const quizHash = isQuiz && data.quizAnswer ? hashValue(data.quizAnswer) : null;
  const lockId = existingId ?? randomUUID();

  await db.execute({
    sql: `
      INSERT INTO locks (id, letter_id, pin_hash, quiz_prompt, quiz_answer_hash, hint, allow_skip, attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(letter_id) DO UPDATE SET
        pin_hash = excluded.pin_hash,
        quiz_prompt = excluded.quiz_prompt,
        quiz_answer_hash = excluded.quiz_answer_hash,
        hint = excluded.hint,
        allow_skip = excluded.allow_skip
    `,
    args: [
      lockId ?? randomUUID(),
      letterId,
      pinHash ?? null,
      isQuiz ? data.quizPrompt ?? null : null,
      quizHash ?? null,
      data.hint ?? null,
      data.allowSkip ? 1 : 0,
    ],
  });
};

export async function saveDraftAction(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const parsed = draftSchema.safeParse({
    id: formData.get("id") || null,
    title: formData.get("title"),
    openWhen: formData.get("openWhen"),
    content: formData.get("content"),
    template: formData.get("template"),
    coverEmoji: formData.get("coverEmoji") || null,
    palette: formData.get("palette") || "rose",
    lockType: formData.get("lockType") || "none",
    pin: formData.get("pin") || null,
    quizPrompt: formData.get("quizPrompt") || null,
    quizAnswer: formData.get("quizAnswer") || null,
    hint: formData.get("hint") || null,
    allowSkip: formData.get("allowSkip") === "on",
    sendAt: formData.get("sendAt") || null,
    imageUrl: formData.get("imageUrl") || null,
  });

  if (!parsed.success) {
    return { status: "error", message: "Could not save draft." };
  }

  const data = parsed.data;
  const letterId = data.id ?? randomUUID();

  try {
    if (data.id) {
      await db.execute({
        sql: `
          UPDATE letters
          SET title = ?, open_when = ?, content_md = ?, template = ?, palette = ?, cover_emoji = ?, image_url = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP, send_at = ?
          WHERE id = ?
        `,
        args: [
          data.title ?? "",
          data.openWhen ?? "",
          data.content ?? "",
          data.template ?? "postcard",
          data.palette ?? "rose",
          data.coverEmoji || null,
          data.imageUrl || null,
          data.sendAt ? new Date(data.sendAt as string).toISOString() : null,
          letterId,
        ],
      });
    } else {
      await db.execute({
        sql: `
          INSERT INTO letters (id, title, open_when, content_md, template, palette, cover_emoji, image_url, status, is_archived, updated_at, send_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, CURRENT_TIMESTAMP, ?)
        `,
        args: [
          letterId,
          data.title ?? "",
          data.openWhen ?? "",
          data.content ?? "",
          data.template ?? "postcard",
          data.palette ?? "rose",
          data.coverEmoji || null,
          data.imageUrl || null,
          data.sendAt ? new Date(data.sendAt as string).toISOString() : null,
        ],
      });
    }

    await upsertLock(letterId, data);

    return {
      status: "success",
      message: "Draft saved",
      draftId: letterId,
    };
  } catch (error) {
    console.error("Failed to save draft", error);
    return { status: "error", message: "Could not save draft." };
  }
}

export async function sendLetterAction(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const parsed = sendSchema.safeParse({
    id: formData.get("id") || null,
    title: formData.get("title"),
    openWhen: formData.get("openWhen"),
    content: formData.get("content"),
    template: formData.get("template"),
    coverEmoji: formData.get("coverEmoji") || null,
    palette: formData.get("palette") || "rose",
    lockType: formData.get("lockType") || "none",
    pin: formData.get("pin") || null,
    quizPrompt: formData.get("quizPrompt") || null,
    quizAnswer: formData.get("quizAnswer") || null,
    hint: formData.get("hint") || null,
    allowSkip: formData.get("allowSkip") === "on",
    sendAt: null,
    imageUrl: formData.get("imageUrl") || null,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const path = issue.path[0]?.toString() ?? "form";
      errors[path] = issue.message;
    });
    return { status: "error", message: "Fix the errors below.", errors };
  }

  const data = parsed.data;
  const letterId = data.id ?? randomUUID();

  const isPin = data.lockType === "pin";
  const isQuiz = data.lockType === "quiz";

  if (isPin && !data.pin) {
    return { status: "error", message: "PIN is required for PIN lock.", errors: { pin: "PIN is required" } };
  }
  if (isQuiz && (!data.quizPrompt || !data.quizAnswer)) {
    return { status: "error", message: "Quiz question and answer are required.", errors: { quizPrompt: "Required", quizAnswer: "Required" } };
  }

  try {
    if (data.id) {
      await db.execute({
        sql: `
          UPDATE letters
          SET title = ?, open_when = ?, content_md = ?, template = ?, palette = ?, cover_emoji = ?, image_url = ?, status = 'sent', updated_at = CURRENT_TIMESTAMP, send_at = NULL, sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP)
          WHERE id = ?
        `,
        args: [
          data.title,
          data.openWhen,
          data.content,
          data.template,
          data.palette ?? "rose",
          data.coverEmoji || null,
          data.imageUrl || null,
          letterId,
        ],
      });
    } else {
      await db.execute({
        sql: `
          INSERT INTO letters (id, title, open_when, content_md, template, palette, cover_emoji, image_url, status, is_archived, updated_at, send_at, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', 0, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
        `,
        args: [
          letterId,
          data.title,
          data.openWhen,
          data.content,
          data.template,
          data.palette ?? "rose",
          data.coverEmoji || null,
          data.imageUrl || null,
        ],
      });
    }

    await upsertLock(letterId, data);

    return {
      status: "success",
      message: "Letter sent.",
      draftId: letterId,
    };
  } catch (error) {
    console.error("Failed to send letter", error);
    return {
      status: "error",
      message: "Could not save the letter. Please try again.",
    };
  }
}

export async function scheduleLetterAction(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const parsed = scheduleSchema.safeParse({
    id: formData.get("id") || null,
    title: formData.get("title"),
    openWhen: formData.get("openWhen"),
    content: formData.get("content"),
    template: formData.get("template"),
    coverEmoji: formData.get("coverEmoji") || null,
    palette: formData.get("palette") || "rose",
    lockType: formData.get("lockType") || "none",
    pin: formData.get("pin") || null,
    quizPrompt: formData.get("quizPrompt") || null,
    quizAnswer: formData.get("quizAnswer") || null,
    hint: formData.get("hint") || null,
    allowSkip: formData.get("allowSkip") === "on",
    sendAt: formData.get("sendAt"),
    imageUrl: formData.get("imageUrl") || null,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const path = issue.path[0]?.toString() ?? "form";
      errors[path] = issue.message;
    });
    return { status: "error", message: "Fix the errors below.", errors };
  }

  const data = parsed.data;
  const letterId = data.id ?? randomUUID();
  const sendAtIso = data.sendAt ? new Date(data.sendAt).toISOString() : null;

  const isPin = data.lockType === "pin";
  const isQuiz = data.lockType === "quiz";

  if (isPin && !data.pin) {
    return { status: "error", message: "PIN is required for PIN lock.", errors: { pin: "PIN is required" } };
  }
  if (isQuiz && (!data.quizPrompt || !data.quizAnswer)) {
    return { status: "error", message: "Quiz question and answer are required.", errors: { quizPrompt: "Required", quizAnswer: "Required" } };
  }

  try {
    if (data.id) {
      await db.execute({
        sql: `
          UPDATE letters
          SET title = ?, open_when = ?, content_md = ?, template = ?, palette = ?, cover_emoji = ?, image_url = ?, status = 'scheduled', send_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          data.title,
          data.openWhen,
          data.content,
          data.template,
          data.palette ?? "rose",
          data.coverEmoji || null,
          data.imageUrl || null,
          sendAtIso,
          letterId,
        ],
      });
    } else {
      await db.execute({
        sql: `
          INSERT INTO letters (id, title, open_when, content_md, template, palette, cover_emoji, image_url, status, is_archived, updated_at, send_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0, CURRENT_TIMESTAMP, ?)
        `,
        args: [
          letterId,
          data.title,
          data.openWhen,
          data.content,
          data.template,
          data.palette ?? "rose",
          data.coverEmoji || null,
          data.imageUrl || null,
          sendAtIso,
        ],
      });
    }

    await upsertLock(letterId, data);

    return {
      status: "success",
      message: "Letter scheduled.",
      draftId: letterId,
    };
  } catch (error) {
    console.error("Failed to schedule letter", error);
    return {
      status: "error",
      message: "Could not schedule the letter. Please try again.",
    };
  }
}
