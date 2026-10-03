import { Link } from 'react-router-dom'
import { BookOpen, Building2, Clock, Play } from 'lucide-react'
import type { ExamenDto } from '../../services/examenService'
import { addMinutes, horaCorta, type FaseExamen } from '../../utils/examenFormat'

const ESTILO_ESTADO: Record<FaseExamen, string> = {
  'en-curso': 'border-[#FECACA] bg-[#FDECEC] text-[#B91C1C]',
  proximo: 'border-[#D8E3F5] bg-[#F8FBFF] text-[#627A9B]',
  finalizado: 'border-[#D8E3F5] bg-[#F1F6FF] text-[#627A9B]',
}
const ESTILO_SIGUIENTE = 'border-[#FDE68A] bg-[#FFF8E7] text-[#B45309]'

interface ExamenDelDiaFilaProps {
  examen: ExamenDto
  estado: { fase: FaseExamen; texto: string }
  /** El siguiente examen de hoy: su estado se resalta en amarillo. */
  siguiente?: boolean
}

/** Fila de "Todos los exámenes del día": asignatura, ambiente y horario, estado y acceso al control. */
export default function ExamenDelDiaFila({ examen, estado, siguiente = false }: ExamenDelDiaFilaProps) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F6FF] text-[#0439D9]">
          <BookOpen size={18} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
          <p className="font-bold text-[#011140]">{examen.asignatura}</p>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F1F6FF] px-2 py-0.5 text-[11px] text-[#627A9B]">
            <Building2 size={12} aria-hidden="true" />
            {examen.ambienteNombre} · {horaCorta(examen.horaInicio)} - {addMinutes(examen.horaInicio, examen.duracionMinutos)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            siguiente ? ESTILO_SIGUIENTE : ESTILO_ESTADO[estado.fase]
          }`}
        >
          <Clock size={12} aria-hidden="true" />
          {estado.texto}
        </span>
        <Link
          to={`/dashboard/control/${examen.idExamen}`}
          aria-label={`Iniciar control de ${examen.asignatura}`}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#0439D9] px-4 py-2 text-xs font-semibold text-white hover:bg-[#032db0]"
        >
          <Play size={14} aria-hidden="true" />
          Iniciar control
        </Link>
      </div>
    </li>
  )
}
