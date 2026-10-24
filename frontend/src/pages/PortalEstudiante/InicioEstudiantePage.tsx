import { useEffect, useState } from 'react'
import { CalendarDays, CircleCheck, Clock, Info, LoaderCircle, MapPin, QrCode, RotateCw, ShieldCheck, ShieldX, TriangleAlert, WifiOff } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import PortalEstudianteLayout from '../../components/estudiantes/PortalEstudianteLayout'
import { PortalCargando, PortalError } from '../../components/estudiantes/PortalEstado'
import useMiPerfil from '../../hooks/useMiPerfil'
import {
  obtenerMisExamenes,
  requiereRegistrarFoto,
  SinConexionError,
  type MiExamen,
} from '../../services/panelEstudianteService'
import { etiquetaCondicion } from '../../utils/condicionEstudiante'
import { estadoExamen, fechaLarga, horario, separarExamenes, type EstadoExamen } from '../../utils/misExamenes'
import useEnVivo from '../../hooks/useEnVivo'
import CronometroExamen from '../../components/examenes/CronometroExamen'
import { ahoraServidorMs } from '../../services/tiempoService'

const ESTADOS: Record<EstadoExamen, { texto: string; clase: string }> = {
  HABILITADO: { texto: 'Habilitado', clase: 'bg-[#ECFDF5] text-[#047857]' },
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-[#FFF7E6] text-[#92400E]' },
  NO_HABILITADO: { texto: 'No habilitado', clase: 'bg-[#FEF2F2] text-[#B91C1C]' },
  INGRESO: { texto: 'Ingresó', clase: 'bg-[#ECFDF5] text-[#047857]' },
  DENEGADO: { texto: 'Ingreso denegado', clase: 'bg-[#FEF2F2] text-[#B91C1C]' },
  NO_SE_PRESENTO: { texto: 'No se presentó', clase: 'bg-[#F1F5F9] text-[#475569]' },
}

function EstadoBadge({ estado }: { estado: EstadoExamen }) {
  const { texto, clase } = ESTADOS[estado]
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${clase}`}>{texto}</span>
}

/** Aviso según el próximo examen: habilitado, pendiente de revisión o no habilitado (con la razón). */
function AvisoHabilitacion({ proximo, fotoEnRevision }: { proximo: MiExamen | null; fotoEnRevision: boolean }) {
  if (!proximo) return null
  if (proximo.habilitado === false) {
    return (
      <div role="alert" className="flex gap-3 rounded-xl border border-[#FBCFD4] bg-[#FFF5F5] p-4 text-sm text-[#7F1D1D]">
        <ShieldX size={24} className="shrink-0 text-[#B91C1C]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#B91C1C]">No estás habilitado para {proximo.materia}</p>
          <p className="mt-0.5">Razón: {proximo.motivoInhabilitacion || 'no indicada'}.</p>
          <p className="mt-0.5 text-xs">
            {fotoEnRevision
              ? 'Además, tu foto nueva aún no fue aprobada. '
              : ''}
            Si crees que es un error, comunícate con la administración antes del examen.
          </p>
        </div>
      </div>
    )
  }
  if (proximo.habilitado === null) {
    return (
      <div className="flex gap-3 rounded-xl border border-[#FDE68A] bg-[#FFF7E6] p-4 text-sm text-[#92400E]">
        <Clock size={24} className="shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">Tu habilitación para {proximo.materia} está pendiente</p>
          <p className="mt-0.5">La administración todavía no revisa tu habilitación. Vuelve a consultar antes del examen.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm text-[#14532D]">
      <ShieldCheck size={24} className="shrink-0 text-[#15803D]" aria-hidden="true" />
      <div>
        <p className="font-bold text-[#15803D]">Estás habilitado para tu próximo examen</p>
        <p className="mt-0.5">Preséntate con tu QR de ingreso y tu carnet. El personal de control verificará tu identidad.</p>
      </div>
    </div>
  )
}

function ProximoExamen({ examen }: { examen: MiExamen }) {
  return (
    <article className="rounded-xl border border-[#D8E3F5] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#627A9B]">Próximo examen</h2>
        <EstadoBadge estado={estadoExamen(examen, false)} />
      </div>
      <p className="mt-2 text-xl font-bold text-[#011140]">{examen.materia}</p>
      <p className="mt-3 flex items-center gap-2 text-sm text-[#011140]">
        <CalendarDays size={18} className="text-[#0439D9]" aria-hidden="true" /> {fechaLarga(examen.fecha)}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p className="flex items-center gap-2 text-sm text-[#011140]">
          <Clock size={18} className="text-[#0439D9]" aria-hidden="true" /> {horario(examen)}
        </p>
        <p className="flex items-center gap-2 text-sm text-[#011140]">
          <MapPin size={18} className="text-[#0439D9]" aria-hidden="true" /> {examen.aula ? `Aula ${examen.aula}` : 'El aula se asigna al llegar'}
        </p>
      </div>
      <Link
        to="/estudiante/qr"
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white hover:bg-[#0027a2]"
      >
        <QrCode size={20} aria-hidden="true" /> Mostrar mi QR
      </Link>
      <p className="mt-2 text-center text-[11px] text-[#627A9B]">Tu QR se renueva cada 60 segundos: muéstralo desde tu celular, no lo captures.</p>
    </article>
  )
}

function FilaExamen({ examen, pasado }: { examen: MiExamen; pasado: boolean }) {
  const estado = estadoExamen(examen, pasado)
  const detalle =
    estado === 'NO_HABILITADO' ? examen.motivoInhabilitacion
      : estado === 'DENEGADO' ? examen.motivoDenegacion
        : estado === 'INGRESO' && examen.fechaHoraIngreso
          ? `Ingresaste a las ${new Date(examen.fechaHoraIngreso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })}`
          : null
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#011140]">{examen.materia}</p>
        <p className="mt-0.5 text-xs text-[#627A9B]">{fechaLarga(examen.fecha)} · {horario(examen)}</p>
        <p className="text-xs text-[#627A9B]">{examen.aula ? `Aula ${examen.aula}` : 'Aula por asignar'}</p>
        {detalle && <p className="mt-1 text-xs text-[#7F1D1D]">{detalle}</p>}
      </div>
      <EstadoBadge estado={estado} />
    </li>
  )
}

/**
 * CTA-03 · Panel de inicio del estudiante (Figma, sección 4): su identidad, el aviso de habilitación,
 * su próximo examen con acceso a Mi QR y sus exámenes próximos y pasados. Si la foto es obligatoria,
 * primero lo manda a registrarla (CTA-02).
 */
export default function InicioEstudiantePage() {
  const { perfil, cargando, error, recargar } = useMiPerfil()
  const [examenes, setExamenes] = useState<MiExamen[] | null>(null)
  const [errorExamenes, setErrorExamenes] = useState<Error | null>(null)
  const [intento, setIntento] = useState(0)
  const [pestana, setPestana] = useState<'proximos' | 'pasados'>('proximos')
  // En vivo: p. ej. el personal registra su ingreso y el examen pasa a "Ingresaste".
  useEnVivo(() => true, () => setIntento((n) => n + 1))

  useEffect(() => {
    let vigente = true
    obtenerMisExamenes()
      .then((lista) => { if (vigente) { setExamenes(lista); setErrorExamenes(null) } })
      .catch((err: unknown) => { if (vigente) setErrorExamenes(err instanceof Error ? err : new Error(String(err))) })
    return () => { vigente = false }
  }, [intento])

  if (perfil && requiereRegistrarFoto(perfil)) return <Navigate to="/estudiante/foto" replace />

  const { proximos, pasados, proximo } = separarExamenes(examenes ?? [], new Date(ahoraServidorMs()))
  const lista = pestana === 'proximos' ? proximos : pasados
  const carrera = perfil?.carreras?.[0]
  const hoy = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <PortalEstudianteLayout fotoUrl={perfil?.fotoUrl}>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-8">
        <p className="text-xs text-[#627A9B]">Inicio · {hoy.charAt(0).toUpperCase() + hoy.slice(1)}</p>
        {cargando ? (
          <div className="mt-6"><PortalCargando /></div>
        ) : error || !perfil ? (
          <div className="mt-6"><PortalError mensaje={error || 'No se pudo cargar tu perfil.'} onReintentar={recargar} /></div>
        ) : (
          <>
            <section aria-label="Mis datos" className="mt-4 flex items-center gap-4 rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
              <FotoEstudiante
                fotoUrl={perfil.fotoUrl}
                nombre={`${perfil.nombre} ${perfil.apellidos}`}
                iniciales={`${perfil.nombre.charAt(0)}${perfil.apellidos.charAt(0)}`.toUpperCase()}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E9F1FF] text-lg font-bold text-[#0439D9]"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#627A9B]">{etiquetaCondicion(perfil.condicion)}</p>
                <h1 className="break-words text-xl font-extrabold leading-tight text-[#092068] sm:text-2xl">Hola, {perfil.nombre} {perfil.apellidos}</h1>
                <p className="truncate text-xs text-[#627A9B]">SIS {perfil.codigoSis}{carrera ? ` · ${carrera.nombreCarrera}` : ''}</p>
                {perfil.solicitudFoto?.estado === 'PENDIENTE' && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#92400E]">
                    <Clock size={12} aria-hidden="true" /> Tu foto nueva está en revisión; el control usa tu foto actual.
                  </p>
                )}
                {perfil.solicitudFoto?.estado === 'RECHAZADA' && (
                  <Link to="/estudiante/perfil" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C] hover:underline">
                    <TriangleAlert size={12} aria-hidden="true" /> Tu foto nueva fue rechazada. Ver el motivo
                  </Link>
                )}
              </div>
            </section>

            {errorExamenes ? (
              <div role="alert" className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FFF7E6] p-6 text-center text-sm text-[#92400E]">
                {errorExamenes instanceof SinConexionError ? <WifiOff size={26} aria-hidden="true" /> : <TriangleAlert size={26} aria-hidden="true" />}
                <p>{errorExamenes.message}</p>
                <button type="button" onClick={() => setIntento((n) => n + 1)} className="inline-flex items-center gap-1 font-semibold text-[#0439D9]">
                  <RotateCw size={14} aria-hidden="true" /> Reintentar
                </button>
              </div>
            ) : examenes === null ? (
              <div role="status" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#D8E3F5] bg-white p-8 text-sm text-[#627A9B]">
                <LoaderCircle size={18} className="animate-spin text-[#0439D9]" aria-hidden="true" /> Cargando tus exámenes…
              </div>
            ) : examenes.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[#D8E3F5] bg-white px-6 py-12 text-center shadow-sm">
                <CalendarDays size={36} className="mx-auto text-[#7C93B8]" aria-hidden="true" />
                <p className="mt-3 text-base font-bold text-[#011140]">No tienes exámenes programados</p>
                <p className="mt-1 text-sm text-[#627A9B]">Cuando la administración te asocie a un examen, aparecerá aquí con tu habilitación.</p>
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <AvisoHabilitacion proximo={proximo} fotoEnRevision={perfil.solicitudFoto?.estado === 'PENDIENTE'} />
                  {proximo && <CronometroExamen examen={proximo} className="mt-3" />}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
                  <div className="flex min-w-0 flex-col gap-4">
                    {proximo && <ProximoExamen examen={proximo} />}
                    <section aria-labelledby="mis-examenes" className="rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
                      <h2 id="mis-examenes" className="text-lg font-bold text-[#011140]">Mis exámenes</h2>
                      <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-[#EEF3FC] p-1">
                        {([['proximos', `Próximos (${proximos.length})`], ['pasados', `Pasados (${pasados.length})`]] as const).map(([id, texto]) => (
                          <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={pestana === id}
                            onClick={() => setPestana(id)}
                            className={`rounded-md py-2 text-sm font-semibold ${pestana === id ? 'bg-white text-[#0439D9] shadow-sm' : 'text-[#627A9B] hover:text-[#011140]'}`}
                          >
                            {texto}
                          </button>
                        ))}
                      </div>
                      {lista.length === 0 ? (
                        <p className="mt-4 rounded-lg border border-dashed border-[#B8CBEF] px-3 py-6 text-center text-sm text-[#627A9B]">
                          {pestana === 'proximos' ? 'No tienes exámenes próximos.' : 'Todavía no tienes exámenes pasados.'}
                        </p>
                      ) : (
                        <ul className="mt-3 flex flex-col gap-2">
                          {lista.map((e) => <FilaExamen key={e.idExamen} examen={e} pasado={pestana === 'pasados'} />)}
                        </ul>
                      )}
                    </section>
                  </div>
                  <aside className="h-fit rounded-xl border border-[#D8E3F5] bg-white p-4 text-sm shadow-sm">
                    <p className="flex items-center gap-2 font-semibold text-[#011140]">
                      <Info size={18} className="text-[#0439D9]" aria-hidden="true" /> Tu QR es personal
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#627A9B]">
                      Muéstralo solo en el control de ingreso. Si crees que alguien lo vio o lo copió, pide a la
                      administración que lo regenere.
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-[#047857]">
                      <CircleCheck size={14} aria-hidden="true" /> Solo tú ves tus exámenes y tu QR.
                    </p>
                  </aside>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PortalEstudianteLayout>
  )
}
