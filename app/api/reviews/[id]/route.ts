import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getReviewById, deleteReview } from "@/lib/data";
import { getAuthCookieName, verifyAuthCookieValue } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id;
    
    const cookieName = getAuthCookieName();
    const raw = cookies().get(cookieName)?.value;
    const session = verifyAuthCookieValue(raw);
    
    if (!session?.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const existingReview = await getReviewById(reviewId);
    if (!existingReview) {
      return NextResponse.json({ error: "review_not_found" }, { status: 404 });
    }

    if (existingReview.authorEmail !== session.email) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await deleteReview(reviewId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
