import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type Props = {
  params: { id: string };
};

export async function POST(req: Request, { params }: Props) {
  try {
    const reviewId = decodeURIComponent(params.id);
    let delta = 1;
    try {
      const body = (await req.json()) as { delta?: unknown };
      const d = Number((body as any)?.delta);
      if (d === 1 || d === -1) delta = d;
    } catch {
      delta = 1;
    }

    const supabase = getSupabaseAdminClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc("update_review_helpful", {
      review_id: reviewId,
      delta
    });

    if (!rpcError && rpcData !== null && rpcData !== undefined) {
      const helpfulCount = Number(rpcData);
      return NextResponse.json({ helpfulCount });
    }

    const { data: current, error: readError } = await supabase
      .from("reviews")
      .select("helpful_count")
      .eq("id", reviewId)
      .single();

    if (readError) throw new Error(readError.message);

    const currentCount = Number((current as any)?.helpful_count || 0);
    const next = Math.max(0, currentCount + delta);

    const { data: updated, error: updateError } = await supabase
      .from("reviews")
      .update({ helpful_count: next })
      .eq("id", reviewId)
      .select("helpful_count")
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ helpfulCount: Number((updated as any)?.helpful_count || next) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
