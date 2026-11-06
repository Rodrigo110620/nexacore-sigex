import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import { obtenerReporteFoto, textoMotivoReporte, type ReporteFotoAbierto } from '../../services/fotoRevisionService'
import type { Notificacion } from '../../services/notificacionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

const iniciales = (texto: string) => texto.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

/**
 * El aviso de foto reportada para el DOCENTE y el CONTROL: ven la foto del estudiante y el reporte, sin la
 * revisión (aprobar o rechazar es del ADMIN). Si el ADMIN ya lo resolvió, lo dice.
 */
export default function FotoReportadaModal({ notificacion, onClose }: { notificacion: Notificacion; onClose: () => void }) {
  const idEstudiante = notificacion.idEstudiante as number
  const [reporte, setReporte] = useState<ReporteFotoAbierto | null | undefined>(undefined)
  const [error, setError] = useState(false)
  const nombre = notificacion.titulo.replace(/^Foto reportada:\s*/, '')

  useEffect(() => {
    let vigente = true
    obtenerReporteFoto(idEstudiante)
      .then((r) => { if (vigente) setReporte(r) })
      .catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [idEstudiante])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [onClose])

  // En un portal: la campana vive en la barra superior y, dentro de ella, la ventana quedaba recortada.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="foto-reportada-titulo" onClick={onClose}>
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="foto-reportada-titulo" className="text-base font-bold text-[#011140]">Foto reportada</h2>
            <p className="truncate text-xs text-[#627A9B]">{nombre}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#45628D] hover:bg-[#F1F6FF]">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex gap-4">
          <FotoEstudiante fotoUrl={`/estudiantes/${idEstudiante}/foto`} nombre={nombre} iniciales={iniciales(nombre)} ampliable
            className="h-28 w-24 shrink-0 rounded-xl bg-[#E9F1FF] text-xl font-bold text-[#0439D9]" />
          <div className="min-w-0 text-sm text-[#011140]">
            {error ? (
              <p className="text-[#B91C1C]">No se pudo cargar el reporte.</p>
            ) : reporte === undefined ? (
              <p role="status" className="text-[#627A9B]">Cargando el reporte…</p>
            ) : reporte === null ? (
              <p className="text-[#15803D]">El ADMIN ya revisó este reporte.</p>
            ) : (
              <dl className="space-y-1.5">
                <div><dt className="text-[11px] font-semibold uppercase text-[#627A9B]">Motivo</dt><dd>{textoMotivoReporte(reporte.motivo)}{reporte.detalle ? `: ${reporte.detalle}` : ''}</dd></div>
                {reporte.reportadoPor && <div><dt className="text-[11px] font-semibold uppercase text-[#627A9B]">Reportada por</dt><dd>{reporte.reportadoPor}</dd></div>}
                <div><dt className="text-[11px] font-semibold uppercase text-[#627A9B]">Fecha y hora</dt><dd>{fechaHoraNumerica(reporte.reportadoEn)}</dd></div>
              </dl>
            )}
          </div>
        </div>
        {notificacion.detalle && <p className="mt-3 rounded-lg bg-[#F8FAFF] p-2.5 text-xs text-[#45628D]">{notificacion.detalle}</p>}
        <p className="mt-3 text-[11px] text-[#627A9B]">La foto la revisa el ADMIN. Mientras tanto, el estudiante puede ingresar: compara su cara con la foto en la puerta.</p>

        {notificacion.idExamen != null && (
          <Link to={`/dashboard/control/${notificacion.idExamen}`} onClick={onClose}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-bold text-white hover:bg-[#0C41E1]">
            Ir al control del examen <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>,
    document.body,
  )
}
