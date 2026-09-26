import { GraduationCap, IdCard } from 'lucide-react'
import { getUserInitials } from '../users/userAvatar.utils'
import type { EstudianteIdentificado } from '../../services/identificacionService'

interface ResultadoEstudianteCardProps {
  estudiante: EstudianteIdentificado
}

/** Estudiante encontrado en el examen. DESHABILITADO se muestra como "NO HABILITADO". */
export default function ResultadoEstudianteCard({ estudiante }: ResultadoEstudianteCardProps) {
  const habilitado = estudiante.estado === 'HABILITADO'

  return (
    <article className="flex items-center justify-between gap-4 rounded-xl border border-[#B8CBEF] bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0439D9] text-sm font-bold text-white"
        >
          {getUserInitials(estudiante)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-[#011140]">
              {estudiante.nombre} {estudiante.apellidos}
            </p>
            {/* Mismos colores que StatusBadge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                habilitado ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FDECEC] text-[#B91C1C]'
              }`}
            >
              {habilitado ? 'HABILITADO' : 'NO HABILITADO'}
            </span>
          </div>
          <p className="text-xs text-[#627A9B]">
            Código: <span className="font-semibold text-[#0439D9]">{estudiante.codigoSis}</span>
          </p>
        </div>
      </div>
      <dl className="flex shrink-0 flex-col gap-1 text-xs text-[#627A9B]">
        <div className="flex items-center gap-1.5">
          <IdCard size={14} aria-hidden="true" />
          <dt>CI:</dt>
          <dd className="font-semibold text-[#011140]">{estudiante.ci}</dd>
        </div>
        {estudiante.carrera && (
          <div className="flex items-center gap-1.5">
            <GraduationCap size={14} aria-hidden="true" />
            <dt>Carrera:</dt>
            <dd className="font-semibold text-[#011140]">{estudiante.carrera}</dd>
          </div>
        )}
      </dl>
    </article>
  )
}
