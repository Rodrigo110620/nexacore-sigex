import { CircleCheckBig, OctagonX, ShieldBan } from 'lucide-react'
import type { MiExamen } from '../../services/panelEstudianteService'
import { horaDe } from '../../utils/misExamenes'

/**
 * Lo que pasó con el estudiante en el control de ingreso: ingresó (con su hora y aula), se le
 * denegó el ingreso (con el motivo) o lo expulsaron (INCI-01, sin detalles internos). Se actualiza
 * en vivo; si todavía no pasó por el control no muestra nada (para eso está AvisoIngresoExamen).
 */
export default function EstadoIngresoExamen({ examen, className = '' }: { examen: MiExamen; className?: string }) {
  if (examen.expulsado) {
    return (
      <div role="alert" className={`flex gap-3 rounded-xl border border-[#FBCFD4] bg-[#FFF5F5] p-4 text-sm text-[#7F1D1D] ${className}`}>
        <ShieldBan size={24} className="shrink-0 text-[#B91C1C]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#B91C1C]">
            Tu participación en este examen fue anulada{examen.fechaHoraExpulsion ? ` a las ${horaDe(examen.fechaHoraExpulsion)}` : ''}
          </p>
          <p className="mt-0.5">Comunícate con la administración de la facultad para conocer el motivo y los pasos a seguir.</p>
        </div>
      </div>
    )
  }

  if (examen.fechaHoraIngreso) {
    return (
      <div role="status" className={`flex gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm text-[#14532D] ${className}`}>
        <CircleCheckBig size={24} className="shrink-0 text-[#15803D]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#15803D]">Tu ingreso quedó registrado a las {horaDe(examen.fechaHoraIngreso)}</p>
          <p className="mt-0.5">{examen.aula ? `Rinde tu examen en el aula ${examen.aula}.` : 'Rinde tu examen en el aula que te indicó el personal de control.'}</p>
        </div>
      </div>
    )
  }

  if (examen.resultadoIngreso === 'DENEGADO') {
    return (
      <div role="alert" className={`flex gap-3 rounded-xl border border-[#FBCFD4] bg-[#FFF5F5] p-4 text-sm text-[#7F1D1D] ${className}`}>
        <OctagonX size={24} className="shrink-0 text-[#B91C1C]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#B91C1C]">No se autorizó tu ingreso</p>
          {examen.motivoDenegacion && <p className="mt-0.5">Motivo: {examen.motivoDenegacion}</p>}
          <p className="mt-0.5">Si crees que es un error, acércate al personal de control o a la administración.</p>
        </div>
      </div>
    )
  }

  return null
}
