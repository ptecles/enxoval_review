"use client";

import { useState } from "react";

const FEATURE_OPTIONS = [
  "coube no avião",
  "leve",
  "confortável",
  "foi bem em terrenos irregulares",
  "fecha com uma mão",
  "encosto 90º"
] as const;

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={filled ? "h-6 w-6 fill-amber-400" : "h-6 w-6 fill-slate-200"}
    >
      <path d="M10 15.27l-5.18 2.73 0.99-5.78L1.64 7.97l5.8-0.84L10 1.88l2.56 5.25 5.8 0.84-4.17 4.25 0.99 5.78z" />
    </svg>
  );
}

export default function ReviewForm({ strollerId }: { strollerId: string }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function formatFeatureLabel(option: string) {
    const trimmed = option.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  function toggleFeature(option: string) {
    setFeatures((prev) => (prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return;
    setStatus("loading");

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ strollerId, rating, text, features })
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    setRating(0);
    setText("");
    setFeatures([]);
    setStatus("success");
    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="space-y-1">
        <div className="text-xs font-medium text-slate-700">Nota</div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="rounded-md p-1 outline-none focus:ring-2 focus:ring-slate-300"
              aria-label={`Dar nota ${n} de 5`}
            >
              <Star filled={n <= rating} />
            </button>
          ))}
          {rating > 0 ? (
            <span className="ml-2 text-sm font-medium text-slate-700">{rating}/5</span>
          ) : null}
        </div>
        {rating < 1 ? <div className="text-xs text-slate-500">Selecione uma nota</div> : null}
      </label>

      <label className="space-y-1">
        <div className="text-xs font-medium text-slate-700">Review</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          placeholder="O que você achou? Pontos positivos/negativos, uso no dia a dia, etc."
          required
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-slate-700">Quais características você destacaria?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FEATURE_OPTIONS.map((opt) => {
            const checked = features.includes(opt);
            return (
              <label
                key={opt}
                className={
                  checked
                    ? "flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    : "flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                }
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={checked}
                  onChange={() => toggleFeature(opt)}
                />
                <span className="select-none">{formatFeatureLabel(opt)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={status === "loading" || rating < 1}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {status === "loading" ? "Salvando..." : "Publicar"}
      </button>

      {status === "error" ? (
        <div className="text-sm text-red-600">Falha ao salvar. Tente novamente.</div>
      ) : null}
    </form>
  );
}
