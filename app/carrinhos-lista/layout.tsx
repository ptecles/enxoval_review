import { Suspense } from "react";
import TopNav from "@/components/TopNav";

export default function CarrinhosLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <TopNav />
      </Suspense>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {children}
        <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
          Copyright © 2026 Inc. Todos os direitos reservados. Edufe Digital CNPJ: 48.796.931/0001-74
        </footer>
      </div>
    </>
  );
}
