import { useEffect, useState } from 'react'
import { Flag } from 'lucide-react'
import { obtenerReporteFoto, textoMotivoReporte, type ReporteFotoAbierto } from '../../services/fotoRevisionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

const fechaHora = (iso: string) => fechaHoraNumerica(iso)

/**
 * Aviso para el personal de control y el docente: la foto del estudiante fue reportada y espera la
 * revisión del ADMIN. Solo avisa; no bloquea el ingreso (la decisión sobre la foto es del ADMIN).
 */
export default function AvisoFotoReportada({ reporte }: { reporte: ReporteFotoAbierto }) {
  return (
    <div role="status" className="mt-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-2 text-[11px] text-[#92400E]">
      <p className="flex items-center gap-1 font-bold">
        <Flag size={12} aria-hidden="true" />
        Foto reportada · pendiente de revisión del admin
      </p>
      <p className="mt-0.5">{textoMotivoReporte(reporte.motivo)}{reporte.detalle ? `: ${reporte.detalle}` : ''}</p>
      <p className="mt-0.5 text-[#B45309]">
        Reportada{reporte.reportadoPor ? ` por ${reporte.reportadoPor}` : ''} el {fechaHora(reporte.reportadoEn)}.
        Verifica la identidad con el carnet.
      </p>
    </div>
  )
}

/** Consulta el reporte abierto del estudiante y muestra el aviso si hay uno (p. ej. en su ficha). */
export function AvisoFotoReportadaDe({ idEstudiante }: { idEstudiante: number }) {
  const [reporte, setReporte] = useState<ReporteFotoAbierto | null>(null)
  useEffect(() => {
    let vigente = true
    // Con error o sin conexión no se muestra nada: el aviso es informativo.
    obtenerReporteFoto(idEstudiante)
      .then((r) => { if (vigente) setReporte(r) })
      .catch(() => { if (vigente) setReporte(null) })
    return () => { vigente = false }
  }, [idEstudiante])
  return reporte ? <AvisoFotoReportada reporte={reporte} /> : null
}
