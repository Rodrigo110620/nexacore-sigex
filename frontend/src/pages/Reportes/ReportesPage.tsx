import { useMemo, useState } from 'react'
import { attendanceFeed } from '../../data/mock'

const filters = ['Todos', 'Admitido', 'Tarde', 'Incidencia'] as const

export default function ReportesPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof filters)[number]>('Todos')
  const [exported, setExported] = useState('')

  const rows = useMemo(() => {
    return attendanceFeed.filter((row) => {
      const matchesFilter = filter === 'Todos' || row.resultado === filter
      const haystack = `${row.estudiante} ${row.codigo} ${row.materia}`.toLowerCase()
      return matchesFilter && haystack.includes(query.trim().toLowerCase())
    })
  }, [filter, query])

  function exportCsv() {
    const header = 'codigo,estudiante,materia,hora,resultado'
    const body = rows
      .map((row) => [row.codigo, row.estudiante, row.materia, row.hora, row.resultado].join(','))
      .join('\n')
    const csv = `${header}\n${body}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'reporte-ingreso-plasma.csv'
    link.click()
    URL.revokeObjectURL(url)
    setExported(`${rows.length} filas exportadas`)
  }

  return (
    <div className="space-y-5">
      <section className="plasma-glass rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-plasma-mist">Coordinación</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Reportes de ingreso</h1>
        <p className="mt-2 max-w-2xl text-sm text-plasma-mist">
          Filtra el flujo de la jornada y descarga un CSV. Los datos de esta vista son de demostración
          para la personalización KD Plasma.
        </p>
        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <input
            className="plasma-input lg:max-w-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar estudiante, código o materia"
            aria-label="Buscar en el reporte"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={item === filter ? 'plasma-btn px-4 py-2' : 'plasma-btn-ghost px-4 py-2'}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="plasma-btn-ghost lg:ml-auto" type="button" onClick={exportCsv}>
            Exportar CSV
          </button>
        </div>
        {exported ? <p className="mt-3 text-sm text-emerald-300">{exported}</p> : null}
      </section>

      <section className="plasma-glass overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-plasma-mist">
              <tr>
                <th className="px-5 py-4">Código</th>
                <th className="px-5 py-4">Estudiante</th>
                <th className="px-5 py-4">Materia</th>
                <th className="px-5 py-4">Hora</th>
                <th className="px-5 py-4">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-plasma-mist" colSpan={5}>
                    No hay filas para ese filtro.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.codigo} className="border-t border-white/5">
                    <td className="px-5 py-4 font-medium">{row.codigo}</td>
                    <td className="px-5 py-4">{row.estudiante}</td>
                    <td className="px-5 py-4 text-plasma-mist">{row.materia}</td>
                    <td className="px-5 py-4 tabular-nums">{row.hora}</td>
                    <td className="px-5 py-4">{row.resultado}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
