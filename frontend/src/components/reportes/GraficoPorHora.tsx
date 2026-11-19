import { useId, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Clock3, Flame, Minus } from 'lucide-react'

const HOY = '#0439D9'
const AYER = '#94A3B8'

interface Props {
  /** Cuántos llegaron hoy en cada hora (0 a 23). */
  porHora: number[]
  /** Lo mismo, de ayer, para comparar. */
  porHoraAyer: number[]
  /** Último registro de hoy ("2026-11-18T21:31:15"), o null. */
  ultimoHoy: string | null
  /** Hora actual (0 a 23), para marcarla. */
  horaActual: number
  /** En el período elegido, cuántos hubo por motivo. */
  porMotivo?: { etiqueta: string; n: number }[]
  /** Período elegido, para el título de «Por motivo» («Todo», «Hoy»…). */
  periodo?: string
  titulo: string
  unidad: [string, string]
}

const hora = (h: number) => `${String(h).padStart(2, '0')}:00`

function Dato({ icono: Icono, etiqueta, valor, detalle, tono }: {
  icono: typeof Clock3
  etiqueta: string
  valor: string
  detalle?: string
  tono: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#EDF1F7] bg-white px-3 py-2.5">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tono}`}><Icono size={16} aria-hidden="true" /></span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#8BA0BF]">{etiqueta}</span>
        <span className="block truncate text-base font-bold leading-tight text-[#011140]">{valor}</span>
        {detalle && <span className="block truncate text-[11px] text-[#627A9B]">{detalle}</span>}
      </span>
    </div>
  )
}

/** Curva suave que no se pasa de los puntos (tangentes horizontales): no inventa picos ni valores negativos. */
function curva(puntos: [number, number][]): string {
  if (puntos.length === 0) return ''
  let d = `M${puntos[0][0]},${puntos[0][1]}`
  for (let i = 1; i < puntos.length; i++) {
    const [x0, y0] = puntos[i - 1]
    const [x1, y1] = puntos[i]
    const mx = (x0 + x1) / 2
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`
  }
  return d
}

/** Barras horizontales: cuántos hubo por motivo en el período (una sola serie, de mayor a menor). */
function PorMotivo({ motivos, periodo, unidad }: { motivos: { etiqueta: string; n: number }[]; periodo?: string; unidad: [string, string] }) {
  const total = motivos.reduce((t, m) => t + m.n, 0)
  const mayor = Math.max(1, ...motivos.map((m) => m.n))
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-[#EDF1F7] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8BA0BF]">Por motivo{periodo ? ` · ${periodo}` : ''}</p>
      {total === 0 ? (
        <p className="m-auto py-6 text-center text-xs text-[#627A9B]">Sin {unidad[1]} en este período.</p>
      ) : (
        <ul className="mt-2.5 space-y-2.5">
          {motivos.map((m) => (
            <li key={m.etiqueta} title={`${m.etiqueta}: ${m.n}`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-[#334155]">{m.etiqueta}</span>
                <span className="shrink-0 tabular-nums text-[#011140]"><b>{m.n}</b> <span className="text-[#8BA0BF]">· {Math.round((m.n / total) * 100)} %</span></span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EEF2F7]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#0439D9] transition-[width] duration-700" style={{ width: `${(m.n / mayor) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Panel de Reportes: datos clave (hoy contra ayer, hora pico, último registro), un gráfico de área por hora
 * (hoy, con relleno; ayer, en línea punteada para comparar) y barras «Por motivo» del período. Al pasar el
 * mouse o tocar una hora, una línea guía y un aviso dan las cifras. Abajo hay una tabla para lectores de pantalla.
 */
export default function GraficoPorHora({ porHora, porHoraAyer, ultimoHoy, horaActual, porMotivo, periodo, titulo, unidad }: Props) {
  const id = useId().replace(/:/g, '')
  const [activa, setActiva] = useState<number | null>(null)
  const total = porHora.reduce((a, b) => a + b, 0)
  const totalAyer = porHoraAyer.reduce((a, b) => a + b, 0)
  const etiqueta = (n: number) => `${n} ${n === 1 ? unidad[0] : unidad[1]}`

  // Rango: de la primera a la última hora con algo (hoy, ayer o la actual), con margen y al menos 10 horas.
  const conAlgo = [...porHora.flatMap((n, h) => (n > 0 ? [h] : [])), ...porHoraAyer.flatMap((n, h) => (n > 0 ? [h] : [])), horaActual]
  let desde = Math.max(0, Math.min(...conAlgo) - 1)
  let hasta = Math.min(23, Math.max(...conAlgo) + 1)
  while (hasta - desde < 9 && !(desde === 0 && hasta === 23)) {
    if (desde > 0) desde -= 1
    if (hasta - desde < 9 && hasta < 23) hasta += 1
  }
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)

  // Escala con números redondos (0, mitad, tope) y algo de aire arriba para los números.
  const mayor = Math.max(1, ...horas.map((h) => Math.max(porHora[h], porHoraAyer[h])))
  const tope = mayor <= 4 ? 4 : Math.ceil(mayor / 4) * 4
  const ANCHO = 1000
  const ALTO = 100
  const x = (h: number) => ((h - desde) / Math.max(1, horas.length - 1)) * ANCHO
  const y = (n: number) => ALTO - (n / tope) * ALTO
  // Hoy solo hasta la hora actual (lo que viene aún no pasó); ayer, el día entero.
  const horasHoy = horas.filter((h) => h <= horaActual)
  const puntosHoy = horasHoy.map((h): [number, number] => [x(h), y(porHora[h])])
  const puntosAyer = horas.map((h): [number, number] => [x(h), y(porHoraAyer[h])])
  const lineaHoy = curva(puntosHoy)
  const areaHoy = puntosHoy.length ? `${lineaHoy} L${puntosHoy[puntosHoy.length - 1][0]},${ALTO} L${puntosHoy[0][0]},${ALTO} Z` : ''
  const pct = (h: number) => `${(x(h) / ANCHO) * 100}%`

  const pico = total ? porHora.reduce((a, n, h) => (n > porHora[a] ? h : a), 0) : null
  const diferencia = total - totalAyer
  const TendenciaIcono = diferencia > 0 ? ArrowUpRight : diferencia < 0 ? ArrowDownRight : Minus

  return (
    <figure className="rounded-2xl border border-[#D8E3F5] bg-gradient-to-b from-white to-[#F8FAFF] p-3 shadow-sm sm:p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <span className="text-sm font-bold text-[#011140]">{titulo}</span>
        <span className="flex items-center gap-3 text-[11px] text-[#45628D]">
          <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ background: HOY }} aria-hidden="true" />Hoy</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: AYER }} aria-hidden="true" />Ayer</span>
        </span>
      </figcaption>

      <div className="mt-3 grid gap-3 lg:grid-cols-[12.5rem_minmax(0,1fr)] xl:grid-cols-[12.5rem_minmax(0,1fr)_16rem]">
        {/* Datos clave. */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:content-start">
          <div className="col-span-2 rounded-xl bg-gradient-to-br from-[#0439D9] via-[#1D4ED8] to-[#3B82F6] px-3.5 py-3 text-white shadow-md shadow-[#0439D9]/20 lg:col-span-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/75">Hoy</span>
            <span className="block text-3xl font-extrabold leading-tight tabular-nums">{total}</span>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
              <TendenciaIcono size={13} aria-hidden="true" />
              {diferencia === 0 ? 'Igual que ayer' : `${Math.abs(diferencia)} ${diferencia > 0 ? 'más' : 'menos'} que ayer`}
            </span>
          </div>
          <Dato icono={Flame} etiqueta="Hora pico" valor={pico == null ? '—' : hora(pico)} detalle={pico == null ? 'Sin registros hoy' : etiqueta(porHora[pico])}
            tono="text-[#B45309] bg-[#FEF3C7]" />
          <Dato icono={Clock3} etiqueta="Último registro" valor={ultimoHoy ? ultimoHoy.slice(11, 16) : '—'} detalle={ultimoHoy ? 'hoy' : 'Nada todavía'}
            tono="text-[#0439D9] bg-[#E9F1FF]" />
        </div>

        {/* Gráfico de área por hora. */}
        <div className="min-w-0 rounded-xl border border-[#EDF1F7] bg-white p-3">
          <div className="flex">
            <div aria-hidden="true" className="relative mr-2 h-40 w-5 shrink-0 text-right text-[10px] tabular-nums text-[#8BA0BF] sm:h-44 lg:h-[12.5rem]">
              {[tope, tope / 2, 0].map((v, i) => (
                <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${i * 50}%` }}>{v}</span>
              ))}
            </div>
            <div className="relative h-40 min-w-0 flex-1 sm:h-44 lg:h-[12.5rem]" onMouseLeave={() => setActiva(null)}>
              {/* Guías discretas. */}
              {[0, 50].map((t) => (
                <div key={t} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#EEF2F7]" style={{ top: `${t}%` }} />
              ))}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[#D8E3F5]" />
              {/* Hora actual: línea vertical. */}
              {horaActual >= desde && horaActual <= hasta && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l border-dashed border-[#0439D9]/40" style={{ left: pct(horaActual) }} />
              )}
              <svg aria-hidden="true" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                <defs>
                  <linearGradient id={`relleno-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HOY} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={HOY} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={curva(puntosAyer)} fill="none" stroke={AYER} strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
                {areaHoy && <path d={areaHoy} fill={`url(#relleno-${id})`} />}
                {lineaHoy && <path d={lineaHoy} fill="none" stroke={HOY} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
              </svg>
              {/* Puntos de hoy (en HTML: siempre redondos) con su número encima. */}
              {horasHoy.filter((h) => porHora[h] > 0).map((h) => (
                <span key={h} aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 translate-y-1/2" style={{ left: pct(h), bottom: `${(porHora[h] / tope) * 100}%` }}>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-white/90 px-1 text-[11px] font-bold tabular-nums text-[#011140]">{porHora[h]}</span>
                  <span className={`block rounded-full border-2 border-white shadow ${activa === h ? 'size-3.5' : 'size-2.5'}`} style={{ background: HOY }} />
                </span>
              ))}
              {/* Línea guía y aviso de la hora elegida. */}
              {activa != null && (
                <>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l border-[#011140]/25" style={{ left: pct(activa) }} />
                  <div role="status" className={`pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg bg-[#011140] px-2.5 py-1.5 text-[11px] text-white shadow-lg ${
                    x(activa) / ANCHO > 0.7 ? '-translate-x-[calc(100%+8px)]' : 'translate-x-2'}`} style={{ left: pct(activa) }}>
                    <span className="block font-bold">{hora(activa)} – {hora((activa + 1) % 24)}</span>
                    <span className="block"><span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: HOY }} />Hoy: {activa > horaActual ? '—' : etiqueta(porHora[activa])}</span>
                    <span className="block text-white/75"><span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: AYER }} />Ayer: {etiqueta(porHoraAyer[activa])}</span>
                  </div>
                </>
              )}
              {/* Zonas de toque: una por hora, todo el alto. */}
              <div className="absolute inset-0 flex">
                {horas.map((h) => (
                  <button key={h} type="button" tabIndex={-1} aria-hidden="true" onMouseEnter={() => setActiva(h)} onClick={() => setActiva(h)}
                    className="h-full min-w-0 flex-1" style={{ marginLeft: h === desde ? `-${50 / horas.length}%` : undefined }} />
                ))}
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="relative ml-7 mt-1.5 h-4 text-[10px] tabular-nums text-[#8BA0BF]">
            {horas.map((h) => (
              <span key={h} className={`absolute -translate-x-1/2 ${h === horaActual ? 'font-bold text-[#0439D9]' : ''} ${(h - desde) % 2 === 1 && h !== horaActual ? 'max-sm:hidden' : ''}`}
                style={{ left: pct(h) }}>
                {h === horaActual ? 'Ahora' : String(h).padStart(2, '0')}
              </span>
            ))}
          </div>
          {total === 0 && totalAyer === 0 && (
            <p className="mt-2 text-center text-xs text-[#627A9B]">Ni hoy ni ayer hubo registros: cuando llegue algo, aparecerá aquí en su hora.</p>
          )}
        </div>

        {porMotivo && (
          <div className="lg:col-span-2 xl:col-span-1">
            <PorMotivo motivos={porMotivo} periodo={periodo} unidad={unidad} />
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead><tr><th scope="col">Hora</th><th scope="col">Hoy</th><th scope="col">Ayer</th></tr></thead>
        <tbody>{horas.map((h) => <tr key={h}><th scope="row">{hora(h)}</th><td>{porHora[h]}</td><td>{porHoraAyer[h]}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
