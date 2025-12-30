import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const baseUrl = process.env.APP_BASE_URL;

if (!apiKey) {
  console.warn("RESEND_API_KEY is not set. Emails will not send.");
}

if (!baseUrl) {
  console.warn("APP_BASE_URL is not set. Links in emails may be broken.");
}

export const resend = apiKey ? new Resend(apiKey) : null;

type EmailProps = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: EmailProps) {
  if (!resend || !apiKey) {
    return { error: "Resend not configured" };
  }
  return resend.emails.send({
    from: process.env.MAIL_FROM ?? "Our Mailbox <mail@your-domain.dev>",
    to,
    subject,
    html,
  });
}

export const templates = {
  newLetter: ({
    title,
    preview,
    letterId,
  }: {
    title: string;
    preview: string;
    letterId: string;
  }) => {
    const link = `${baseUrl ?? ""}/letter/${letterId}`;
    return baseHtml({
      heading: "A new letter just arrived",
      body: `
        <p style="margin:0 0 12px;">"${escapeHtml(title)}" is now waiting for you.</p>
        <p style="margin:0 0 16px;color:#6b7280;">${escapeHtml(preview)}</p>
      `,
      cta: { label: "Read the letter", href: link },
    });
  },
  replyReceived: ({
    letterTitle,
    replyPreview,
    letterId,
  }: {
    letterTitle: string;
    replyPreview: string;
    letterId: string;
  }) => {
    const link = `${baseUrl ?? ""}/letter/${letterId}`;
    return baseHtml({
      heading: "A reply just landed",
      body: `
        <p style="margin:0 0 12px;">Someone replied to "${escapeHtml(letterTitle)}".</p>
        <p style="margin:0 0 16px;color:#6b7280;">${escapeHtml(replyPreview)}</p>
      `,
      cta: { label: "View the reply", href: link },
    });
  },
  unlockTrigger: ({
    letterTitle,
    letterId,
  }: {
    letterTitle: string;
    letterId: string;
  }) => {
    const link = `${baseUrl ?? ""}/letter/${letterId}`;
    return baseHtml({
      heading: "A letter was unlocked",
      body: `<p style="margin:0 0 16px;">"${escapeHtml(letterTitle)}" was just unlocked.</p>`,
      cta: { label: "Open dashboard", href: link },
    });
  },
};

function baseHtml({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta: { label: string; href: string };
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;">
    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" style="width:580px;max-width:90%;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb;font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a;">
            <tr>
              <td style="padding-bottom:12px;">
                <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Our Mailbox</div>
              </td>
            </tr>
            <tr>
              <td style="font-size:20px;font-weight:700;padding-bottom:8px;">${heading}</td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.6;padding-bottom:16px;">${body}</td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${cta.href}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;">${cta.label}</a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#6b7280;">If the button doesn't work, copy and paste this link:<br /><a href="${cta.href}" style="color:#4338ca;">${cta.href}</a></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
