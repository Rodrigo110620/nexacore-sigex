import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { ArrowLeft, CircleCheck, Inbox, LoaderCircle, Mail, Search, Send, X } from 'lucide-react'
import useEnVivo from '../../hooks/useEnVivo'
import {
  atenderSolicitudAyuda, etiquetaTipo, listarSolicitudesAyuda, type PaginaAyuda, type SolicitudAyuda,
} from '../../services/mesaAyudaService'

type Filtro = 'PENDIENTE' | 'ATENDIDA' | ''
const FILTROS: [Filtro, string][] = [['PENDIENTE', 'Pendientes'], ['ATENDIDA', 'Atendidas'], ['', 'Todas']]
const ROLES: Record<string, string> = { ADMIN: 'Administrador', DOCENTE: 'Docente', CONTROL: 'Personal de control', ESTUDIANTE: 'Estudiante' }

const fecha = (iso: string) => new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
const hora = (iso: string) => new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
/** «hace 5 min», «hace 3 h» o la fecha: para la lista. */
function hace(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`
  return fecha(iso)
}
const quien = (s: SolicitudAyuda) => s.origen === 'LOGIN' ? 'Desde el ingreso, sin sesión'
  : `Con sesión · ${(s.rol ?? '').split(',').map((r) => ROLES[r.trim()] ?? r.trim()).filter(Boolean).join(', ') || 'Usuario'}`
const iniciales = (nombre: string) => nombre.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')

function Estado({ s }: { s: SolicitudAyuda }) {
  return s.estado === 'PENDIENTE'
    ? <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B45309]"><span className="size-1.5 rounded-full bg-[#F59E0B]" aria-hidden="true" />Pendiente</span>
    : <span className="inline-flex items-center gap-1 rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#15803D]"><CircleCheck size={11} aria-hidden="true" />Atendida</span>
}

/** Detalle de una consulta: quién, qué pidió y la respuesta (o el formulario para responder). */
function Detalle({ s, onAtendida }: { s: SolicitudAyuda; onAtendida: () => void }) {
  const [respuesta, setRespuesta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const atender = async () => {
    setGuardando(true)
    setError('')
    try {
      await atenderSolicitudAyuda(s.id, respuesta)
      onAtendida()
    } catch (err) {
      setError((axios.isAxiosError(err) && (err.response?.data as { mensaje?: string })?.mensaje) || 'No se pudo atender la consulta.')
    } finally {
      setGuardando(false)
    }
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Estado s={s} />
        <span className="rounded-md bg-[#E5ECFF] px-2 py-0.5 text-[11px] font-semibold text-[#0439D9]">{etiquetaTipo(s.tipo)}</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0439D9] text-sm font-bold text-white" aria-hidden="true">{iniciales(s.nombre)}</span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[#011140]">{s.nombre}</p>
          <a href={`mailto:${s.correo}`} className="inline-flex max-w-full items-center gap-1 text-xs text-[#0439D9] hover:underline">
            <Mail size={12} className="shrink-0" aria-hidden="true" /><span className="truncate">{s.correo}</span>
          </a>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-y-1.5 text-xs">
        <dt className="text-[#627A9B]">Recibida</dt><dd className="font-semibold text-[#011140]">{fecha(s.creadaEn)} a las {hora(s.creadaEn)}</dd>
        <dt className="text-[#627A9B]">Origen</dt><dd className="font-semibold text-[#011140]">{quien(s)}</dd>
      </dl>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-[#45628D]">Consulta</p>
      <p className="mt-1.5 whitespace-pre-line break-words rounded-xl bg-[#F6F8FC] px-3.5 py-3 text-sm leading-relaxed text-[#011140]">{s.mensaje}</p>

      {s.estado === 'PENDIENTE' ? (
        <div className="mt-5">
          <label className="text-[10px] font-bold uppercase tracking-wide text-[#45628D]">Tu respuesta
            <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={5} maxLength={1000}
              placeholder={`Escribe la solución para ${s.nombre.split(' ')[0]}. Le llegará a ${s.correo}.`}
              className="mt-1.5 w-full resize-y rounded-xl border border-[#D8E3F5] px-3.5 py-3 text-sm normal-case tracking-normal text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#0439D9]/15" />
          </label>
          <p className="text-[11px] text-[#8BA0BF]">Si ya la resolviste por otro medio, déjala vacía y márcala como atendida.</p>
          {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <button type="button" onClick={() => void atender()} disabled={guardando}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] text-sm font-semibold text-white hover:bg-[#0027a2] disabled:opacity-60">
            {guardando ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : respuesta.trim() ? <Send size={16} aria-hidden="true" /> : <CircleCheck size={16} aria-hidden="true" />}
            {respuesta.trim() ? 'Responder y marcar atendida' : 'Marcar como atendida'}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-3">
          <p className="text-xs font-semibold text-[#15803D]">
            Atendida{s.atendidaPor ? ` por ${s.atendidaPor}` : ''}{s.atendidaEn ? ` el ${fecha(s.atendidaEn)} a las ${hora(s.atendidaEn)}` : ''}
          </p>
          {s.respuesta
            ? <p className="mt-1.5 whitespace-pre-line break-words text-sm text-[#011140]"><span className="text-[11px] font-semibold text-[#45628D]">Respuesta enviada por correo:</span><br />{s.respuesta}</p>
            : <p className="mt-1 text-xs text-[#45628D]">Se marcó como atendida sin enviar respuesta por correo.</p>}
        </div>
      )}
    </div>
  )
}

/**
 * Bandeja de la mesa de ayuda (ADMIN): la lista a la izquierda (pendientes primero) y el detalle con la respuesta a
 * la derecha; en celular el detalle se abre como hoja. Se actualiza en vivo.
 */
export default function BandejaAyuda({ onCambio }: { onCambio?: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>('PENDIENTE')
  const [pagina, setPagina] = useState(0)
  const [datos, setDatos] = useState<PaginaAyuda>()
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [idSeleccion, setIdSeleccion] = useState<number | null>(null)
  const [hoja, setHoja] = useState(false)
  const cerrarHoja = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let vigente = true
    listarSolicitudesAyuda(filtro, pagina, 20)
      .then((r) => { if (vigente) { setDatos(r); setError('') } })
      .catch(() => { if (vigente) setError('No se pudo cargar la mesa de ayuda.') })
    return () => { vigente = false }
  }, [filtro, pagina, recarga])

  useEffect(() => {
    if (!hoja) return
    cerrarHoja.current?.focus()
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setHoja(false) }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [hoja])

  const recargar = () => { setRecarga((n) => n + 1); onCambio?.() }
  useEnVivo((c) => c.tipo === 'AYUDA', recargar)

  const texto = busqueda.trim().toLowerCase()
  const lista = (datos?.contenido ?? []).filter((s) => !texto
    || `${s.nombre} ${s.correo} ${s.mensaje} ${etiquetaTipo(s.tipo)}`.toLowerCase().includes(texto))
  const seleccion = lista.find((s) => s.id === idSeleccion) ?? lista[0]
  const elegir = (s: SolicitudAyuda) => { setIdSeleccion(s.id); setHoja(true) }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
      <section aria-label="Consultas" className="flex min-w-0 flex-col rounded-2xl border border-[#E4E9F2] bg-white shadow-sm">
        <div className="border-b border-[#EDF1F7] p-4">
          <div role="tablist" aria-label="Estado de las consultas" className="grid grid-cols-3 rounded-lg bg-[#F1F5FB] p-1">
            {FILTROS.map(([valor, nombre]) => (
              <button key={nombre} type="button" role="tab" aria-selected={filtro === valor} onClick={() => { setFiltro(valor); setPagina(0); setIdSeleccion(null) }}
                className={`min-h-9 rounded-md text-xs font-semibold transition-colors ${filtro === valor ? 'bg-white text-[#011140] shadow-sm' : 'text-[#627A9B] hover:text-[#011140]'}`}>{nombre}</button>
            ))}
          </div>
          <label className="relative mt-3 block">
            <span className="sr-only">Buscar consulta</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA0BF]" aria-hidden="true" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, correo o mensaje"
              className="h-10 w-full rounded-lg border border-[#D8E3F5] pl-9 pr-3 text-sm text-[#011140] outline-none focus:border-[#0439D9]" />
          </label>
        </div>

        {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!datos && !error && <p role="status" className="py-10 text-center text-sm text-[#627A9B]">Cargando consultas…</p>}
        {datos && lista.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[#F1F5FB] text-[#8BA0BF]"><Inbox size={22} aria-hidden="true" /></span>
            <p className="text-sm font-semibold text-[#011140]">{texto ? 'Sin resultados' : filtro === 'PENDIENTE' ? 'No hay consultas pendientes' : 'No hay consultas'}</p>
            <p className="text-xs text-[#627A9B]">{texto ? 'Prueba con otra búsqueda.' : filtro === 'PENDIENTE' ? 'Todo al día. Las nuevas aparecen aquí al instante.' : 'Aún no llegó ninguna consulta.'}</p>
          </div>
        )}
        {lista.length > 0 && (
          <ul className="divide-y divide-[#EDF1F7]">
            {lista.map((s) => {
              const activa = seleccion?.id === s.id
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => elegir(s)} aria-current={activa ? 'true' : undefined}
                    className={`relative flex w-full gap-3 px-4 py-3.5 text-left transition-colors ${activa ? 'bg-[#EDF3FF] lg:before:absolute lg:before:inset-y-0 lg:before:left-0 lg:before:w-[3px] lg:before:bg-[#0439D9]' : 'hover:bg-[#F8FAFD]'}`}>
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${s.estado === 'PENDIENTE' ? 'bg-[#F59E0B]' : 'bg-transparent'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm text-[#011140] ${s.estado === 'PENDIENTE' ? 'font-bold' : 'font-semibold'}`}>{s.nombre}</span>
                        <span className="shrink-0 text-[11px] text-[#8BA0BF]">{hace(s.creadaEn)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-[#0439D9]">{etiquetaTipo(s.tipo)}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-[#627A9B]">{s.mensaje}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {datos && datos.totalPaginas > 1 && (
          <div className="mt-auto flex items-center justify-between border-t border-[#EDF1F7] px-4 py-3 text-xs text-[#627A9B]">
            <span>Página {datos.pagina + 1} de {datos.totalPaginas}</span>
            <div className="flex gap-2">
              <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="min-h-9 rounded-lg border border-[#C9D8F2] px-3 font-semibold text-[#0439D9] disabled:opacity-40">Anterior</button>
              <button type="button" disabled={pagina + 1 >= datos.totalPaginas} onClick={() => setPagina((p) => p + 1)} className="min-h-9 rounded-lg border border-[#C9D8F2] px-3 font-semibold text-[#0439D9] disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </section>

      <aside aria-label="Detalle de la consulta" className="hidden h-fit min-w-0 rounded-2xl border border-[#E4E9F2] bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:block">
        {seleccion
          ? <Detalle key={seleccion.id} s={seleccion} onAtendida={recargar} />
          : <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-[#627A9B]"><Inbox size={24} className="text-[#8BA0BF]" aria-hidden="true" />Elige una consulta para verla.</div>}
      </aside>

      {hoja && seleccion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#011140]/40 sm:items-center sm:p-4 lg:hidden" onClick={() => setHoja(false)}>
          <div role="dialog" aria-modal="true" aria-label="Detalle de la consulta" onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setHoja(false)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#45628D]"><ArrowLeft size={14} aria-hidden="true" />Volver a la lista</button>
              <button ref={cerrarHoja} type="button" onClick={() => setHoja(false)} aria-label="Cerrar" className="grid size-9 place-items-center rounded-lg text-[#45628D] hover:bg-[#F1F6FF]"><X size={18} aria-hidden="true" /></button>
            </div>
            <Detalle key={seleccion.id} s={seleccion} onAtendida={() => { setHoja(false); recargar() }} />
          </div>
        </div>
      )}
    </div>
  )
}
