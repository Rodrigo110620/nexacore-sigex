import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, X } from 'lucide-react'
import { DetalleRevisionFoto, RechazarFotoModal } from '../fotos/RevisionFoto'
import ResultadoModal, { type Resultado } from '../ui/ResultadoModal'
import {
  aprobarFoto, descartarReporteFoto, mensajeDeError, obtenerRevisionReporte, rechazarFoto, type RevisionReporteFoto,
} from '../../services/fotoRevisionService'
import { nombreDe } from '../../utils/revisionFoto'

/**
 * Revisar una foto reportada con la misma vista que el ADMIN (Revisión de fotos): el ADMIN siempre; el DOCENTE y el
 * CONTROL si el reporte es de uno de sus exámenes (los suyos o asignados). Sin permiso, la ve sin las acciones.
 */
export default function FotoReportadaModal({ idEstudiante, nombre, idExamen, onClose, onResuelto }: {
  idEstudiante: number
  nombre: string
  detalle?: string | null
  idExamen?: number | null
  onClose: () => void
  onResuelto?: () => void
}) {
  const [revision, setRevision] = useState<RevisionReporteFoto | null | undefined>(undefined)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [exito, setExito] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let vigente = true
    obtenerRevisionReporte(idEstudiante)
      .then((r) => { if (vigente) setRevision(r) })
      .catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [idEstudiante])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape' && !rechazando) onClose() }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [onClose, rechazando])

  const ejecutar = async (accion: () => Promise<void>, mensajeExito: string, fallback: string) => {
    setSaving(true)
    try {
      await accion()
      setRechazando(false)
      setExito(mensajeExito)
      onResuelto?.()
    } catch (err) {
      setResultado({ tipo: 'error', mensaje: mensajeDeError(err, fallback) })
    } finally {
      setSaving(false)
    }
  }

  const solicitud = revision?.solicitud
  const examen = revision?.idExamen ?? idExamen

  // En un portal: la campana vive en la barra superior y, dentro de ella, la ventana quedaba recortada.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="foto-reportada-titulo" onClick={onClose}>
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-[#F8FBFF] p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="foto-reportada-titulo" className="text-base font-bold text-[#011140]">Foto reportada</h2>
            <p className="truncate text-xs text-[#627A9B]">{revision?.examen ? `${revision.examen} · ` : ''}{solicitud ? nombreDe(solicitud) : nombre}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#45628D] hover:bg-[#E9F1FF]">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {exito ? (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm font-medium text-[#15803D]">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />{exito}
          </p>
        ) : error ? (
          <p className="rounded-xl bg-white p-4 text-sm text-[#B91C1C]">No se pudo cargar el reporte.</p>
        ) : revision === undefined ? (
          <p role="status" className="rounded-xl bg-white p-4 text-sm text-[#627A9B]">Cargando el reporte…</p>
        ) : !solicitud ? (
          <p className="rounded-xl bg-white p-4 text-sm text-[#15803D]">Este reporte ya fue revisado.</p>
        ) : (
          <>
            <DetalleRevisionFoto
              solicitud={solicitud}
              saving={saving}
              soloLectura={!revision?.puedeRevisar}
              onRechazar={() => setRechazando(true)}
              onAprobar={() => void ejecutar(() => aprobarFoto(idEstudiante),
                `Se aprobó la foto de ${nombreDe(solicitud)}. Ya es la foto que ve el personal de control.`, 'No se pudo aprobar la foto.')}
              onDescartar={() => void ejecutar(() => descartarReporteFoto(idEstudiante),
                `Se descartó el reporte de ${nombreDe(solicitud)}. Su foto actual sigue vigente.`, 'No se pudo descartar el reporte.')}
            />
            {!revision?.puedeRevisar && (
              <p className="mt-2 text-[11px] text-[#627A9B]">La revisa el ADMIN o el personal de este examen. Mientras tanto, el estudiante puede ingresar: compara su cara con la foto en la puerta.</p>
            )}
          </>
        )}

        {examen != null && (
          <Link to={`/dashboard/control/${examen}`} onClick={onClose}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#D8E3F5] bg-white px-4 text-sm font-bold text-[#0439D9] hover:bg-[#F1F6FF]">
            Ir al control del examen <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      {rechazando && solicitud && (
        <div onClick={(e) => e.stopPropagation()}>
          <RechazarFotoModal solicitud={solicitud} saving={saving} onCancel={() => setRechazando(false)}
            onConfirm={(motivo) => void ejecutar(() => rechazarFoto(idEstudiante, motivo),
              `Se rechazó la foto de ${nombreDe(solicitud)}. Verá el motivo en su perfil y podrá enviar otra.`, 'No se pudo rechazar la foto.')} />
        </div>
      )}
      <ResultadoModal resultado={resultado} onClose={() => setResultado(null)} />
    </div>,
    document.body,
  )
}
