import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkEmailAuthorized } from "@/lib/hotmart";
import { createAuthCookieValue, getAuthCookieName } from "@/lib/auth";

const BodySchema = z.object({
  email: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const result = await checkEmailAuthorized(body.email);
    if (!result.authorized) {
      return NextResponse.json(
        { success: false, authorized: false, message: result.message || "Email não autorizado" },
        { status: 200 }
      );
    }

    const cookieValue = createAuthCookieValue({ email: result.user.email, name: result.user.name }, 60 * 60 * 24 * 30);
    const cookieName = getAuthCookieName();

    cookies().set(cookieName, cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return NextResponse.json({ success: true, authorized: true, user: result.user }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ success: false, authorized: false, message }, { status: 500 });
  }
}
