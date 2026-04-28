import { listStrollers } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatCategoryName(category: string) {
  const trimmed = (category || "").trim();
  if (!trimmed) return "Outros";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}


export default async function HomePage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const strollers = await listStrollers();

  const qRaw = searchParams?.q;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw || "").trim();
  const qNorm = q.toLowerCase();

  const filteredStrollers = qNorm
    ? strollers.filter((s) => {
        const haystack = [
          s.name,
          s.brand,
          s.category,
          s.summary || ""
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(qNorm);
      })
    : strollers;

  const byCategory = filteredStrollers.reduce<Record<string, typeof filteredStrollers>>((acc, s) => {
    const categoryKey = s.category?.trim() || "Outros";
    (acc[categoryKey] ||= []).push(s);
    return acc;
  }, {});

  const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <main className="space-y-6">
      <section className="py-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Carrinhos de bebê</h1>
        <p className="mt-2 text-base text-slate-600">
          Encontre um carrinho e veja reviews reais da comunidade
        </p>
      </section>

      {filteredStrollers.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Nenhum carrinho encontrado{q ? ` para "${q}"` : ""}.
        </section>
      ) : null}

      {categories.map((category) => {
        const items = [...byCategory[category]].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        const displayCategory = formatCategoryName(category);
        return (
          <section key={category} className="space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-semibold">
                <span className="text-[#678EA6]">{displayCategory}</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((s) => (
                <a
                  key={s.id}
                  href={`/carrinhos/${encodeURIComponent(s.id)}`}
                  className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md sm:p-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {s.imageUrl ? (
                        <img
                          src={s.imageUrl}
                          alt={s.name}
                          loading="lazy"
                          decoding="async"
                          className="h-[72px] w-[72px] flex-none rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200"
                        />
                      ) : null}
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{s.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{s.brand}</p>
                      </div>
                    </div>
                  </div>
                  {s.summary ? (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-700">{s.summary}</p>
                  ) : null}
                </a>
              ))}
            </div>
          </section>
        );
      })}

      {strollers.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Sua planilha ainda não tem carrinhos. Preencha a aba de carrinhos e recarregue.
        </section>
      ) : null}
    </main>
  );
}
