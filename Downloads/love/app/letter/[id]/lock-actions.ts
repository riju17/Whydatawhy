"use server";

import { createHash, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { setLetterUnlocked } from "@/lib/auth/unlock-token";

export type LockState = {
  status: "locked" | "unlocked";
  attempts: number;
  allowSkip: boolean;
  error?: string;
  showHint?: boolean;
  hint?: string | null;
  canSkip?: boolean;
};

export async function markOpened(id: string) {
  await db.execute({
    sql: `
      UPDATE letters
      SET opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP),
          last_viewed_at = CURRENT_TIMESTAMP,
          opens_count = COALESCE(opens_count, 0) + 1
      WHERE id = ?
    `,
    args: [id],
  });
}

const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const safeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
};

export async function verifyLockAction(
  _prevState: LockState,
  formData: FormData,
): Promise<LockState> {
  const id = formData.get("id");
  const input = (formData.get("answer") as string | null)?.trim() ?? "";
  if (!id || typeof id !== "string" || !input) {
    return { status: "locked", attempts: 0, allowSkip: false, error: "Invalid input." };
  }

  const lockRow = await db.execute({
    sql: `
      SELECT pin_hash, quiz_answer_hash, hint, allow_skip, attempts
      FROM locks
      WHERE letter_id = ?
      LIMIT 1
    `,
    args: [id],
  });

  if (lockRow.rows.length === 0) {
    await setLetterUnlocked(id);
    await markOpened(id);
    revalidatePath(`/letter/${id}`);
    return { status: "unlocked", attempts: 0, allowSkip: false };
  }

  const record = lockRow.rows[0] as Record<string, unknown>;
  const attempts = Number(record.attempts ?? 0);
  const allowSkip = Number(record.allow_skip ?? 0) === 1;
  const hint = (record.hint as string | null) ?? null;
  const pinHash = (record.pin_hash as string | null) ?? null;
  const quizHash = (record.quiz_answer_hash as string | null) ?? null;

  const hashedInput = hashValue(input);
  const matches =
    (pinHash && safeEqual(pinHash, hashedInput)) ||
    (quizHash && safeEqual(quizHash, hashedInput));

  if (matches) {
    await db.execute({
      sql: `
        UPDATE locks
        SET attempts = 0
        WHERE letter_id = ?
      `,
      args: [id],
    });
    await setLetterUnlocked(id);
    await markOpened(id);
    revalidatePath(`/letter/${id}`);
    return { status: "unlocked", attempts: 0, allowSkip };
  }

  const nextAttempts = attempts + 1;

  await db.execute({
    sql: `
      UPDATE locks
      SET attempts = ?
      WHERE letter_id = ?
    `,
    args: [nextAttempts, id],
  });

  return {
    status: "locked",
    attempts: nextAttempts,
    allowSkip,
    error: "Incorrect. Try again.",
    showHint: !!hint && nextAttempts >= 1,
    hint: nextAttempts >= 1 ? hint : null,
    canSkip: allowSkip && nextAttempts >= 2,
  };
}

export async function skipLockAction(
  _prevState: LockState,
  formData: FormData,
): Promise<LockState> {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { status: "locked", attempts: 0, allowSkip: false, error: "Invalid request." };
  }

  const lockRow = await db.execute({
    sql: `
      SELECT allow_skip, attempts
      FROM locks
      WHERE letter_id = ?
      LIMIT 1
    `,
    args: [id],
  });

  if (lockRow.rows.length === 0) {
    return { status: "locked", attempts: 0, allowSkip: false, error: "Lock not found." };
  }

  const record = lockRow.rows[0] as Record<string, unknown>;
  const allowSkip = Number(record.allow_skip ?? 0) === 1;
  const attempts = Number(record.attempts ?? 0);

  if (!allowSkip || attempts < 2) {
    return {
      status: "locked",
      attempts,
      allowSkip,
      error: "Skip not available yet.",
    };
  }

  await setLetterUnlocked(id);
  await markOpened(id);
  revalidatePath(`/letter/${id}`);
  return { status: "unlocked", attempts, allowSkip };
}
