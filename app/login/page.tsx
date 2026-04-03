"use client";

import { useMemo, useState } from "react";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const nextUrl = useMemo(() => {
    const raw = searchParams?.next;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value && typeof value === "string" ? value : "/";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed })
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          isJson && payload && typeof payload === "object" && "message" in payload
            ? String((payload as { message?: unknown }).message || "")
            : `Falha no login (${res.status}).`;
        setStatus("error");
        setMessage(message || "Erro ao autenticar");
        return;
      }

      if (!isJson || !payload || typeof payload !== "object") {
        setStatus("error");
        setMessage(`Resposta inesperada do servidor (${res.status}).`);
        return;
      }

      const data = payload as { success: boolean; authorized: boolean; message?: string };

      if (!data.success || !data.authorized) {
        setStatus("error");
        setMessage(data?.message || "Email não autorizado");
        return;
      }

      setStatus("success");
      window.location.href = nextUrl;
    } catch {
      setStatus("error");
      setMessage("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white px-4 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section className="py-2 text-center">
          <div className="flex justify-center mb-4">
            <img src="/images/logo.png" alt="Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Carrinhos de bebê</h1>
          <p className="mt-2 text-base text-slate-600">
            Encontre um carrinho e veja reviews reais da comunidade
          </p>
        </section>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Entrar</h2>
          <p className="mt-2 text-sm text-slate-600">Faça login usando o mesmo e-mail cadastrado na Hotmart</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-800">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="seuemail@exemplo.com"
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {status === "loading" ? "Verificando..." : "Entrar"}
            </button>

            {message ? <div className="text-sm text-red-600">{message}</div> : null}
          </form>
        </div>

        <footer className="text-center">
          <p className="text-sm text-slate-500">Acesso restrito às alunas do Enxoval Inteligente</p>
        </footer>
      </div>
    </main>
  );
}
