import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, templates } from "@/lib/email/resend";

export const runtime = "nodejs";

export async function GET() {
  const recipient = process.env.RECIPIENT_EMAIL;
  if (!recipient) {
    console.warn("RECIPIENT_EMAIL is not set; skipping notifications.");
  }

  const result = await db.execute({
    sql: `
      UPDATE letters
      SET status = 'sent',
          sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'scheduled'
        AND send_at IS NOT NULL
        AND send_at <= CURRENT_TIMESTAMP
      RETURNING id, title, open_when, content_md
    `,
    args: [],
  });

  const rows = result.rows as Record<string, unknown>[];

  if (recipient && rows.length > 0) {
    await Promise.all(
      rows.map((row) =>
        sendEmail({
          to: recipient,
          subject: `A scheduled letter is ready: ${row.title}`,
          html: templates.newLetter({
            title: String(row.title ?? "Letter"),
            preview: String(row.content_md ?? "").slice(0, 160),
            letterId: String(row.id),
          }),
        }),
      ),
    );
  }

  return NextResponse.json({ processed: rows.length });
}
