import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CameraOff, Eye, LogOut } from 'lucide-react'
import { registrarSalida } from '../../services/controlIngresoService'
import { useAuth } from '../../context/AuthContext'
import ExpulsarEstudianteModal from './ExpulsarEstudianteModal'
import RegistroExpulsion from './RegistroExpulsion'
import { getUserInitials } from '../users/userAvatar.utils'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import type { EstudianteAsignado } from '../../services/controlExamenService'
import type { ExamenDto } from '../../services/examenService'
import { listarAmbientes, type AmbienteDto } from '../../services/ambienteService'
import ReasignarAmbienteModal from './ReasignarAmbienteModal'
import { registraControl, tienePermiso } from '../../utils/permisos'


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
  // Identificar es parte de registrar el control; el ADMIN supervisa sin registrar.
  if (!registraControl(useAuth())) return null
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

/** INCI-03: "Trasladado de 691A a 692B" (o solo el origen si no se conoce el aula actual). */
function textoTraslado(estudiante: EstudianteAsignado) {
  return estudiante.trasladadoA
    ? `Trasladado de ${estudiante.trasladadoDesde} a ${estudiante.trasladadoA}`
    : `Trasladado desde ${estudiante.trasladadoDesde}`
}

/** Nombre del aula asignada al estudiante: prefiere trasladoA (traslado de la sesión) o busca en el catálogo. */
function nombreAulaEstudiante(estudiante: EstudianteAsignado, aulas: AmbienteDto[]): string {
  if (estudiante.trasladadoA) return estudiante.trasladadoA
  if (estudiante.aulaIngreso) return estudiante.aulaIngreso
  if (estudiante.idAmbienteIngreso != null) {
    const a = aulas.find((amb) => amb.id === estudiante.idAmbienteIngreso)
    if (a) return a.nombre
  }
  return '—'
}

/** V56: «Registrar salida» en dos toques (el segundo confirma), para no marcarla por error. */
function BotonSalida({ idExamen, estudiante, onExito }: { idExamen: number; estudiante: EstudianteAsignado; onExito?: () => void }) {
  const [paso, setPaso] = useState<'listo' | 'confirmar' | 'guardando'>('listo')
  const [error, setError] = useState('')
  const registrar = async () => {
    if (paso === 'listo') { setPaso('confirmar'); setError(''); return }
    setPaso('guardando')
    try {
      await registrarSalida(estudiante.idEstudiante, idExamen)
      onExito?.()
    } catch (e) {
      setError((e as { response?: { data?: { mensaje?: string } } }).response?.data?.mensaje ?? 'No se pudo registrar la salida.')
    } finally { setPaso('listo') }
  }
  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={() => void registrar()} onBlur={() => { if (paso === 'confirmar') setPaso('listo') }} disabled={paso === 'guardando'}
        aria-label={`${paso === 'confirmar' ? 'Confirmar la salida de' : 'Registrar salida de'} ${estudiante.nombre} ${estudiante.apellidos}`}
        className={`inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold md:min-h-8 disabled:opacity-60 ${paso === 'confirmar' ? 'bg-[#0439D9] text-white' : 'bg-[#EEF2F7] text-[#334155] hover:bg-[#E2E8F0]'}`}>
        <LogOut size={14} aria-hidden="true" /> {paso === 'confirmar' ? '¿Confirmar salida?' : paso === 'guardando' ? 'Guardando…' : 'Salida'}
      </button>
      {error && <span role="alert" className="mt-1 max-w-48 text-[10px] text-[#B91C1C]">{error}</span>}
    </span>
  )
}

function Acciones({ idExamen, estudiante, onExpulsar,onReasignar, salida, onExito }: { idExamen: number; estudiante: EstudianteAsignado; onExpulsar?: () => void;onReasignar?: () => void; salida?: boolean; onExito?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      {salida && <BotonSalida idExamen={idExamen} estudiante={estudiante} onExito={onExito} />}
      {onExpulsar && (
        <button type="button" onClick={onExpulsar} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#FDECEC] px-3 text-xs font-semibold text-[#B91C1C] hover:bg-red-100 md:min-h-8">
          <Ban size={14} aria-hidden="true" /> Expulsar
        </button>
      )}
      {estudiante.ingresado && !estudiante.expulsado && onReasignar && (
        <button
          type="button"
          onClick={onReasignar}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#F1F6FF] px-3 text-xs font-semibold text-[#0439D9] hover:bg-[#D8E3F5] md:min-h-8"
        >
          Reasignar
        </button>
      )}
      <Ver idExamen={idExamen} estudiante={estudiante} />
    </span>
  )
}

const colorCi = (habilitado: boolean) => (habilitado ? 'text-[#0439D9]' : 'text-[#B91C1C]')

function EstadoIngresoBadge({ ingresado, expulsado, salida }: { ingresado: boolean; expulsado?: boolean; salida?: string | null }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
        expulsado ? 'bg-[#FDECEC] text-[#B91C1C]' : salida ? 'bg-[#EEF2F7] text-[#334155]' : ingresado ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
      }`}
    >
      {expulsado ? 'EXPULSADO' : salida ? `SALIÓ ${salida.slice(11, 16)}` : ingresado ? 'INGRESÓ' : 'NO INGRESÓ'}
    </span>
  )
}

/** Tabla en escritorio y tarjetas en celular; los no habilitados se marcan en rojo. */
/** resaltar: el estudiante al que se llega desde «Incidencias de hoy» (inicio del ADMIN). */
export default function EstudiantesExamenLista({ idExamen, estudiantes, examen, datosExamen, onExito, resaltar }: { idExamen: number; estudiantes: EstudianteAsignado[]; examen?: string; datosExamen?: ExamenDto; onExito?: () => void; resaltar?: number | null }) {
  const auth = useAuth()
  // INCI-01: expulsa el ADMIN o el docente del examen (el backend verifica que sea el suyo); el
  // personal de control reporta el incidente y la notificación les llega a ellos.
  const puedeExpulsar = tienePermiso(auth, 'EXPULSAR_TODOS', 'EXPULSAR_PROPIOS')
  const puedeReasignar = auth.roles?.some(rol => rol === 'ADMIN' || rol === 'DOCENTE') ?? false
  const [seleccionado, setSeleccionado] = useState<EstudianteAsignado | null>(null)
  // V56: la salida la registra quien controla (CONTROL o el docente): solo a quien ingresó, sin expulsión y sin salida.
  const registra = registraControl(auth)
  const puedeSalida = (estudiante: EstudianteAsignado) =>
    registra && estudiante.ingresado === true && estudiante.expulsado !== true && !estudiante.fechaHoraSalida
  const accionExpulsar = (estudiante: EstudianteAsignado) =>
    puedeExpulsar && estudiante.ingresado === true && estudiante.expulsado !== true ? () => setSeleccionado(estudiante) : undefined
  const [modalReasignarAbierto, setModalReasignarAbierto] = useState(false)
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<EstudianteAsignado | null>(null)
  const [aulasExamen, setAulasExamen] = useState<AmbienteDto[]>([])
  /** Lista mostrada. Parte de lo que llega del servidor y se sobreecribe con los cambios de aula
   *  optimistas de la reasignación, para que el cambio se vea al instante sin esperar al refetch.
   *  Se deriva durante el render (useMemo), no en un efecto: así evitamos setState en el cuerpo del
   *  efecto (react-hooks/set-state-in-effect) y el acceso a refs durante el render (react-hooks/refs). */
  const [reasignacionesOptimistas, setReasignacionesOptimistas] = useState<Map<number, { idAmbienteIngreso: number; trasladadoA: string }>>(new Map())
  const estudiantesLocales = useMemo(() =>
    estudiantes.map((e) => {
      const ov = reasignacionesOptimistas.get(e.idEstudiante)
      return ov ? { ...e, idAmbienteIngreso: ov.idAmbienteIngreso, trasladadoA: ov.trasladadoA } : e
    }),
    [estudiantes, reasignacionesOptimistas]
  )

  const handleReasignarClick = (estudiante: EstudianteAsignado) => {
    setEstudianteSeleccionado(estudiante)
    setModalReasignarAbierto(true)
  }

  // Las aulas solo hacen falta para trasladar (ADMIN o docente). El CONTROL no puede listarlas (403) y el
  // nombre del aula de cada estudiante ya llega en aulaIngreso.
  useEffect(() => {
    if (!puedeReasignar) return
    let vigente = true
    listarAmbientes()
      .then((data) => {
        if (vigente) setAulasExamen(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (vigente) setAulasExamen([])
      })
    return () => {
      vigente = false
    }
  }, [puedeReasignar])

  return (
    <>
      <table className="hidden w-full text-left md:table">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Estudiante</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carnet / CI</th>
            <th scope="col" className="px-4 py-3 font-semibold">Carrera</th>
            <th scope="col" className="px-4 py-3 font-semibold">Estado de ingreso</th>
            <th scope="col" className="px-4 py-3 font-semibold text-left">Aula</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {estudiantesLocales.map((estudiante) => {
            const habilitado = estudiante.estado === 'HABILITADO'
            return (
              <tr key={estudiante.idEstudiante} data-foco={resaltar === estudiante.idEstudiante ? 'true' : undefined}
                className={`border-t border-[#EDF1F7] ${habilitado ? '' : 'bg-[#FEF2F2]'} ${resaltar === estudiante.idEstudiante ? 'bg-[#FFFBEB] outline outline-2 -outline-offset-2 outline-[#F59E0B]' : ''}`}>
                <td className="px-4 py-3"><Identidad estudiante={estudiante} habilitado={habilitado}>
                  {estudiante.expulsion && <RegistroExpulsion registro={estudiante.expulsion} />}
                </Identidad></td>
                <td className={`px-4 py-3 text-sm font-semibold ${colorCi(habilitado)}`}>{estudiante.ci}</td>
                <td className="px-4 py-3 text-sm text-[#011140]">{estudiante.carrera ?? '—'}</td>
                <td className="px-4 py-3">
                  <EstadoIngresoBadge ingresado={estudiante.ingresado} expulsado={estudiante.expulsado} salida={estudiante.fechaHoraSalida} />
                  {estudiante.ingresado && estudiante.trasladadoDesde && (
                    <p className="mt-1 text-[10px] text-[#627A9B]">{textoTraslado(estudiante)}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#011140] font-medium">{nombreAulaEstudiante(estudiante, aulasExamen)}</td>
                <td className="px-4 py-3 text-right"><Acciones idExamen={idExamen} estudiante={estudiante} salida={puedeSalida(estudiante)} onExito={onExito} onExpulsar={accionExpulsar(estudiante)} onReasignar={puedeReasignar ? () => handleReasignarClick(estudiante) : undefined} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {estudiantesLocales.map((estudiante) => {
          const habilitado = estudiante.estado === 'HABILITADO'
          return (
            <li
              key={estudiante.idEstudiante}
              data-foco={resaltar === estudiante.idEstudiante ? 'true' : undefined}
              className={`rounded-xl border p-3 shadow-sm ${resaltar === estudiante.idEstudiante ? 'ring-2 ring-[#F59E0B] ' : ''}${
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
                    <EstadoIngresoBadge ingresado={estudiante.ingresado} expulsado={estudiante.expulsado} salida={estudiante.fechaHoraSalida} />
                    {estudiante.ingresado && estudiante.trasladadoDesde && (
                      <p className="mt-1 text-[10px] text-[#627A9B]">{textoTraslado(estudiante)}</p>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#627A9B]">Cód. {estudiante.codigoSis}</p>
                  <p className="mt-0.5 text-[10px] text-[#627A9B]">Aula: {nombreAulaEstudiante(estudiante, aulasExamen)}</p>
                  <SinFoto estudiante={estudiante} />
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-[#EDF1F7] pt-2">
                    <div className="min-w-0 text-[10px]">
                      <p className={`font-semibold ${colorCi(habilitado)}`}>CI: {estudiante.ci}</p>
                      {estudiante.carrera && <p className="mt-0.5 truncate text-[#627A9B]">{estudiante.carrera}</p>}
                    </div>
                    <Acciones idExamen={idExamen} estudiante={estudiante} salida={puedeSalida(estudiante)} onExito={onExito} onExpulsar={accionExpulsar(estudiante)} onReasignar={puedeReasignar ? () => handleReasignarClick(estudiante) : undefined} />
                  </div>
                  {estudiante.expulsion && <RegistroExpulsion registro={estudiante.expulsion} />}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {puedeExpulsar && seleccionado && <ExpulsarEstudianteModal idExamen={idExamen} examen={examen} datosExamen={datosExamen} estudiante={seleccionado} onClose={() => setSeleccionado(null)} />}
        {modalReasignarAbierto && estudianteSeleccionado && (
        <ReasignarAmbienteModal
          idExamen={idExamen}
          estudiante={estudianteSeleccionado}
          aulas={aulasExamen}
          aulaActualId={estudianteSeleccionado?.idAmbienteIngreso ?? undefined}
          onClose={() => {
            setModalReasignarAbierto(false)
            setEstudianteSeleccionado(null)
          }}
          onSuccess={(idAmbienteDestino, aulaDestinoNombre) => {
            setModalReasignarAbierto(false)
            setEstudianteSeleccionado(null)
            // Actualizar optimistamente la lista mostrada para que el cambio de aula se vea al instante,
            // sin depender únicamente del refetch del servidor.
            if (estudianteSeleccionado) {
              setReasignacionesOptimistas((prev) => {
                const siguiente = new Map(prev)
                siguiente.set(estudianteSeleccionado.idEstudiante, {
                  idAmbienteIngreso: idAmbienteDestino,
                  trasladadoA: aulaDestinoNombre,
                })
                return siguiente
              })
            }
            // Refrescar desde el servidor para consistencia a largo plazo
            onExito?.()
          }}
        />
      )}
    </>
  )
}
