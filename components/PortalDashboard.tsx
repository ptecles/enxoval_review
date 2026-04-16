"use client";

import { useState } from "react";

type Site = {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
};

const SITES: Site[] = [
  {
    id: "calculadora",
    name: "Calculadora de Enxoval",
    description: "Calcule o que seu bebê deve vestir para dormir",
    url: "https://enxovalinteligentecalculadora.netlify.app",
    icon: "",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "reviews",
    name: "Reviews de Carrinhos",
    description: "Veja reviews reais da comunidade",
    url: "/carrinhos-lista",
    icon: "",
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "produtos",
    name: "Busca de Produtos",
    description: "Encontre os melhores produtos para bebês",
    url: "https://enxovalinteligenteprodutos.netlify.app",
    icon: "",
    color: "from-orange-500 to-red-500"
  }
];

type PortalDashboardProps = {
  userEmail: string;
  userName: string;
};

export default function PortalDashboard({ userEmail, userName }: PortalDashboardProps) {
  const [redirecting, setRedirecting] = useState<string | null>(null);

  function handleSiteClick(site: Site) {
    setRedirecting(site.id);
    
    if (site.url.startsWith("/")) {
      window.location.href = site.url;
    } else {
      const url = new URL(site.url);
      url.searchParams.set("auth_email", userEmail);
      window.location.href = url.toString();
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Enxoval Inteligente" 
              className="h-auto w-auto max-h-20"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Bem-vinda, {userName.split(" ")[0]}!
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Escolha uma das ferramentas do Enxoval Inteligente
          </p>
        </header>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SITES.map((site) => (
            <button
              key={site.id}
              onClick={() => handleSiteClick(site)}
              disabled={redirecting !== null}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition hover:shadow-xl hover:ring-slate-300 disabled:opacity-60"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${site.color} opacity-0 transition group-hover:opacity-5`} />
              
              <div className="relative">
                <div className="mb-4 flex items-center justify-end">
                  {redirecting === site.id ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                  ) : (
                    <svg
                      className="h-6 w-6 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-slate-900">{site.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{site.description}</p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {redirecting === site.id ? "Redirecionando..." : "Acessar"}
                </div>
              </div>
            </button>
          ))}
        </div>

        <footer className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Logado como <span className="font-medium text-slate-700">{userEmail}</span>
          </p>
          <a
            href="/api/auth/logout"
            className="mt-2 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Sair
          </a>
        </footer>
      </div>
    </main>
  );
}
