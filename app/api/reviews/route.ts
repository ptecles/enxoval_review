import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createReview } from "@/lib/data";
import { getAuthCookieName, verifyAuthCookieValue } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  strollerId: z.string().min(1),
  authorName: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1),
  features: z.array(z.string().min(1)).max(20).optional()
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const cookieName = getAuthCookieName();
    const raw = cookies().get(cookieName)?.value;
    const session = verifyAuthCookieValue(raw);
    const sessionName = (session?.name || "").trim();
    const sessionEmail = session?.email || null;

    const review = await createReview({
      ...parsed.data,
      authorName: sessionName || parsed.data.authorName || "Usuária",
      authorEmail: sessionEmail || undefined
    });
    return NextResponse.json({ review });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
