import { notFound } from "next/navigation";
import { getStrollerById, listReviewsByStrollerId } from "@/lib/data";
import ReviewForm from "@/components/ReviewForm";
import ReviewVoteButton from "@/components/ReviewVoteButton";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

export default async function StrollerPage({ params }: Props) {
  const stroller = await getStrollerById(params.id);
  if (!stroller) notFound();

  const reviews = await listReviewsByStrollerId(stroller.id);

  const featureCounts = reviews.reduce<Record<string, number>>((acc, r) => {
    for (const f of r.features) {
      acc[f] = (acc[f] || 0) + 1;
    }
    return acc;
  }, {});

  const featureEntries = Object.entries(featureCounts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0], "pt-BR");
  });

  const avg =
    reviews.length === 0
      ? null
      : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
            {stroller.imageUrl ? (
              <div className="overflow-hidden rounded-xl bg-white sm:flex-none">
                <img
                  src={stroller.imageUrl}
                  alt={stroller.name}
                  className="h-72 w-72 object-contain sm:h-96 sm:w-96"
                  loading="lazy"
                />
              </div>
            ) : null}
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-slate-900">{stroller.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{stroller.brand}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{stroller.category}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {avg !== null ? (
                  <span className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-950 ring-1 ring-amber-200">
                    Nota média: {avg.toFixed(1)}
                  </span>
                ) : null}
                <span className="text-sm font-medium text-slate-700">
                  {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>
              {featureEntries.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {featureEntries.map(([label, count]) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                        ✓
                      </span>
                      {label}
                      <span className="font-medium text-emerald-800">({count})</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stroller.buyUrl ? (
              <a
                href={stroller.buyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Ver na loja
              </a>
            ) : null}
          </div>
        </div>
        {stroller.summary ? (
          <p className="mt-4 text-sm text-slate-700">{stroller.summary}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Escrever review</h2>
          <div className="mt-4">
            <ReviewForm strollerId={stroller.id} />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Reviews</h2>
          <div className="mt-4 space-y-4">
            {reviews.map((r) => (
              <article key={r.id} className="relative rounded-xl border border-slate-200 p-4 pb-12">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{r.authorName}</p>
                    <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-200">
                    {r.rating}/5
                  </span>
                </header>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.text}</p>
                {r.features.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.features.map((f) => (
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
                  <ReviewVoteButton reviewId={r.id} initialCount={r.votesCount} />
                </div>
              </article>
            ))}
            {reviews.length === 0 ? (
              <div className="text-sm text-slate-600">Ainda não há reviews.</div>
            ) : null}
          </div>
        </div>
      </section>

      <div>
        <a href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900">
          Voltar
        </a>
      </div>
    </main>
  );
}
