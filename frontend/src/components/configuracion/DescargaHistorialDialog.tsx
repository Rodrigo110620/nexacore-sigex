import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Download, X } from 'lucide-react'
import FiltroSelect from '../ui/FiltroSelect'
import { listarHistorial, type AutorHistorial, type FiltrosHistorial } from '../../services/historialOperacionService'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { formatFecha } from '../../utils/examenFormat'

const fechaIso = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
const diasAtras = (n: number) => { const f = new Date(); f.setDate(f.getDate() - n); return fechaIso(f) }
const inicioDeMes = () => { const f = new Date(); f.setDate(1); return fechaIso(f) }

const RANGOS: { texto: string; desde: () => string; hasta: () => string }[] = [
  { texto: 'Hoy', desde: () => diasAtras(0), hasta: () => diasAtras(0) },
  { texto: 'Últimos 7 días', desde: () => diasAtras(7), hasta: () => diasAtras(0) },
  { texto: 'Este mes', desde: inicioDeMes, hasta: () => diasAtras(0) },
  { texto: 'Todo', desde: () => '', hasta: () => '' },
]

/** Los mismos códigos que el filtro Tipo del backend. */
const TIPOS_DESCARGA: [string, string][] = [
  ['', 'Todo'],
  ['INCIDENCIAS', 'Incidencias de control'],
  ['EXPULSIONES', 'Expulsiones'],
  ['EXCEPCIONES', 'Excepciones e ingresos manuales'],
  ['INGRESOS', 'Ingresos y salidas'],
  ['EXAMENES', 'Cambios en exámenes'],
  ['USUARIOS', 'Usuarios y roles'],
  ['ESTUDIANTES', 'Estudiantes'],
]

const CAMPO_FECHA = 'h-11 w-full rounded-lg border border-[#B8CBEF] bg-white pl-9 pr-2 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/30'

/**
 * «¿Qué quieres descargar?»: antes de bajar el PDF se eligen las fechas, el tipo, el docente (lo ocurrido en sus
 * exámenes), quién lo hizo y un examen. Empieza con lo filtrado en pantalla y dice cuántas operaciones entran.
 */
export default function DescargaHistorialDialog({ open, inicial, autores, onClose, onDescargar }: {
  open: boolean
  inicial: FiltrosHistorial
  autores: AutorHistorial[]
  onClose: () => void
  onDescargar: (filtros: FiltrosHistorial) => void
}) {
  const [f, setF] = useState<FiltrosHistorial>(inicial)
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const cerrar = useRef<HTMLButtonElement>(null)

  // Cada vez que se abre parte de lo filtrado en pantalla.
  const [abiertoAntes, setAbiertoAntes] = useState(false)
  if (open !== abiertoAntes) {
    setAbiertoAntes(open)
    if (open) { setF({ tipo: '', docente: '', examen: '', ...inicial }); setTotal(null) }
  }

  useEffect(() => {
    if (!open) return
    let vigente = true
    listarExamenes().then((l) => { if (vigente) setExamenes(l) }).catch(() => undefined)
    cerrar.current?.focus()
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', alTeclear)
    return () => { vigente = false; window.removeEventListener('keydown', alTeclear) }
  }, [open, onClose])

  // Cuántas operaciones entran con lo elegido.
  useEffect(() => {
    if (!open) return
    let vigente = true
    const id = window.setTimeout(() => {
      listarHistorial(f, 0, 1).then((r) => { if (vigente) setTotal(r.totalRegistros) }).catch(() => { if (vigente) setTotal(null) })
    }, 250)
    return () => { vigente = false; window.clearTimeout(id) }
  }, [open, f])

  const docentes = useMemo(() => {
    const m = new Map<number, string>()
    for (const e of examenes) if (e.idDocente != null && e.docente) m.set(e.idDocente, e.docente)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [examenes])
  const examenesDelDocente = useMemo(() => {
    const unicos = new Map<number, ExamenDto>()
    for (const e of examenes) if (!f.docente || String(e.idDocente) === f.docente) unicos.set(e.idExamen, e)
    return [...unicos.values()].sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio))
  }, [examenes, f.docente])

  if (!open) return null
  const poner = (campo: keyof FiltrosHistorial, valor: string) => setF((x) => ({ ...x, [campo]: valor }))
  const ademas = [
    f.search && `búsqueda «${f.search}»`, f.modulo && `módulo ${f.modulo}`, f.operacion && `operación ${f.operacion}`,
  ].filter(Boolean) as string[]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#011140]/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="descarga-titulo" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[#E6EAF0] px-5 py-4">
          <div>
            <h2 id="descarga-titulo" className="text-base font-bold text-[#011140]">¿Qué quieres descargar?</h2>
            <p className="mt-0.5 text-xs text-[#627A9B]">El PDF lleva solo lo que elijas aquí; arriba dirá qué se filtró.</p>
          </div>
          <button ref={cerrar} type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-[#627A9B] hover:bg-[#F1F6FF]"><X size={18} aria-hidden="true" /></button>
        </header>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-[#45628D]">Fechas</legend>
            <div className="flex flex-wrap gap-1.5">
              {RANGOS.map((r) => {
                const activo = f.desde === r.desde() && f.hasta === r.hasta()
                return <button key={r.texto} type="button" aria-pressed={activo} onClick={() => setF((x) => ({ ...x, desde: r.desde(), hasta: r.hasta() }))}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${activo ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#D8E3F5] bg-white text-[#45628D] hover:border-[#0439D9]'}`}>{r.texto}</button>
              })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([['desde', 'Desde'], ['hasta', 'Hasta']] as const).map(([campo, etiqueta]) => (
                <label key={campo} className="text-[11px] font-semibold text-[#45628D]">{etiqueta}
                  <span className="relative mt-1 block">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA0BF]" size={14} aria-hidden="true" />
                    <input type="date" value={f[campo]} onChange={(e) => poner(campo, e.target.value)} className={CAMPO_FECHA} />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-[#45628D]">Tipo</legend>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_DESCARGA.map(([codigo, texto]) => {
                const activo = (f.tipo ?? '') === codigo
                return <button key={codigo || 'todo'} type="button" aria-pressed={activo} onClick={() => poner('tipo', codigo)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${activo ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#D8E3F5] bg-white text-[#45628D] hover:border-[#0439D9]'}`}>{texto}</button>
              })}
            </div>
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <FiltroSelect etiqueta="Docente" value={f.docente ?? ''} onChange={(v) => setF((x) => ({ ...x, docente: v, examen: '' }))}>
                <option value="">Todos los docentes</option>
                {docentes.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </FiltroSelect>
              <p className="mt-1 text-[11px] text-[#627A9B]">Lo que pasó en sus exámenes, lo haya hecho quien sea.</p>
            </div>
            <div>
              <FiltroSelect etiqueta="Realizado por" value={f.usuario ?? ''} onChange={(v) => poner('usuario', v)}>
                <option value="">Todos</option>
                {autores.map((a) => <option key={a.idUsuario} value={a.idUsuario}>{a.nombre}{a.roles ? ` · ${a.roles}` : ''}</option>)}
              </FiltroSelect>
              <p className="mt-1 text-[11px] text-[#627A9B]">Lo que hizo esa persona con su cuenta.</p>
            </div>
            <FiltroSelect etiqueta="Examen" className="sm:col-span-2" value={f.examen ?? ''} onChange={(v) => poner('examen', v)}>
              <option value="">{f.docente ? 'Todos sus exámenes' : 'Todos los exámenes'}</option>
              {examenesDelDocente.map((e) => (
                <option key={e.idExamen} value={e.idExamen}>{e.asignatura}{e.grupo ? ` · ${e.grupo}` : ''} · {formatFecha(e.fecha)}</option>
              ))}
            </FiltroSelect>
          </div>

          {ademas.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 rounded-lg bg-[#F8FAFD] px-3 py-2 text-xs text-[#45628D]">
              También se aplica lo filtrado en pantalla: {ademas.join(' · ')}
              <button type="button" onClick={() => setF((x) => ({ ...x, search: '', modulo: '', operacion: '' }))} className="font-semibold text-[#0439D9] hover:underline">Quitar</button>
            </p>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-[#E6EAF0] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-sm text-[#45628D]">
            {total == null ? 'Contando…' : total === 0 ? 'No hay operaciones con estos filtros.'
              : <>Se descargarán <b className="text-[#011140]">{total}</b> {total === 1 ? 'operación' : 'operaciones'}.</>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="min-h-10 flex-1 rounded-lg border border-[#D8E3F5] px-4 text-sm font-semibold text-[#45628D] hover:bg-[#F8FAFD] sm:flex-none">Cancelar</button>
            <button type="button" disabled={total === 0} onClick={() => onDescargar(f)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-bold text-white hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              <Download size={15} aria-hidden="true" />Descargar PDF
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
