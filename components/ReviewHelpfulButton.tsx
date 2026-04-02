"use client";

import { useEffect, useMemo, useState } from "react";

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={active ? "h-4 w-4 fill-rose-600" : "h-4 w-4"}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.52C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        strokeWidth={active ? 0 : 1.8}
        className={active ? "text-rose-600" : "text-slate-700"}
      />
    </svg>
  );
}

export default function ReviewHelpfulButton({
  reviewId,
  initialCount
}: {
  reviewId: string;
  initialCount: number;
}) {
  const storageKey = useMemo(() => `review_helpful:${reviewId}`, [reviewId]);
  const [marked, setMarked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setMarked(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setMarked(false);
    }
  }, [storageKey]);

  async function toggleHelpful() {
    if (loading) return;
    setLoading(true);

    const prev = count;
    const delta = marked ? -1 : 1;
    setCount((c) => Math.max(0, c + delta));

    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/helpful`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delta })
      });
      if (!res.ok) throw new Error("helpful_failed");

      const json = (await res.json()) as { helpfulCount?: number };
      if (typeof json.helpfulCount === "number") setCount(json.helpfulCount);

      try {
        if (delta === 1) window.localStorage.setItem(storageKey, "1");
        else window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }

      setMarked(delta === 1);
    } catch {
      setCount(prev);
    } finally {
      setLoading(false);
    }
  }

  const countLabel = `${count} ${count === 1 ? "achou útil" : "acharam útil"}`;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggleHelpful}
        disabled={loading}
        className={
          marked
            ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100"
            : "inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 hover:bg-slate-200"
        }
        aria-label={marked ? "Remover útil" : "Marcar como útil"}
      >
        <HeartIcon active={marked} />
      </button>
      <span className="text-xs font-semibold text-slate-700">{countLabel}</span>
    </div>
  );
}
