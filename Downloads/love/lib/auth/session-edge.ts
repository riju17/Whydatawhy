const encoder = new TextEncoder();

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return secret;
};

const base64UrlEncode = (bytes: Uint8Array) => {
  const str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecode = (value: string) => {
  value = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = value.length % 4 === 0 ? 0 : 4 - (value.length % 4);
  const padded = value + "=".repeat(pad);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
};

async function sign(payload: string) {
  const secret = getSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return base64UrlEncode(new Uint8Array(signature));
}

export async function parseSessionStringEdge(value?: string | null) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = await sign(payload);
  if (expected !== signature) return null;
  try {
    const json = new TextDecoder().decode(base64UrlDecodeToBytes(payload));
    const session = JSON.parse(json) as { role?: string };
    if (session.role === "admin" || session.role === "recipient") {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

function base64UrlDecodeToBytes(value: string) {
  return base64UrlDecode(value);
}
