import crypto from "crypto";

const COOKIE_NAME = "enxoval_auth";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET env var");
  }
  return secret;
}

function base64UrlEncode(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function sign(payloadB64: string) {
  const secret = getSecret();
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(payloadB64).digest());
}

export function createAuthCookieValue(payload: { email: string; name?: string | null }, ttlSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = {
    v: 1,
    email: payload.email,
    name: payload.name || null,
    exp
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(body), "utf8"));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyAuthCookieValue(value: string | undefined | null) {
  if (!value) return null;
  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as {
      v: number;
      email: string;
      name: string | null;
      exp: number;
    };

    if (!payload?.email || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getAuthCookieName() {
  return COOKIE_NAME;
}
