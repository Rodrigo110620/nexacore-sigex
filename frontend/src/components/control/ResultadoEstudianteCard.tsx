import { GraduationCap, IdCard } from 'lucide-react'
import { getUserInitials } from '../users/userAvatar.utils'
import EstadoHabilitacionBadge from './EstadoHabilitacionBadge'
import type { EstudianteIdentificado } from '../../services/identificacionService'

interface ResultadoEstudianteCardProps {
  estudiante: EstudianteIdentificado
}

/** Estudiante encontrado en el examen. DESHABILITADO se muestra como "NO HABILITADO". */
export default function ResultadoEstudianteCard({ estudiante }: ResultadoEstudianteCardProps) {
  return (
    <article className="flex flex-col gap-2.5 rounded-lg border border-[#2C64F4] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0439D9] text-sm font-bold text-white sm:h-12 sm:w-12 sm:text-base"
        >
          {getUserInitials(estudiante)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-bold text-[#011140] sm:text-base">
              {estudiante.nombre} {estudiante.apellidos}
            </p>
            <EstadoHabilitacionBadge habilitado={estudiante.estado === 'HABILITADO'} />
          </div>
          <p className="text-[11px] text-[#627A9B] sm:text-xs">
            Código: <span className="font-semibold text-[#0439D9]">{estudiante.codigoSis}</span>
          </p>
        </div>
      </div>
      <dl className="flex flex-col gap-1 pl-[3.25rem] text-[10px] text-[#627A9B] sm:shrink-0 sm:pl-0 sm:text-xs">
        <div className="flex items-center gap-1.5">
          <IdCard size={13} aria-hidden="true" />
          <dt>CI:</dt>
          <dd className="font-semibold text-[#011140]">{estudiante.ci}</dd>
        </div>
        {estudiante.carrera && (
          <div className="flex items-center gap-1.5">
            <GraduationCap size={13} aria-hidden="true" />
            <dt>Carrera:</dt>
            <dd className="font-semibold text-[#011140]">{estudiante.carrera}</dd>
          </div>
        )}
      </dl>
    </article>
  )
}
