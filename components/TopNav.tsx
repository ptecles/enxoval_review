"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qFromUrl = searchParams.get("q") || "";
  const [q, setQ] = useState(qFromUrl);

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  const actionHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    const queryString = params.toString();
    return queryString ? `/carrinhos-lista?${queryString}` : "/carrinhos-lista";
  }, [q, searchParams]);

  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <a href="/carrinhos-lista" className="inline-flex items-center">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={1024}
            height={512}
            priority
            className="h-14 w-auto object-contain"
          />
        </a>

        <form
          className="flex w-full items-center"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(actionHref);
          }}
        >
          <div className="relative w-full">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar carrinho..."
              className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            {q ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                onClick={() => {
                  setQ("");
                  if (pathname === "/carrinhos-lista") router.push("/carrinhos-lista");
                }}
              >
                Limpar
              </button>
            ) : null}
          </div>
        </form>

        <button
          type="button"
          className="inline-flex flex-none items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } finally {
              router.push("/login");
            }
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
