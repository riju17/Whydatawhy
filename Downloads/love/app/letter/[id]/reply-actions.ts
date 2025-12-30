"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail, templates } from "@/lib/email/resend";

const reactionOptions = ["❤️", "🌸", "🤗", "✨", "💌", "🌙"] as const;

const schema = z.object({
  letterId: z.string().uuid(),
  reaction: z.enum(reactionOptions),
  message: z
    .string()
    .trim()
    .min(2, "Please write a short line.")
    .max(240, "Keep it under 240 characters."),
});

export type ReplyState = {
  status?: "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const hashReaction = (reaction: string, message: string) =>
  `REACTION:${reaction}\n${message}`;

export async function submitReplyAction(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const parsed = schema.safeParse({
    letterId: formData.get("letterId"),
    reaction: formData.get("reaction"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const path = issue.path[0]?.toString() ?? "form";
      errors[path] = issue.message;
    });
    return { status: "error", message: "Please fix the errors.", errors };
  }

  const data = parsed.data;
  const id = randomUUID();

  try {
    // Fetch letter title for email context
    const letterRes = await db.execute({
      sql: `SELECT title FROM letters WHERE id = ? LIMIT 1`,
      args: [data.letterId],
    });

    const letterTitle =
      (letterRes.rows[0] as Record<string, unknown> | undefined)?.title ??
      "Letter";

    await db.execute({
      sql: `
        INSERT INTO replies (id, letter_id, author, content_md)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        id,
        data.letterId,
        "recipient",
        hashReaction(data.reaction, data.message),
      ],
    });

    if (ADMIN_EMAIL) {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `New reply to "${letterTitle}"`,
        html: templates.replyReceived({
          letterTitle: String(letterTitle),
          replyPreview: `${data.reaction} ${data.message}`,
          letterId: data.letterId,
        }),
      });
    } else {
      console.warn("ADMIN_EMAIL not set; reply notification skipped.");
    }

    return { status: "success", message: "Reply sent." };
  } catch (error) {
    console.error("Failed to submit reply", error);
    return { status: "error", message: "Could not send reply. Try again." };
  }
}
