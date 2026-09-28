import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { getUserInitials } from '../users/userAvatar.utils'
import EstadoHabilitacionBadge from './EstadoHabilitacionBadge'
import type { EstudianteAsignado } from '../../services/controlExamenService'

interface FilaProps {
  estudiante: EstudianteAsignado
  habilitado: boolean
}

function Identidad({ estudiante, habilitado, children }: FilaProps & { children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          habilitado ? 'bg-[#E9F1FF] text-[#0439D9]' : 'bg-[#FDECEC] text-[#B91C1C]'
        }`}
      >
        {getUserInitials(estudiante)}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#011140]">
          {estudiante.nombre} {estudiante.apellidos}
        </p>
        <p className="text-[11px] text-[#627A9B]">COD: {estudiante.codigoSis}</p>
        {children}
      </div>
    </div>
  )
}

/** El ojo abre la identificación con el código ya buscado. */
function Ver({ idExamen, estudiante }: { idExamen: number; estudiante: EstudianteAsignado }) {
  return (
    <Link
      to={`/dashboard/control/${idExamen}/identificar?codigo=${encodeURIComponent(estudiante.codigoSis)}`}
      aria-label={`Identificar a ${estudiante.nombre} ${estudiante.apellidos}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#627A9B] hover:bg-[#F1F6FF] hover:text-[#0439D9]"
    >
      <Eye size={16} aria-hidden="true" />
    </Link>
  )
}

const colorCi = (habilitado: boolean) => (habilitado ? 'text-[#0439D9]' : 'text-[#B91C1C]')

/** Tabla en escritorio y tarjetas en celular; los no habilitados se marcan en rojo. */
export default function EstudiantesExamenLista({ idExamen, estudiantes }: { idExamen: number; estudiantes: EstudianteAsignado[] }) {
  return (
    <>
      <table className="hidden w-full text-left md:table">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Estudiante</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carnet / CI</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carrera</th>
            <th scope="col" className="px-4 py-3 font-semibold">Estado habilitación</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.map((estudiante) => {
            const habilitado = estudiante.estado === 'HABILITADO'
            return (
              <tr key={estudiante.idEstudiante} className={`border-t border-[#EDF1F7] ${habilitado ? '' : 'bg-[#FEF2F2]'}`}>
                <td className="px-4 py-3"><Identidad estudiante={estudiante} habilitado={habilitado} /></td>
                <td className={`px-4 py-3 text-sm font-semibold ${colorCi(habilitado)}`}>{estudiante.ci}</td>
                <td className="px-4 py-3 text-sm text-[#011140]">{estudiante.carrera ?? '—'}</td>
                <td className="px-4 py-3"><EstadoHabilitacionBadge habilitado={habilitado} /></td>
                <td className="px-4 py-3 text-right"><Ver idExamen={idExamen} estudiante={estudiante} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="flex flex-col gap-2 md:hidden">
        {estudiantes.map((estudiante) => {
          const habilitado = estudiante.estado === 'HABILITADO'
          return (
            <li
              key={estudiante.idEstudiante}
              className={`flex items-start justify-between gap-2 rounded-xl border p-3 ${
                habilitado ? 'border-[#D8E3F5] bg-white' : 'border-[#FECACA] bg-[#FEF2F2]'
              }`}
            >
              <Identidad estudiante={estudiante} habilitado={habilitado}>
                <p className="text-xs text-[#627A9B]">
                  CI: <span className={`font-semibold ${colorCi(habilitado)}`}>{estudiante.ci}</span>
                </p>
                {estudiante.carrera && <p className="text-[11px] text-[#627A9B]">{estudiante.carrera}</p>}
              </Identidad>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <EstadoHabilitacionBadge habilitado={habilitado} />
                <Ver idExamen={idExamen} estudiante={estudiante} />
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
