import { useId } from 'react'
import { curvaSuave, maximoEje } from '../../utils/graficas'

/** Arco de un anillo, en grados desde arriba y en sentido horario. */
function arco(c: number, r: number, g0: number, g1: number): string {
  const punto = (g: number) => {
    const a = (g * Math.PI) / 180
    return `${(c + r * Math.sin(a)).toFixed(2)} ${(c - r * Math.cos(a)).toFixed(2)}`
  }
  const fin = Math.min(g1, g0 + 359.9)
  return `M${punto(g0)} A${r} ${r} 0 ${fin - g0 > 180 ? 1 : 0} 1 ${punto(fin)}`
}

export interface ParteAnillo {
  valor: number
  desde: string
  hasta: string
}

/** Anillo con puntas redondeadas y un degradado por parte; el contenido va al centro. */
export function Anillo({ partes, tam, grosor, pista = '#EEF2F7', pistaOpacidad = 1, children, etiqueta }: {
  partes: ParteAnillo[]
  tam: number
  grosor: number
  pista?: string
  pistaOpacidad?: number
  children?: React.ReactNode
  etiqueta: string
}) {
  const id = useId().replace(/:/g, '')
  const r = tam / 2 - grosor / 2 - 1
  const c = tam / 2
  const total = partes.reduce((s, p) => s + p.valor, 0)
  const tapa = ((grosor / 2) / r) * (180 / Math.PI)
  const hueco = partes.filter((p) => p.valor > 0).length > 1 ? 6 : 0
  let inicio = 0
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={etiqueta}>
        <defs>
          {partes.map((p, i) => (
            <linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={p.desde} />
              <stop offset="1" stopColor={p.hasta} />
            </linearGradient>
          ))}
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke={pista} strokeOpacity={pistaOpacidad} strokeWidth={grosor} />
        {total > 0 && partes.map((p, i) => {
          const grados = (p.valor / total) * 360
          const desde = inicio
          inicio += grados
          if (p.valor <= 0) return null
          let a0 = desde + tapa + hueco / 2
          let a1 = desde + grados - tapa - hueco / 2
          if (a1 <= a0) { const m = desde + grados / 2; a0 = m - 0.3; a1 = m + 0.3 }
          return <path key={i} d={arco(c, r, a0, a1)} fill="none" stroke={`url(#${id}-${i})`} strokeWidth={grosor} strokeLinecap="round" />
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

/** Mini gráfica de tendencia para las tarjetas de resumen. */
export function Sparkline({ valores, desde, hasta, etiqueta }: { valores: number[]; desde: string; hasta: string; etiqueta: string }) {
  const id = useId().replace(/:/g, '')
  const w = 200
  const h = 40
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const x = (i: number) => (i / Math.max(1, valores.length - 1)) * (w - 8) + 4
  const y = (v: number) => h - 4 - ((v - min) / (max - min || 1)) * (h - 12)
  const puntos = valores.map((v, i) => [x(i), y(v)] as [number, number])
  const d = curvaSuave(puntos, h)
  const ultimo = puntos[puntos.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" role="img" aria-label={etiqueta}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hasta} stopOpacity="0.28" />
          <stop offset="1" stopColor={hasta} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={desde} />
          <stop offset="1" stopColor={hasta} />
        </linearGradient>
      </defs>
      <path d={`${d} L${ultimo[0]} ${h} L${puntos[0][0]} ${h} Z`} fill={`url(#${id}-a)`} />
      <path d={d} fill="none" stroke={`url(#${id}-l)`} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Ingresos de hoy por hora: área suave con degradado, la hora actual marcada y lo esperado en punteado. */
/** compacta: para tarjetas angostas (380 px): solo una hora de cada dos y sin «:00», para que no se encimen. */
export function GraficaIngresosHora({ horas, reales, esperados, horaActual, compacta = false }: {
  compacta?: boolean
  horas: number[]
  reales: number[]
  esperados: number[]
  horaActual: number
}) {
  const id = useId().replace(/:/g, '')
  const w = 720
  const h = 200
  const max = maximoEje(Math.max(1, ...reales, ...esperados))
  const ticks = [0, max / 3, (2 * max) / 3, max]
  const slot = w / horas.length
  const x = (i: number) => i * slot + slot / 2
  const y = (v: number) => h - (v / max) * h * 0.96
  const iActual = horas.indexOf(horaActual)
  const hastaAhora = iActual >= 0 ? iActual : horas.findIndex((hh) => hh > horaActual) - 1
  const finReal = hastaAhora < 0 ? (horaActual < horas[0] ? -1 : horas.length - 1) : hastaAhora
  const puntosReales = reales.slice(0, finReal + 1).map((v, i) => [x(i), y(v)] as [number, number])
  const puntosEsperados = finReal >= 0 && finReal < horas.length - 1
    ? [[x(finReal), y(reales[finReal])] as [number, number], ...esperados.slice(finReal + 1).map((v, i) => [x(finReal + 1 + i), y(v)] as [number, number])]
    : []
  const linea = curvaSuave(puntosReales, h)
  const conEsperados = esperados.slice(finReal + 1).some((v) => v > 0)
  const actual = iActual >= 0 ? { cx: x(iActual), cy: y(reales[iActual]), valor: reales[iActual] } : null
  return (
    <figure className="m-0">
      <div className="flex gap-2">
        <div className="flex h-[200px] w-7 shrink-0 flex-col justify-between py-0 text-right text-[10px] leading-none text-[#94A3B8] sm:h-[212px]" aria-hidden="true">
          {[...ticks].reverse().map((t) => <span key={t}>{Math.round(t)}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <svg viewBox={`0 0 ${w} ${h}`} className="h-[200px] w-full sm:h-[212px]" preserveAspectRatio="none" role="img"
            aria-label={`Ingresos por hora: ${reales.reduce((a, b) => a + b, 0)} hoy`}>
            <defs>
              <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3B6BF5" stopOpacity="0.35" />
                <stop offset="1" stopColor="#3B6BF5" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${id}-linea`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#06B6D4" />
                <stop offset="0.5" stopColor="#3B6BF5" />
                <stop offset="1" stopColor="#7C3AED" />
              </linearGradient>
              <linearGradient id={`${id}-hora`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3B6BF5" stopOpacity="0.14" />
                <stop offset="1" stopColor="#3B6BF5" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <line key={t} x1="0" x2={w} y1={Math.min(h - 0.5, Math.max(0.5, y(t)))} y2={Math.min(h - 0.5, Math.max(0.5, y(t)))}
                stroke="#E8EDF5" strokeDasharray={t ? '4 4' : undefined} vectorEffect="non-scaling-stroke" />
            ))}
            {actual && <rect x={actual.cx - slot / 2} y="0" width={slot} height={h} rx="8" fill={`url(#${id}-hora)`} />}
            {puntosReales.length > 1 && (
              <>
                <path d={`${linea} L${puntosReales[puntosReales.length - 1][0]} ${h} L${puntosReales[0][0]} ${h} Z`} fill={`url(#${id}-area)`} />
                <path d={linea} fill="none" stroke={`url(#${id}-linea)`} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </>
            )}
            {conEsperados && puntosEsperados.length > 1 && (
              <path d={curvaSuave(puntosEsperados, h)} fill="none" stroke="#A5B4FC" strokeWidth="2.5" strokeDasharray="6 6"
                strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            )}
            {actual && <line x1={actual.cx} x2={actual.cx} y1={actual.cy} y2={h} stroke="#3B6BF5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          </svg>
          {actual && actual.valor > 0 && (
            <>
              <span className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#3B6BF5] shadow-[0_0_0_6px_rgba(59,107,245,0.18)]"
                style={{ left: `${(actual.cx / w) * 100}%`, top: `${(actual.cy / h) * 100}%` }} aria-hidden="true" />
              {/* Cerca del borde superior, el globo va debajo del punto para no tapar la cabecera. */}
              <span className={`pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0B1640] px-2.5 py-1.5 text-center shadow-lg ${actual.cy / h < 0.35 ? 'translate-y-[14px]' : '-translate-y-[calc(100%+14px)]'}`}
                style={{ left: `${Math.min(88, Math.max(12, (actual.cx / w) * 100))}%`, top: `${(actual.cy / h) * 100}%` }}>
                <span className="block text-[10px] font-medium text-[#A5B8E8]">Hoy · {String(horaActual).padStart(2, '0')}:00</span>
                <span className="block text-xs font-bold text-white">{actual.valor} {actual.valor === 1 ? 'ingreso' : 'ingresos'}</span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="ml-9 mt-1.5 flex" aria-hidden="true">
        {horas.map((hh, i) => (
          <span key={hh} className={`flex-1 text-center text-[10px] ${hh === horaActual ? 'font-bold text-[#0439D9]' : 'text-[#94A3B8]'} ${i % 2 ? (compacta ? 'invisible' : 'max-sm:invisible') : ''}`}>
            {String(hh).padStart(2, '0')}<span className={compacta ? 'hidden' : 'max-sm:hidden'}>:00</span>
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-[11px] font-medium text-[#45628D]">
        <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-gradient-to-r from-[#06B6D4] to-[#7C3AED]" />Ingresaron</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#A5B4FC]" />Esperados (por iniciar)</span>
      </figcaption>
    </figure>
  )
}

export interface DiaColumna {
  etiqueta: string
  ingresados: number
  ausentes: number
  hoy?: boolean
}

/** Asistencia por día: columnas en píldora con degradado, ausentes encima y el valor arriba. */
export function GraficaAsistenciaDias({ dias }: { dias: DiaColumna[] }) {
  const id = useId().replace(/:/g, '')
  const w = 490
  const h = 180
  const max = maximoEje(Math.max(1, ...dias.map((d) => d.ingresados + d.ausentes)))
  const ticks = [0, max / 3, (2 * max) / 3, max]
  const slot = w / dias.length
  const bw = Math.min(28, slot * 0.46)
  return (
    <figure className="m-0">
      <div className="flex gap-2">
        <div className="flex h-[180px] w-7 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-[#94A3B8]" aria-hidden="true">
          {[...ticks].reverse().map((t) => <span key={t}>{Math.round(t)}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full" preserveAspectRatio="none" role="img"
            aria-label={`Asistencia de los últimos ${dias.length} días`}>
            <defs>
              <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34D399" /><stop offset="1" stopColor="#059669" /></linearGradient>
              <linearGradient id={`${id}-h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#818CF8" /><stop offset="1" stopColor="#2563EB" /></linearGradient>
              <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FCD34D" /><stop offset="1" stopColor="#F59E0B" /></linearGradient>
            </defs>
            {ticks.map((t) => (
              <line key={t} x1="0" x2={w} y1={Math.min(h - 0.5, Math.max(0.5, h - (t / max) * h))} y2={Math.min(h - 0.5, Math.max(0.5, h - (t / max) * h))}
                stroke="#E8EDF5" strokeDasharray={t ? '4 4' : undefined} vectorEffect="non-scaling-stroke" />
            ))}
            {dias.map((d, i) => {
              const x0 = i * slot + (slot - bw) / 2
              const hi = (d.ingresados / max) * h
              const ha = d.ausentes ? Math.max(5, (d.ausentes / max) * h) : 0
              return (
                <g key={d.etiqueta}>
                  <rect x={x0} y="0" width={bw} height={h} rx={bw / 2} fill="#F1F5F9" />
                  {hi > 0 && <rect x={x0} y={h - hi} width={bw} height={hi} rx={Math.min(bw / 2, hi / 2)} fill={`url(#${id}-${d.hoy ? 'h' : 'v'})`} />}
                  {ha > 0 && <rect x={x0 + bw * 0.2} y={h - hi - ha - 3} width={bw * 0.6} height={ha} rx={Math.min(bw * 0.3, ha / 2)} fill={`url(#${id}-a)`} />}
                </g>
              )
            })}
          </svg>
          {dias.map((d, i) => d.ingresados > 0 && (
            <span key={d.etiqueta} className={`pointer-events-none absolute -translate-x-1/2 text-[10px] font-bold ${d.hoy ? 'text-[#2563EB]' : 'text-[#334155]'}`}
              style={{ left: `${((i + 0.5) / dias.length) * 100}%`, bottom: `calc(${((d.ingresados + d.ausentes) / max) * 100}% + ${d.ausentes ? 10 : 4}px)` }}>
              {d.ingresados}
            </span>
          ))}
        </div>
      </div>
      <div className="ml-9 mt-1.5 flex" aria-hidden="true">
        {dias.map((d) => (
          <span key={d.etiqueta} className={`flex-1 text-center text-[10px] ${d.hoy ? 'font-bold text-[#2563EB]' : 'text-[#94A3B8]'}`}>{d.etiqueta}</span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-[11px] font-medium text-[#45628D]">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#10B981]" />Ingresaron</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#F59E0B]" />Ausentes</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#4F46E5]" />Hoy (parcial)</span>
      </figcaption>
    </figure>
  )
}

/** Barra horizontal en píldora con degradado. */
export function BarraDegradado({ valor, max, desde, hasta, etiqueta }: { valor: number; max: number; desde: string; hasta: string; etiqueta: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]" role="progressbar" aria-label={etiqueta}
      aria-valuenow={valor} aria-valuemin={0} aria-valuemax={max}>
      {pct > 0 && <div className="h-full min-w-[10px] rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${desde}, ${hasta})` }} />}
    </div>
  )
}
