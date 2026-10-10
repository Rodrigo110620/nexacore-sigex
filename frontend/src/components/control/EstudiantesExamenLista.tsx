import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Eye, X } from 'lucide-react'
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
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#D8E3F5] bg-white text-[#627A9B] shadow-sm hover:bg-[#F1F6FF] hover:text-[#0439D9] md:h-8 md:w-8 md:border-0 md:bg-transparent md:shadow-none"
    >
      <Eye size={14} className="md:h-4 md:w-4" aria-hidden="true" />
    </Link>
  )
}

const colorCi = (habilitado: boolean) => (habilitado ? 'text-[#0439D9]' : 'text-[#B91C1C]')

function EstadoIngresoBadge({ ingresado }: { ingresado: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        ingresado
          ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
          : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
      }`}
    >
      {ingresado ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : <X size={11} strokeWidth={3} aria-hidden="true" />}
      {ingresado ? 'Ingresó' : 'No ingresó'}
    </span>
  )
}

/** Tabla en escritorio y tarjetas en celular; los no habilitados se marcan en rojo. */
export default function EstudiantesExamenLista({ idExamen, estudiantes }: { idExamen: number; estudiantes: EstudianteAsignado[] }) {
  return (
    <>
      <table className="hidden w-full text-left md:table md:max-w-[80%]">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Estudiante</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carnet / CI</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carrera</th>
            <th scope="col" className="px-4 py-3 font-semibold">Estado habilitación</th>
            <th scope="col" className="px-4 py-3 font-semibold">Estado de ingreso</th>
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
                <td className="px-4 py-3"><EstadoIngresoBadge ingresado={estudiante.ingresado} /></td>
                <td className="px-4 py-3 text-right"><Ver idExamen={idExamen} estudiante={estudiante} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {estudiantes.map((estudiante) => {
          const habilitado = estudiante.estado === 'HABILITADO'
          return (
            <li
              key={estudiante.idEstudiante}
              className={`rounded-xl border p-3 shadow-sm ${
                habilitado ? 'border-[#D8E3F5] bg-white' : 'border-[#FECACA] bg-[#FFF7F7]'
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${habilitado ? 'bg-[#E9F1FF] text-[#0439D9]' : 'bg-[#FDECEC] text-[#B91C1C]'}`}
                >
                  {getUserInitials(estudiante)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="min-w-0 text-xs font-semibold leading-tight text-[#011140]">
                      {estudiante.nombre} {estudiante.apellidos}
                    </p>
                    <EstadoHabilitacionBadge habilitado={habilitado} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#627A9B]">Cód. {estudiante.codigoSis}</p>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-[#EDF1F7] pt-2">
                    <div className="min-w-0 text-[10px]">
                      <p className={`font-semibold ${colorCi(habilitado)}`}>CI: {estudiante.ci}</p>
                      {estudiante.carrera && <p className="mt-0.5 truncate text-[#627A9B]">{estudiante.carrera}</p>}
                    </div>
                    <Ver idExamen={idExamen} estudiante={estudiante} />
                  </div>
                  <div className="mt-2"><EstadoIngresoBadge ingresado={estudiante.ingresado} /></div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
