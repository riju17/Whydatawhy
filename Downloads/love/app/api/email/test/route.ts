import { NextResponse } from "next/server";
import { sendEmail, templates } from "@/lib/email/resend";

export async function POST() {
  const to = process.env.TEST_EMAIL_TO;
  if (!to) {
    return NextResponse.json(
      { error: "Set TEST_EMAIL_TO to run this test." },
      { status: 400 },
    );
  }

  const html = templates.newLetter({
    title: "Test Letter",
    preview: "This is a test message from Our Mailbox.",
    letterId: "test-letter-id",
  });

  const result = await sendEmail({
    to,
    subject: "Test: Our Mailbox",
    html,
  });

  return NextResponse.json(result);
}
