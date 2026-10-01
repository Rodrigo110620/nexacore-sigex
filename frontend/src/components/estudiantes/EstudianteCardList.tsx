import { Eye } from 'lucide-react'
import type { EstudianteListItem } from '../../types/estudiante'
import { getAvatarColorById, getInitials } from './avatarColors'

interface EstudianteCardListProps {
  estudiantes: EstudianteListItem[]
  onViewClick?: (estudiante: EstudianteListItem) => void
}

function formatCarreras(carreras: EstudianteListItem['carreras']): string {
  if (!carreras || carreras.length === 0) return 'Sin carrera'
  return carreras.map((c) => c.nombreCarrera).join(', ')
}

function formatFacultad(carreras: EstudianteListItem['carreras']): string {
  if (!carreras || carreras.length === 0) return ''
  return carreras.map((c) => c.nombreFacultad).join(', ')
}

export default function EstudianteCardList({ estudiantes, onViewClick }: EstudianteCardListProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:gap-4">
      {estudiantes.map((e) => (
        <li
          key={e.id}
          className="rounded-xl border border-[#D8E3F5] bg-white p-3 shadow-sm"
        >
          {/* Fila 1: Avatar + Nombre + Código/CI */}
          <div className="flex items-start gap-3">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColorById(e.id)}`}>
              {getInitials(e.nombre, e.apellidos)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#011140]">
                {e.nombre} {e.apellidos}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[#627A9B]">
                Cód: {e.codigoSis} · DNI: {e.ci}
              </p>
            </div>
          </div>

          {/* Fila 2: Carrera/Facultad + Botón */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#EDF1F7] pt-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#011140]">
                {formatCarreras(e.carreras)}
              </p>
              {e.carreras?.[0]?.nombreFacultad && (
                <p className="truncate text-[11px] text-[#627A9B]">
                  {formatFacultad(e.carreras)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onViewClick?.(e)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#E1ECFF] px-3 py-1.5 text-xs font-semibold text-[#0439D9] hover:bg-[#D0E2FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
            >
              <Eye size={14} aria-hidden="true" />
              Ver Ficha
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}