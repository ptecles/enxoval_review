"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InstagramSecretoPage() {
  const router = useRouter();
  const [instagram, setInstagram] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/instagram-secreto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Dados enviados com sucesso! Redirecionando..." });
        setTimeout(() => {
          window.location.href = "https://www.instagram.com/enxovalsecreto.elisa/";
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao enviar dados. Tente novamente." });
        setIsSubmitting(false);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro de conexão. Tente novamente." });
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            ← Voltar
          </button>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-white"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Instagram Secreto</h1>
            <p className="mt-2 text-slate-600">
              Escreva aqui o seu perfil do instagram que você vai usar para acessar o nosso perfil secreto. Depois, solicite acesso ao @enxovalsecreto.elisa e aguarde a aprovação pela equipe.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 rounded-lg p-4 ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 ring-1 ring-green-200"
                  : "bg-red-50 text-red-800 ring-1 ring-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-slate-700">
                @ do Instagram
              </label>
              <input
                type="text"
                id="instagram"
                required
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="@seuperfil"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:from-green-600 hover:to-emerald-600 disabled:opacity-60"
            >
              {isSubmitting ? "Enviando..." : "Acessar Instagram Secreto"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
