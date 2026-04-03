import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAuthCookieValue, getAuthCookieName } from "@/lib/auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().min(1)
});

function getBaseUrl(req: Request) {
  const fromEnv = process.env.URL || process.env.DEPLOY_URL;
  if (fromEnv) return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const baseUrl = getBaseUrl(req);
    const res = await fetch(`${baseUrl}/api/check-email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: body.email })
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        isJson && payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message || "")
          : `Falha ao verificar email (${res.status}).`;
      return NextResponse.json(
        { success: false, authorized: false, message },
        { status: 200 }
      );
    }

    if (!isJson || !payload || typeof payload !== "object") {
      return NextResponse.json(
        { success: false, authorized: false, message: `Resposta inesperada ao verificar email (${res.status}).` },
        { status: 200 }
      );
    }

    const data = payload as {
      success?: boolean;
      authorized?: boolean;
      message?: string;
      user?: { email: string; name?: string | null };
    };

    if (!data.success || !data.authorized || !data.user?.email) {
      return NextResponse.json(
        { success: false, authorized: false, message: data.message || "Email não autorizado" },
        { status: 200 }
      );
    }

    const cookieValue = createAuthCookieValue({ email: data.user.email, name: data.user.name }, 60 * 60 * 24 * 30);
    const cookieName = getAuthCookieName();

    cookies().set(cookieName, cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return NextResponse.json({ success: true, authorized: true, user: data.user }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ success: false, authorized: false, message }, { status: 500 });
  }
}
