import { useEffect, useState } from 'react'
import { ChevronDown, CircleCheck, Info } from 'lucide-react'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import TablePagination from '../users/TablePagination'
import useEnVivo from '../../hooks/useEnVivo'
import { ingresosRecientes, type IngresoReciente } from '../../services/ingresosRecientesService'
import { listarEstudiantesExamen, type EstudianteAsignado } from '../../services/controlExamenService'
import silueta from '../../assets/silueta-estudiante.svg'

// Como el diseño: 6 filas en escritorio y 4 en celular.
const cantidad = () => (typeof window !== 'undefined' && window.innerWidth < 640 ? 4 : 6)
type Vista = 'todos' | 'ausentes'

interface Fila {
  clave: string
  nombre: string
  codigo: string
  fotoUrl: string | null
  ingreso: string | null
  salida: string | null
  alCierre: boolean
  estado: { texto: string; clase: string }
  /** Traslado o motivo de la expulsión, bajo el nombre. */
  detalle: string | null
}

const hora = (f?: string | null) => (f ? f.slice(11, 19) : null)
const ESTADOS = {
  enExamen: { texto: 'En el examen', clase: 'bg-[#ECFDF3] text-[#15803D]' },
  salio: { texto: 'Salió', clase: 'bg-[#EEF2F7] text-[#334155]' },
  alCierre: { texto: 'Terminó al cierre', clase: 'bg-[#EEF2F7] text-[#334155]' },
  expulsado: { texto: 'Expulsado', clase: 'bg-[#FEF2F2] text-[#B91C1C]' },
  ausente: { texto: 'No ingresó', clase: 'bg-[#FFFBEB] text-[#B45309]' },
}

const desdeIngreso = (f: IngresoReciente): Fila => {
  const expulsado = !!f.fechaHoraExpulsion && !f.expulsionAnulada
  const estado = expulsado ? { ...ESTADOS.expulsado, texto: `Expulsado ${hora(f.fechaHoraExpulsion)!.slice(0, 5)}` }
    : f.salidaAlCierre ? ESTADOS.alCierre : f.fechaHoraSalida ? ESTADOS.salio : ESTADOS.enExamen
  const detalles = [
    f.traslado && `Trasladado ${f.traslado} · ${hora(f.fechaHoraTraslado)!.slice(0, 5)}`,
    expulsado && f.motivoExpulsion,
    f.fechaHoraExpulsion && f.expulsionAnulada && 'Expulsión anulada',
  ].filter(Boolean)
  return {
    clave: `I-${f.idEstudiante}`, nombre: `${f.apellidos}, ${f.nombre}`, codigo: f.codigoSis, fotoUrl: f.fotoUrl,
    ingreso: hora(f.fechaHoraIngreso), salida: hora(f.fechaHoraSalida), alCierre: f.salidaAlCierre, estado,
    detalle: detalles.length ? detalles.join(' · ') : null,
  }
}
const desdeAusente = (e: EstudianteAsignado): Fila => ({
  clave: `A-${e.idEstudiante}`, nombre: `${e.apellidos}, ${e.nombre}`, codigo: e.codigoSis, fotoUrl: e.fotoUrl ?? null,
  ingreso: null, salida: null, alCierre: false, estado: ESTADOS.ausente, detalle: null,
})

// Columnas fijas (escritorio): así la hora de ingreso, la de salida y el estado quedan alineados fila a fila.
const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_84px_132px_150px] sm:gap-x-4'

/**
 * Sección 11 del diseño: «Ingresos recientes» del examen. Todos (DASH-02): los últimos ingresos, del más reciente
 * al más antiguo, con foto, nombre, código y hora. Solo ausentes (DASH-03): los habilitados que aún no ingresaron,
 * o «Todos los estudiantes ingresaron». Se actualiza en vivo con cada ingreso.
 */
interface Props {
  idExamen: number
  /** La tabla completa «Estudiantes del examen» va oculta debajo; la tarjeta la abre y la cierra. */
  tablaAbierta?: boolean
  onAlternarTabla?: () => void
}

export default function IngresosRecientesCard({ idExamen, tablaAbierta = false, onAlternarTabla }: Props) {
  const [vista, setVistaActual] = useState<Vista>('todos')
  const [pagina, setPagina] = useState(0)
  const [datos, setDatos] = useState<{ vista: Vista; pagina: number; filas: Fila[]; total: number } | null>(null)
  const setVista = (v: Vista) => { setVistaActual(v); setPagina(0) }
  const tamano = cantidad()
  const [error, setError] = useState(false)
  const [recarga, setRecarga] = useState(0)

  useEnVivo((c) => c.idExamen == null || c.idExamen === idExamen, () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    const pedir = vista === 'todos'
      ? ingresosRecientes(idExamen, tamano, pagina).then((r) => ({ filas: r.ingresos.map(desdeIngreso), total: r.total }))
      : listarEstudiantesExamen(idExamen, 'AUSENTES', pagina, tamano).then((p) => ({ filas: p.contenido.map(desdeAusente), total: p.totalRegistros }))
    pedir
      .then((r) => {
        if (!vigente) return
        // Si la página quedó vacía (p. ej. ingresaron los ausentes de la última), vuelve a la última que tiene datos.
        if (r.filas.length === 0 && pagina > 0) { setPagina(Math.max(0, Math.ceil(r.total / tamano) - 1)); return }
        setDatos({ vista, pagina, ...r }); setError(false)
      })
      .catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [idExamen, vista, pagina, tamano, recarga])

  const cargando = datos?.vista !== vista || datos.pagina !== pagina
  const filas = cargando ? [] : datos.filas
  const total = cargando ? 0 : datos.total

  return (
    <section aria-labelledby="ingresos-recientes-titulo" className="flex flex-col gap-3.5 rounded-xl border border-[#D8E3F5] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
          <h2 id="ingresos-recientes-titulo" className="text-base font-bold text-[#011140]">{vista === 'todos' ? 'Ingresos recientes' : 'Estudiantes ausentes'}</h2>
          <p className="text-xs text-[#627A9B]">
            {vista === 'todos' ? 'Ingreso, salida y estado de cada estudiante, el más reciente primero · en vivo' : 'Habilitados que aún no ingresaron · se actualiza en vivo'}
          </p>
        </div>
        <div role="group" aria-label="Filtrar ingresos" className="flex gap-0.5 rounded-lg bg-[#EEF2F8] p-[3px]">
          {(['todos', 'ausentes'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)}
              className={`rounded-md px-3 py-1.5 text-[13px] ${vista === v ? 'bg-white font-semibold text-[#011140] shadow-[0_1px_1px_rgba(0,0,0,0.08)]' : 'font-medium text-[#627A9B] hover:text-[#011140]'}`}>
              {v === 'todos' ? 'Todos' : 'Solo ausentes'}
            </button>
          ))}
        </div>
      </div>

      {vista === 'ausentes' && !cargando && total > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] px-3 py-2.5 text-xs text-[#92400E]">
          <Info size={15} className="mt-px shrink-0" aria-hidden="true" />
          {total === 1 ? 'Falta 1 estudiante habilitado por ingresar.' : `Faltan ${total} estudiantes habilitados por ingresar.`} La lista se actualiza sola cuando alguien ingresa.
        </p>
      )}

      {error && !datos ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudo cargar la lista. Volveremos a intentarlo.</p>
      ) : cargando ? (
        <p role="status" className="py-6 text-center text-sm text-[#627A9B]">Cargando…</p>
      ) : filas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${vista === 'ausentes' ? 'bg-[#ECFDF3] text-[#15803D]' : 'bg-[#EEF2F8] text-[#627A9B]'}`}>
            <CircleCheck size={26} aria-hidden="true" />
          </span>
          <p className="text-base font-bold text-[#011140]">{vista === 'ausentes' ? 'Todos los estudiantes ingresaron' : 'Aún no hay ingresos'}</p>
          <p className="text-sm text-[#627A9B]">{vista === 'ausentes' ? 'No queda ningún estudiante habilitado por ingresar.' : 'Aquí aparecerán los estudiantes a medida que ingresen.'}</p>
        </div>
      ) : (
        <div>
          <div aria-hidden="true" className={`${COLUMNAS} hidden border-b border-[#EDF1F7] px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#627A9B] sm:grid`}>
            <span>Estudiante</span><span>Ingreso</span><span>Salida</span><span>Estado</span>
          </div>
          <ul aria-label={vista === 'todos' ? 'Ingresos recientes' : 'Estudiantes ausentes'}>
            {filas.map((f) => (
              <li key={f.clave} className={`${COLUMNAS} border-b border-[#EDF1F7] py-2.5 sm:px-4`}>
                <span className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
                  {f.fotoUrl
                    ? <FotoEstudiante fotoUrl={f.fotoUrl} nombre={f.nombre} iniciales={f.nombre.slice(0, 2).toUpperCase()} className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#E4ECFA] object-cover" />
                    : <img src={silueta} alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#E4ECFA]" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#011140]">{f.nombre}</span>
                    <span className="block truncate text-xs text-[#627A9B]">SIS {f.codigo}{f.detalle ? ` · ${f.detalle}` : ''}</span>
                    {/* En celular, ingreso y salida van bajo el nombre (no hay columnas). */}
                    {vista === 'todos' && (
                      <span className="block text-[11px] tabular-nums text-[#45628D] sm:hidden">
                        Ingreso {f.ingreso ?? '—'} · Salida {f.salida ? `${f.salida}${f.alCierre ? ' (al cierre)' : ''}` : '—'}
                      </span>
                    )}
                  </span>
                </span>
                <span className="hidden text-sm font-semibold tabular-nums text-[#011140] sm:block">{f.ingreso ?? '—'}</span>
                <span className="hidden text-sm tabular-nums text-[#011140] sm:block">
                  {f.salida ?? '—'}{f.alCierre && <span className="block text-[11px] text-[#627A9B]">al cierre</span>}
                </span>
                <span className={`w-fit justify-self-end whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold sm:justify-self-start ${f.estado.clase}`}>
                  {f.estado.texto}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!cargando && total > 0 && (
        <TablePagination compact page={pagina} totalPages={Math.ceil(total / tamano)} totalRecords={total} pageSize={tamano}
          onPageChange={setPagina} itemLabel={vista === 'todos' ? 'estudiantes' : 'ausentes'} />
      )}
      {onAlternarTabla && (
        <button type="button" onClick={onAlternarTabla} aria-expanded={tablaAbierta} aria-controls="estudiantes-examen-tabla"
          className="inline-flex items-center gap-1 self-start text-xs font-semibold text-[#0439D9] hover:underline">
          {tablaAbierta ? 'Ocultar estudiantes' : 'Ver todos los estudiantes'}
          <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${tablaAbierta ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}
