const ROWS = [
  { materia: 'Cálculo II', aula: 'A-204', inscritos: 86, ingresaron: 79, incidencias: 1 },
  { materia: 'Base de Datos', aula: 'Lab 3', inscritos: 42, ingresaron: 18, incidencias: 0 },
  { materia: 'Redes I', aula: 'B-110', inscritos: 64, ingresaron: 0, incidencias: 0 },
  { materia: 'Física I', aula: 'C-101', inscritos: 91, ingresaron: 88, incidencias: 2 },
]

export default function ReportesPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Asistencia por examen</h2>
      <p className="mt-1 text-sm text-[var(--plasma-muted)]">
        Vista previa con datos de demostración. El gráfico usa la paleta Breeze de tu Plasma.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {ROWS.map((row) => {
          const percent = Math.round((row.ingresaron / row.inscritos) * 100)
          return (
            <article key={row.materia} className="rounded-2xl bg-[var(--plasma-card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{row.materia}</h3>
                  <p className="text-xs text-[var(--plasma-muted)]">{row.aula}</p>
                </div>
                <span className="text-sm font-medium text-[var(--plasma-accent)]">{percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--plasma-view)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, background: 'var(--plasma-accent)' }}
                />
              </div>
              <p className="mt-3 text-sm text-[var(--plasma-muted)]">
                {row.ingresaron}/{row.inscritos} ingresaron · {row.incidencias} incidencias
              </p>
            </article>
          )
        })}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--plasma-border)]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[var(--plasma-card)] text-[var(--plasma-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Materia</th>
              <th className="px-4 py-3 font-medium">Aula</th>
              <th className="px-4 py-3 font-medium">Inscritos</th>
              <th className="px-4 py-3 font-medium">Ingresaron</th>
              <th className="px-4 py-3 font-medium">Incidencias</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.materia} className="border-t border-[var(--plasma-border)]">
                <td className="px-4 py-3">{row.materia}</td>
                <td className="px-4 py-3">{row.aula}</td>
                <td className="px-4 py-3">{row.inscritos}</td>
                <td className="px-4 py-3">{row.ingresaron}</td>
                <td className="px-4 py-3">{row.incidencias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
