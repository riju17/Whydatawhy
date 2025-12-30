import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_PREFIX = "letter_unlocked_";
const UNLOCK_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return secret;
};

const sign = (payload: string) =>
  createHmac("sha256", getSecret()).update(payload).digest("base64url");

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

export async function isLetterUnlocked(id: string) {
  const store = await cookies();
  const cookie = store.get(`${COOKIE_PREFIX}${id}`)?.value;
  if (!cookie) return false;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const match =
    Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!match) return false;
  try {
    const json = decode(payload);
    const parsed = JSON.parse(json) as { id: string };
    return parsed.id === id;
  } catch {
    return false;
  }
}

export async function setLetterUnlocked(id: string) {
  const store = await cookies();
  const payload = encode(JSON.stringify({ id }));
  const signature = sign(payload);
  const value = `${payload}.${signature}`;
  store.set(`${COOKIE_PREFIX}${id}`, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UNLOCK_MAX_AGE,
  });
}
