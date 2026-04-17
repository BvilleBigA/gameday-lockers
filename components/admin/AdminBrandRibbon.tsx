/** Consistent Gameday Lockers header strip for admin tool pages. */
export function AdminBrandRibbon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-r from-[#f8faf9] via-white to-[#f0f7f5] px-5 py-5 sm:px-7">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#52A88E]" aria-hidden />
      <div className="flex flex-wrap items-start gap-4 pl-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#52A88E] text-[11px] font-bold leading-tight tracking-tight text-white shadow-md shadow-[#52A88E]/25">
          GL
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-gdl-display text-[10px] font-semibold uppercase tracking-[0.35em] text-[#3d7d6c]">
            Gameday Lockers
          </p>
          <h2 className="font-gdl-display mt-1 text-lg font-bold uppercase tracking-wide text-slate-900 sm:text-xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
