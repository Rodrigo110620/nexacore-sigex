import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { ArrowRight, Check, LoaderCircle, X } from 'lucide-react'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import {
  aprobarFoto, descartarReporteFoto, obtenerRevisionReporte, rechazarFoto, textoMotivoReporte, type RevisionReporteFoto,
} from '../../services/fotoRevisionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

const iniciales = (texto: string) => texto.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
type Accion = 'descartar' | 'aprobar' | 'rechazar'
const HECHO: Record<Accion, string> = {
  descartar: 'Listo: la foto está bien y el reporte quedó cerrado.',
  aprobar: 'Listo: la foto nueva ya es la foto del estudiante.',
  rechazar: 'Listo: se rechazó la foto nueva; el estudiante debe enviar otra.',
}

/**
 * Revisar una foto reportada: el ADMIN siempre; el DOCENTE y el CONTROL si el reporte es de uno de sus exámenes
 * (los suyos o asignados). Se ve la foto actual y, si el estudiante ya la envió, la nueva para aprobarla o
 * rechazarla. Sin permiso para revisar, solo se ve el reporte.
 */
export default function FotoReportadaModal({ idEstudiante, nombre, detalle, idExamen, onClose, onResuelto }: {
  idEstudiante: number
  nombre: string
  detalle?: string | null
  idExamen?: number | null
  onClose: () => void
  onResuelto?: () => void
}) {
  const [revision, setRevision] = useState<RevisionReporteFoto | null | undefined>(undefined)
  const [error, setError] = useState(false)
  const [enCurso, setEnCurso] = useState<Accion | null>(null)
  const [hecho, setHecho] = useState<Accion | null>(null)
  const [fallo, setFallo] = useState('')
  const [rechazando, setRechazando] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  useEffect(() => {
    let vigente = true
    obtenerRevisionReporte(idEstudiante)
      .then((r) => { if (vigente) setRevision(r) })
      .catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [idEstudiante])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [onClose])

  const resolver = async (accion: Accion) => {
    setEnCurso(accion)
    setFallo('')
    try {
      if (accion === 'descartar') await descartarReporteFoto(idEstudiante)
      else if (accion === 'aprobar') await aprobarFoto(idEstudiante)
      else await rechazarFoto(idEstudiante, motivoRechazo.trim())
      setHecho(accion)
      onResuelto?.()
    } catch (err) {
      setFallo((axios.isAxiosError(err) && err.response?.data?.mensaje) || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setEnCurso(null)
    }
  }

  const examen = revision?.idExamen ?? idExamen
  const boton = 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold disabled:opacity-50'

  // En un portal: la campana vive en la barra superior y, dentro de ella, la ventana quedaba recortada.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="foto-reportada-titulo" onClick={onClose}>
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="foto-reportada-titulo" className="text-base font-bold text-[#011140]">Foto reportada</h2>
            <p className="truncate text-xs text-[#627A9B]">{nombre}{revision?.examen ? ` · ${revision.examen}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#45628D] hover:bg-[#F1F6FF]">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <figure className="m-0">
            <FotoEstudiante fotoUrl={`/estudiantes/${idEstudiante}/foto`} nombre={nombre} iniciales={iniciales(nombre)} ampliable
              className="aspect-[4/5] w-full rounded-xl bg-[#E9F1FF] text-2xl font-bold text-[#0439D9]" />
            <figcaption className="mt-1 text-center text-[11px] text-[#627A9B]">Foto actual (la reportada)</figcaption>
          </figure>
          <figure className="m-0">
            {revision?.fotoNuevaUrl ? (
              <FotoEstudiante fotoUrl={revision.fotoNuevaUrl} nombre={`${nombre} (foto nueva)`} iniciales={iniciales(nombre)} ampliable
                className="aspect-[4/5] w-full rounded-xl bg-[#ECFDF5] text-2xl font-bold text-[#059669]" />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl border border-dashed border-[#B8CBEF] p-3 text-center text-[11px] text-[#627A9B]">
                El estudiante aún no envió una foto nueva
              </div>
            )}
            <figcaption className="mt-1 text-center text-[11px] text-[#627A9B]">Foto nueva</figcaption>
          </figure>
        </div>

        <div className="mt-3 text-sm text-[#011140]">
          {error ? (
            <p className="text-[#B91C1C]">No se pudo cargar el reporte.</p>
          ) : revision === undefined ? (
            <p role="status" className="text-[#627A9B]">Cargando el reporte…</p>
          ) : revision === null && !hecho ? (
            <p className="text-[#15803D]">Este reporte ya fue revisado.</p>
          ) : revision && (
            <dl className="grid gap-1.5 sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase text-[#627A9B]">Motivo</dt><dd>{textoMotivoReporte(revision.motivo)}{revision.detalle ? `: ${revision.detalle}` : ''}</dd></div>
              {revision.reportadoPor && <div><dt className="text-[11px] font-semibold uppercase text-[#627A9B]">Reportada por</dt><dd>{revision.reportadoPor}</dd></div>}
              <div><dt className="text-[11px] font-semibold uppercase text-[#627A9B]">Fecha y hora</dt><dd>{fechaHoraNumerica(revision.reportadoEn)}</dd></div>
            </dl>
          )}
          {!revision && detalle && !error && revision !== undefined && <p className="mt-2 text-xs text-[#45628D]">{detalle}</p>}
        </div>

        {hecho ? (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-[#F0FDF4] p-3 text-sm font-medium text-[#15803D]"><Check size={16} aria-hidden="true" />{HECHO[hecho]}</p>
        ) : revision?.puedeRevisar ? (
          <div className="mt-4">
            {rechazando ? (
              <div className="space-y-2">
                <label htmlFor="motivo-rechazo" className="text-xs font-semibold text-[#011140]">¿Por qué rechazas la foto nueva? El estudiante lo verá.</label>
                <textarea id="motivo-rechazo" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} rows={2} maxLength={200}
                  className="w-full rounded-lg border border-[#D8E3F5] p-2 text-sm outline-none focus:ring-2 focus:ring-[#0439D9]" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRechazando(false)} className={`${boton} border border-[#D8E3F5] text-[#011140]`}>Volver</button>
                  <button type="button" disabled={!motivoRechazo.trim() || enCurso !== null} onClick={() => void resolver('rechazar')} className={`${boton} bg-[#DC2626] text-white`}>
                    {enCurso === 'rechazar' && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />} Rechazar foto nueva
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                {revision.fotoNuevaUrl ? (
                  <>
                    <button type="button" disabled={enCurso !== null} onClick={() => setRechazando(true)} className={`${boton} border border-[#FECACA] text-[#B91C1C]`}>Rechazar</button>
                    <button type="button" disabled={enCurso !== null} onClick={() => void resolver('aprobar')} className={`${boton} bg-[#16A34A] text-white`}>
                      {enCurso === 'aprobar' && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />} Aprobar foto nueva
                    </button>
                  </>
                ) : null}
                <button type="button" disabled={enCurso !== null} onClick={() => void resolver('descartar')} className={`${boton} border border-[#D8E3F5] text-[#011140]`}>
                  {enCurso === 'descartar' && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />} La foto actual está bien
                </button>
              </div>
            )}
            {fallo && <p role="alert" className="mt-2 text-xs font-medium text-[#B91C1C]">{fallo}</p>}
          </div>
        ) : revision ? (
          <p className="mt-3 text-[11px] text-[#627A9B]">Lo revisa el ADMIN o el personal del examen. Mientras tanto, el estudiante puede ingresar: compara su cara con la foto en la puerta.</p>
        ) : null}

        {examen != null && (
          <Link to={`/dashboard/control/${examen}`} onClick={onClose}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#D8E3F5] px-4 text-sm font-bold text-[#0439D9] hover:bg-[#F1F6FF]">
            Ir al control del examen <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>,
    document.body,
  )
}
