import { useState } from 'react'

/**
 * Barras de lo que llegó hoy en cada hora (una sola serie: el tipo de reporte elegido). Muestra solo
 * las horas con actividad y una de margen a cada lado (mínimo de 07:00 a 20:00). Al pasar el mouse o
 * tocar una barra, un aviso dice cuántos hubo; abajo hay una tabla para lectores de pantalla.
 */
export default function GraficoPorHora({ porHora, titulo, unidad }: { porHora: number[]; titulo: string; unidad: [string, string] }) {
  const [activa, setActiva] = useState<number | null>(null)
  const conDatos = porHora.flatMap((n, h) => (n > 0 ? [h] : []))
  const desde = Math.max(0, Math.min(7, (conDatos[0] ?? 7) - 1))
  const hasta = Math.min(23, Math.max(20, (conDatos[conDatos.length - 1] ?? 20) + 1))
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
  const maximo = Math.max(1, ...porHora)
  const total = porHora.reduce((a, b) => a + b, 0)
  const pico = conDatos.length ? conDatos.reduce((a, h) => (porHora[h] > porHora[a] ? h : a), conDatos[0]) : null
  const etiqueta = (n: number) => `${n} ${n === 1 ? unidad[0] : unidad[1]}`
  const hora = (h: number) => `${String(h).padStart(2, '0')}:00`

  return (
    <figure className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-bold text-[#011140]">{titulo}</span>
        <span className="text-xs text-[#627A9B]">
          {total === 0 ? 'Nada todavía hoy' : <>Hoy: <b className="font-semibold text-[#011140]">{etiqueta(total)}</b>{pico != null && <> · más a las {hora(pico)}</>}</>}
        </span>
      </figcaption>

      {total === 0 ? (
        <p className="mt-2 rounded-lg bg-[#F8FAFC] px-3 py-3 text-center text-xs text-[#627A9B]">Cuando llegue algo hoy, aquí verás en qué hora.</p>
      ) : (
      <div className="relative mt-3" onMouseLeave={() => setActiva(null)}>
        {/* Líneas guía discretas: arriba (máximo) y la base. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-[#EEF2F7]" />
        <div aria-hidden="true" className="flex h-28 items-end gap-[2px] border-b border-[#D8E3F5] sm:h-32">
          {horas.map((h) => {
            const n = porHora[h]
            const alto = n === 0 ? 0 : Math.max(6, (n / maximo) * 100)
            return (
              // Zona de toque más grande que la barra.
              <button key={h} type="button" tabIndex={-1} onMouseEnter={() => setActiva(h)} onFocus={() => setActiva(h)} onClick={() => setActiva(h)}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                <span className={`block w-full max-w-[22px] rounded-t-[4px] transition-[height,background-color] duration-500 ${activa === h ? 'bg-[#0027a2]' : 'bg-[#0439D9]'}`}
                  style={{ height: `${alto}%` }} />
              </button>
            )
          })}
        </div>
        {activa != null && (
          <div role="status" className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-[#011140] px-2 py-1 text-[11px] font-semibold text-white shadow"
            style={{ left: `${((activa - desde + 0.5) / horas.length) * 100}%` }}>
            {hora(activa)} · {etiqueta(porHora[activa])}
          </div>
        )}
        <div aria-hidden="true" className="mt-1 flex gap-[2px] text-[10px] tabular-nums text-[#8BA0BF]">
          {horas.map((h) => (
            <span key={h} className="min-w-0 flex-1 text-center">{(h - desde) % 2 === 0 ? String(h).padStart(2, '0') : ''}</span>
          ))}
        </div>
      </div>
      )}

      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead><tr><th scope="col">Hora</th><th scope="col">Cantidad</th></tr></thead>
        <tbody>{horas.map((h) => <tr key={h}><th scope="row">{hora(h)}</th><td>{porHora[h]}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
