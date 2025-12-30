import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type Role = "admin" | "recipient";

export type Session = {
  role: Role;
};

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return secret;
};

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string) => {
  const secret = getSecret();
  return createHmac("sha256", secret).update(payload).digest("base64url");
};

const safeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return (
    aBuf.length === bBuf.length &&
    timingSafeEqual(aBuf, bBuf)
  );
};

const serialize = (session: Session) => {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
};

export const parseSessionString = (value?: string | null): Session | null => {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (!safeEqual(signature, expected)) return null;
  try {
    const json = base64UrlDecode(payload);
    const session = JSON.parse(json) as Session;
    if (session && (session.role === "admin" || session.role === "recipient")) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const setSession = async (
  session: Session,
  cookieStore?: CookieStore,
) => {
  const store = cookieStore ?? (await cookies());
  const value = serialize(session);
  store.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
};

export const getSession = async (
  cookieStore?: CookieStore,
) => {
  const store = cookieStore ?? (await cookies());
  const value = store.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionString(value);
};

export const clearSession = async (
  cookieStore?: CookieStore,
) => {
  const store = cookieStore ?? (await cookies());
  store.delete(SESSION_COOKIE_NAME);
};

export const validatePasscode = (input: string | null | undefined): Role | null => {
  if (!input) return null;
  const adminCode = process.env.ADMIN_PASSCODE;
  const recipientCode = process.env.RECIPIENT_PASSCODE;

  const normalized = input.trim();

  if (adminCode && safeEqual(normalized, adminCode)) {
    return "admin";
  }
  if (recipientCode && safeEqual(normalized, recipientCode)) {
    return "recipient";
  }
  return null;
};
