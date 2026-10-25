import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CameraOff, Eye } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ExpulsarEstudianteModal from './ExpulsarEstudianteModal'
import RegistroExpulsion from './RegistroExpulsion'
import { getUserInitials } from '../users/userAvatar.utils'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import type { EstudianteAsignado } from '../../services/controlExamenService'

interface FilaProps {
  estudiante: EstudianteAsignado
  habilitado: boolean
}

/** Foto del estudiante (al tocarla se ve en grande); sin foto, sus iniciales. */
function FotoDeLista({ estudiante, habilitado, tamano }: FilaProps & { tamano: string }) {
  return (
    <FotoEstudiante
      fotoUrl={estudiante.fotoUrl}
      nombre={`${estudiante.nombre} ${estudiante.apellidos}`}
      iniciales={getUserInitials(estudiante)}
      className={`flex ${tamano} shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        habilitado ? 'bg-[#E9F1FF] text-[#0439D9]' : 'bg-[#FDECEC] text-[#B91C1C]'
      }`}
      ampliable
      detalle={`Código: ${estudiante.codigoSis}`}
    />
  )
}

/** Sin foto el control no podrá autorizar su ingreso: se avisa antes de que llegue a la puerta. */
function SinFoto({ estudiante }: { estudiante: EstudianteAsignado }) {
  if (estudiante.fotoUrl !== null || estudiante.ingresado) return null
  return (
    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C]">
      <CameraOff size={12} aria-hidden="true" /> Sin foto: no podrá ingresar
    </p>
  )
}

function Identidad({ estudiante, habilitado, children }: FilaProps & { children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <FotoDeLista estudiante={estudiante} habilitado={habilitado} tamano="h-9 w-9" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#011140]">
          {estudiante.nombre} {estudiante.apellidos}
        </p>
        <p className="text-[11px] text-[#627A9B]">COD: {estudiante.codigoSis}</p>
        <SinFoto estudiante={estudiante} />
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

function Acciones({ idExamen, estudiante, onExpulsar }: { idExamen: number; estudiante: EstudianteAsignado; onExpulsar?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      {onExpulsar && (
        <button type="button" onClick={onExpulsar} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#FDECEC] px-3 text-xs font-semibold text-[#B91C1C] hover:bg-red-100 md:min-h-8">
          <Ban size={14} aria-hidden="true" /> Expulsar
        </button>
      )}
      <Ver idExamen={idExamen} estudiante={estudiante} />
    </span>
  )
}

const colorCi = (habilitado: boolean) => (habilitado ? 'text-[#0439D9]' : 'text-[#B91C1C]')

function EstadoIngresoBadge({ ingresado, expulsado }: { ingresado: boolean; expulsado?: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
        ingresado && !expulsado
          ? 'bg-[#DCFCE7] text-[#166534]'
          : 'bg-[#FDECEC] text-[#B91C1C]'
      }`}
    >
      {expulsado ? 'EXPULSADO' : ingresado ? 'INGRESÓ' : 'NO INGRESÓ'}
    </span>
  )
}

/** Tabla en escritorio y tarjetas en celular; los no habilitados se marcan en rojo. */
export default function EstudiantesExamenLista({ idExamen, estudiantes, examen }: { idExamen: number; estudiantes: EstudianteAsignado[]; examen?: string }) {
  const { isAdmin } = useAuth()
  const [seleccionado, setSeleccionado] = useState<EstudianteAsignado | null>(null)
  const accionExpulsar = (estudiante: EstudianteAsignado) =>
    isAdmin && estudiante.ingresado === true && estudiante.expulsado !== true ? () => setSeleccionado(estudiante) : undefined
  return (
    <>
      <table className="hidden w-full text-left md:table">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Estudiante</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carnet / CI</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carrera</th>
            <th scope="col" className="px-4 py-3 font-semibold">Estado de ingreso</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.map((estudiante) => {
            const habilitado = estudiante.estado === 'HABILITADO'
            return (
              <tr key={estudiante.idEstudiante} className={`border-t border-[#EDF1F7] ${habilitado ? '' : 'bg-[#FEF2F2]'}`}>
                <td className="px-4 py-3"><Identidad estudiante={estudiante} habilitado={habilitado}>
                  {estudiante.expulsion && <RegistroExpulsion registro={estudiante.expulsion} />}
                </Identidad></td>
                <td className={`px-4 py-3 text-sm font-semibold ${colorCi(habilitado)}`}>{estudiante.ci}</td>
                <td className="px-4 py-3 text-sm text-[#011140]">{estudiante.carrera ?? '—'}</td>
                <td className="px-4 py-3"><EstadoIngresoBadge ingresado={estudiante.ingresado} expulsado={estudiante.expulsado} /></td>
                <td className="px-4 py-3 text-right"><Acciones idExamen={idExamen} estudiante={estudiante} onExpulsar={accionExpulsar(estudiante)} /></td>
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
                <FotoDeLista estudiante={estudiante} habilitado={habilitado} tamano="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="min-w-0 text-xs font-semibold leading-tight text-[#011140]">
                      {estudiante.nombre} {estudiante.apellidos}
                    </p>
                    <EstadoIngresoBadge ingresado={estudiante.ingresado} expulsado={estudiante.expulsado} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#627A9B]">Cód. {estudiante.codigoSis}</p>
                  <SinFoto estudiante={estudiante} />
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-[#EDF1F7] pt-2">
                    <div className="min-w-0 text-[10px]">
                      <p className={`font-semibold ${colorCi(habilitado)}`}>CI: {estudiante.ci}</p>
                      {estudiante.carrera && <p className="mt-0.5 truncate text-[#627A9B]">{estudiante.carrera}</p>}
                    </div>
                    <Acciones idExamen={idExamen} estudiante={estudiante} onExpulsar={accionExpulsar(estudiante)} />
                  </div>
                  {estudiante.expulsion && <RegistroExpulsion registro={estudiante.expulsion} />}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {isAdmin && seleccionado && <ExpulsarEstudianteModal idExamen={idExamen} examen={examen} estudiante={seleccionado} onClose={() => setSeleccionado(null)} />}
    </>
  )
}
