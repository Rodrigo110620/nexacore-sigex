import { DoorOpen, QrCode, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import useTiempoExamen from '../../hooks/useTiempoExamen'
import type { MiExamen } from '../../services/panelEstudianteService'

/** Desde cuántos minutos antes del inicio se avisa que el examen empieza pronto. */
export const MINUTOS_AVISO_PREVIO = 30

/**
 * Aviso al estudiante sobre su ingreso: que el examen empieza pronto, o que ya empezó y todavía no
 * registró su ingreso. Desaparece solo cuando el control registra su ingreso (actualización en vivo).
 * No se muestra si no está habilitado: para eso ya está el aviso de habilitación.
 */
export default function AvisoIngresoExamen({ examen, conBotonQr = true, className = '' }: {
  examen: MiExamen
  /** false dentro de la tarjeta del examen, que ya tiene su botón "Mostrar mi QR". */
  conBotonQr?: boolean
  className?: string
}) {
  const tiempo = useTiempoExamen(examen)
  // Se oculta con su hora de ingreso (o si el control le denegó el ingreso), no con un resultado viejo.
  if (!tiempo || examen.fechaHoraIngreso || examen.resultadoIngreso === 'DENEGADO' || examen.habilitado === false) return null

  const minutos = Math.ceil(tiempo.restanteMs / 60_000)
  const lugar = examen.aula ? `en el aula ${examen.aula}` : 'en el aula que te indique el personal de control'
  const pendiente = examen.habilitado === null
    ? ' Tu habilitación todavía está pendiente: el personal de control la verificará.'
    : ''

  const botonQr = (
    <Link to="/estudiante/qr" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0439D9] ring-1 ring-[#BFD2F8] hover:bg-white">
      <QrCode size={14} aria-hidden="true" /> Mostrar mi QR
    </Link>
  )

  if (tiempo.fase === 'programado' && minutos <= MINUTOS_AVISO_PREVIO) {
    return (
      <div role="status" className={`flex gap-3 rounded-xl border border-[#BFD2F8] bg-[#EAF2FF] p-4 text-sm text-[#011140] ${className}`}>
        <DoorOpen size={24} className="shrink-0 text-[#0439D9]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#0439D9]">
            Tu examen de {examen.materia} empieza {minutos <= 1 ? 'en menos de un minuto' : `en ${minutos} min`}
          </p>
          <p className="mt-0.5">Preséntate {lugar} con tu QR y tu carnet.{pendiente}</p>
          {conBotonQr && botonQr}
        </div>
      </div>
    )
  }

  if (tiempo.fase === 'en_curso') {
    return (
      <div role="status" className={`flex gap-3 rounded-xl border border-[#FDBA74] bg-[#FFF4E8] p-4 text-sm text-[#7C2D12] ${className}`}>
        <TriangleAlert size={24} className="shrink-0 text-[#C2410C]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#C2410C]">Tu examen de {examen.materia} ya empezó y aún no registraste tu ingreso</p>
          <p className="mt-0.5">Preséntate cuanto antes {lugar} con tu QR y tu carnet.{pendiente}</p>
          {conBotonQr && botonQr}
        </div>
      </div>
    )
  }

  return null
}
