const COOKIE_NAME = "enxoval_auth";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET env var");
  }
  return secret;
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function base64UrlEncode(input: ArrayBuffer) {
  const bytes = new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(payloadB64: string) {
  const secret = getSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return base64UrlEncode(sig);
}

export async function verifyAuthCookieValueEdge(value: string | undefined | null) {
  if (!value) return null;
  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = await sign(payloadB64);
  const sigBytes = new TextEncoder().encode(sig);
  const expectedBytes = new TextEncoder().encode(expected);
  if (!constantTimeEqual(sigBytes, expectedBytes)) return null;

  try {
    const payloadBytes = base64UrlDecode(payloadB64);
    const json = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(json) as {
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
