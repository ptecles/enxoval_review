"use client";

import { useEffect, useMemo, useState } from "react";

function ArrowUpIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={active ? "h-4 w-4 fill-[#D88B74]" : "h-4 w-4 fill-slate-700"}
    >
      <path d="M9.999 2.5c.19 0 .372.078.505.216l5.5 5.75a.75.75 0 0 1-1.083 1.034L10.75 5.143V16.75a.75.75 0 0 1-1.5 0V5.143L5.079 9.5A.75.75 0 1 1 3.996 8.466l5.5-5.75A.707.707 0 0 1 10 2.5z" />
    </svg>
  );
}

export default function ReviewVoteButton({
  reviewId,
  initialCount
}: {
  reviewId: string;
  initialCount: number;
}) {
  const storageKey = useMemo(() => `review_vote:${reviewId}`, [reviewId]);
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setVoted(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setVoted(false);
    }
  }, [storageKey]);

  async function toggleVote() {
    if (loading) return;
    setLoading(true);

    const prev = count;
    const delta = voted ? -1 : 1;
    setCount((c) => Math.max(0, c + delta));

    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delta })
      });
      if (!res.ok) throw new Error("vote_failed");

      const json = (await res.json()) as { votesCount?: number };
      if (typeof json.votesCount === "number") setCount(json.votesCount);

      try {
        if (delta === 1) window.localStorage.setItem(storageKey, "1");
        else window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      setVoted(delta === 1);
    } catch {
      setCount(prev);
    } finally {
      setLoading(false);
    }
  }

  const countLabel = `${count} ${count === 1 ? "concorda" : "concordam"}`;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggleVote}
        disabled={loading}
        className={
          voted
            ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#D88B74]/15 ring-1 ring-[#D88B74]/40"
            : "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50"
        }
        aria-label={voted ? "Remover concordância" : "Concordo"}
      >
        <ArrowUpIcon active={voted} />
      </button>
      <span className="text-xs font-semibold text-slate-700">{countLabel}</span>
    </div>
  );
}
