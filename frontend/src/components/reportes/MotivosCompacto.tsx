/**
 * «Por motivo» en una franja: por qué ocurrió (p. ej. «Otro examen a la misma hora · 33 %»), respetando el periodo
 * elegido. Reemplaza al gráfico por hora, que repetía lo del Inicio y casi siempre salía vacío.
 */
export default function MotivosCompacto({ motivos, periodo }: { motivos: { etiqueta: string; n: number }[]; periodo?: string }) {
  const total = motivos.reduce((s, m) => s + m.n, 0)
  if (total === 0) return null
  const orden = [...motivos].filter((m) => m.n > 0).sort((a, b) => b.n - a.n)
  return (
    <section aria-label="Por motivo" className="mt-3 rounded-xl border border-[#D8E3F5] bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#627A9B]">Por motivo{periodo ? ` · ${periodo}` : ''}</p>
      <ul className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
        {orden.map((m) => {
          const pct = Math.round((m.n / total) * 100)
          return (
            <li key={m.etiqueta} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-[#011140]" title={m.etiqueta}>{m.etiqueta}</span>
                <span className="shrink-0 tabular-nums"><b className="text-[#011140]">{m.n}</b><span className="text-[#8BA0BF]"> · {pct} %</span></span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#EDF2FE]"><div className="h-1.5 rounded-full bg-[#0439D9]" style={{ width: `${Math.max(pct, 3)}%` }} /></div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
