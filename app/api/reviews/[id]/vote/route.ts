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

    const { data: rpcData, error: rpcError } = await supabase.rpc("update_review_vote", {
      review_id: reviewId,
      delta
    });

    if (!rpcError && rpcData !== null && rpcData !== undefined) {
      const votesCount = Number(rpcData);
      return NextResponse.json({ votesCount });
    }

    const { data: current, error: readError } = await supabase
      .from("reviews")
      .select("votes_count")
      .eq("id", reviewId)
      .single();

    if (readError) throw new Error(readError.message);

    const currentCount = Number((current as any)?.votes_count || 0);
    const next = Math.max(0, currentCount + delta);

    const { data: updated, error: updateError } = await supabase
      .from("reviews")
      .update({ votes_count: next })
      .eq("id", reviewId)
      .select("votes_count")
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ votesCount: Number((updated as any)?.votes_count || next) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
