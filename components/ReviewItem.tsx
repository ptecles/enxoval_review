"use client";

import { useState } from "react";
import ReviewVoteButton from "./ReviewVoteButton";
import type { Review } from "@/lib/types";

type ReviewItemProps = {
  review: Review;
  currentUserEmail: string | null;
};

function formatDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function ReviewItem({ review, currentUserEmail }: ReviewItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = currentUserEmail && review.authorEmail === currentUserEmail;
  const displayName = formatDisplayName(review.authorName);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        alert("Erro ao deletar review. Tente novamente.");
        setIsDeleting(false);
        return;
      }

      window.location.reload();
    } catch {
      alert("Erro ao deletar review. Tente novamente.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <article className="relative rounded-xl border border-slate-200 p-4 pb-12">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">
              {new Date(review.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-200">
              {review.rating}/5
            </span>
            {canDelete ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="rounded-lg border border-red-300 bg-white p-2 text-red-600 transition hover:bg-red-50"
                title="Deletar review"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </button>
            ) : null}
          </div>
        </header>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{review.text}</p>
        {review.features.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {review.features.map((f) => (
              <span
                key={f}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {f}
              </span>
            ))}
          </div>
        ) : null}

        <div className="absolute bottom-3 right-3">
          <ReviewVoteButton reviewId={review.id} initialCount={review.votesCount} />
        </div>
      </article>

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Tem certeza?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tem certeza que quer apagar sua review? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deletando..." : "Sim, deletar"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
