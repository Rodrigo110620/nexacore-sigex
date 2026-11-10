import { useEffect, useState } from 'react'
import axios from 'axios'
import { CircleCheck, Inbox, LoaderCircle, Mail, Send } from 'lucide-react'
import useEnVivo from '../../hooks/useEnVivo'
import {
  atenderSolicitudAyuda, etiquetaTipo, listarSolicitudesAyuda, type PaginaAyuda, type SolicitudAyuda,
} from '../../services/mesaAyudaService'

type Filtro = 'PENDIENTE' | 'ATENDIDA' | ''
const FILTROS: [Filtro, string][] = [['PENDIENTE', 'Pendientes'], ['ATENDIDA', 'Atendidas'], ['', 'Todas']]
const ROLES: Record<string, string> = { ADMIN: 'Administrador', DOCENTE: 'Docente', CONTROL: 'Personal de control', ESTUDIANTE: 'Estudiante' }

const fecha = (iso: string) => new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
const hora = (iso: string) => new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
const quien = (s: SolicitudAyuda) => s.origen === 'LOGIN' ? 'Desde el ingreso (sin sesión)'
  : (s.rol ?? '').split(',').map((r) => ROLES[r.trim()] ?? r.trim()).filter(Boolean).join(', ') || 'Con sesión'

function Consulta({ s, onAtendida }: { s: SolicitudAyuda; onAtendida: () => void }) {
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
  const pendiente = s.estado === 'PENDIENTE'
  return (
    <li className="rounded-xl border border-[#E4E9F2] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pendiente ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#DCFCE7] text-[#15803D]'}`}>{pendiente ? 'Pendiente' : 'Atendida'}</span>
        <span className="rounded-md bg-[#E5ECFF] px-2 py-0.5 text-[11px] font-semibold text-[#0439D9]">{etiquetaTipo(s.tipo)}</span>
        <span className="ml-auto text-[11px] text-[#627A9B]">{fecha(s.creadaEn)} · {hora(s.creadaEn)}</span>
      </div>
      <p className="mt-2 text-sm font-bold text-[#011140]">{s.nombre}</p>
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-[#627A9B]"><a href={`mailto:${s.correo}`} className="inline-flex items-center gap-1 break-all text-[#0439D9] hover:underline"><Mail size={12} aria-hidden="true" />{s.correo}</a><span>· {quien(s)}</span></p>
      <p className="mt-2 whitespace-pre-line break-words rounded-lg bg-[#F6F8FC] px-3 py-2 text-sm text-[#011140]">{s.mensaje}</p>
      {pendiente ? (
        <div className="mt-3">
          <label className="text-xs font-semibold text-[#011140]">Respuesta (opcional: se envía por correo)
            <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={3} maxLength={1000}
              placeholder="Escribe la solución. Si la resolviste por otro medio, déjala vacía y márcala como atendida."
              className="mt-1 w-full resize-y rounded-lg border border-[#D8E3F5] px-3 py-2 text-sm text-[#011140] outline-none focus:border-[#0439D9]" />
          </label>
          {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => void atender()} disabled={guardando}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0027a2] disabled:opacity-60">
              {guardando ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : respuesta.trim() ? <Send size={15} aria-hidden="true" /> : <CircleCheck size={15} aria-hidden="true" />}
              {respuesta.trim() ? 'Responder y marcar atendida' : 'Marcar como atendida'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-[#EDF1F7] pt-2 text-xs text-[#45628D]">
          <p>Atendida{s.atendidaPor ? ` por ${s.atendidaPor}` : ''}{s.atendidaEn ? ` el ${fecha(s.atendidaEn)} a las ${hora(s.atendidaEn)}` : ''}.</p>
          {s.respuesta && <p className="mt-1 whitespace-pre-line break-words"><b className="font-semibold text-[#011140]">Respuesta enviada:</b> {s.respuesta}</p>}
        </div>
      )}
    </li>
  )
}

/** Bandeja de la mesa de ayuda (ADMIN): consultas pendientes primero; se actualiza en vivo. */
export default function BandejaAyuda({ onCambio }: { onCambio?: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>('PENDIENTE')
  const [pagina, setPagina] = useState(0)
  const [datos, setDatos] = useState<PaginaAyuda>()
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let vigente = true
    listarSolicitudesAyuda(filtro, pagina)
      .then((r) => { if (vigente) { setDatos(r); setError('') } })
      .catch(() => { if (vigente) setError('No se pudo cargar la mesa de ayuda.') })
    return () => { vigente = false }
  }, [filtro, pagina, recarga])

  useEnVivo((c) => c.tipo === 'AYUDA', () => { setRecarga((n) => n + 1); onCambio?.() })

  return (
    <section aria-labelledby="ayuda-titulo" className="rounded-2xl border border-[#E4E9F2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ayuda-titulo" className="text-base font-bold text-[#011140]">Mesa de ayuda</h2>
          <p className="text-xs text-[#627A9B]">Consultas de estudiantes y personal. La respuesta llega a su correo.</p>
        </div>
        <div role="tablist" aria-label="Estado de las consultas" className="flex rounded-lg bg-[#F1F5FB] p-1">
          {FILTROS.map(([valor, texto]) => (
            <button key={texto} type="button" role="tab" aria-selected={filtro === valor} onClick={() => { setFiltro(valor); setPagina(0) }}
              className={`min-h-9 rounded-md px-3 text-xs font-semibold ${filtro === valor ? 'bg-white text-[#011140] shadow-sm' : 'text-[#627A9B]'}`}>{texto}</button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!datos && !error && <p role="status" className="py-8 text-center text-sm text-[#627A9B]">Cargando consultas…</p>}
      {datos && datos.contenido.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Inbox size={28} className="text-[#8BA0BF]" aria-hidden="true" />
          <p className="text-sm text-[#627A9B]">{filtro === 'PENDIENTE' ? 'No hay consultas pendientes.' : 'No hay consultas.'}</p>
        </div>
      )}
      {datos && datos.contenido.length > 0 && (
        <ul className="mt-4 grid gap-3 xl:grid-cols-2">
          {datos.contenido.map((s) => <Consulta key={s.id} s={s} onAtendida={() => { setRecarga((n) => n + 1); onCambio?.() }} />)}
        </ul>
      )}
      {datos && datos.totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-[#EDF1F7] pt-3 text-xs text-[#627A9B]">
          <span>Página {datos.pagina + 1} de {datos.totalPaginas} · {datos.totalRegistros} consultas</span>
          <div className="flex gap-2">
            <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="min-h-9 rounded-lg border border-[#C9D8F2] px-3 font-semibold text-[#0439D9] disabled:opacity-40">Anterior</button>
            <button type="button" disabled={pagina + 1 >= datos.totalPaginas} onClick={() => setPagina((p) => p + 1)} className="min-h-9 rounded-lg border border-[#C9D8F2] px-3 font-semibold text-[#0439D9] disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </section>
  )
}
