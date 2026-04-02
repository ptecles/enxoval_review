import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieName } from "@/lib/auth";

export async function POST() {
  cookies().set(getAuthCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
