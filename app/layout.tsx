import "./globals.css";
import type { Metadata } from "next";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Reviews de Carrinhos",
  description: "Leia e escreva reviews de carrinhos de bebê"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white">
        <TopNav />
        <div className="mx-auto max-w-5xl px-4 py-8">
          {children}
          <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
            Copyright © 2026 Inc. Todos os direitos reservados. Edufe Digital CNPJ: 48.796.931/0001-74
          </footer>
        </div>
      </body>
    </html>
  );
}
