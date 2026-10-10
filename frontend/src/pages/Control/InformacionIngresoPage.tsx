import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import useExamen from '../../hooks/useExamen'
import { listarIntentosIngreso, type IntentoIngreso } from '../../services/intentoIngresoService'
import { listarRegistrosControlExamen, type RegistroControlIngresoExamen } from '../../services/controlIngresoService'

type PestañaIngreso = 'intentos' | 'autorizados'

const fechaHora = (valor: string) => new Date(valor).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })

export default function InformacionIngresoPage() {
  const idExamen = Number(useParams().idExamen)
  const idValido = Number.isInteger(idExamen) && idExamen > 0
  const examen = useExamen(idExamen)
  const ubicacion = examen && [examen.ambienteUbicacion, examen.ambienteNombre].filter(Boolean).join(' · ')
  const [intentos, setIntentos] = useState<IntentoIngreso[] | null>(null)
  const [registros, setRegistros] = useState<RegistroControlIngresoExamen[] | null>(null)
  const [resultadoCarga, setResultadoCarga] = useState<{ idExamen: number; estado: 'error' | 'listo' }>()
  const [reintentosCarga, setReintentosCarga] = useState(0)
  const [pestaña, setPestaña] = useState<PestañaIngreso>('intentos')

  useEffect(() => {
    if (!idValido) return
    let vigente = true
    Promise.all([
        listarIntentosIngreso(idExamen),
        listarRegistrosControlExamen(idExamen),
      ]).then(([intentosCargados, registrosCargados]) => {
        if (!vigente) return
        setIntentos(intentosCargados)
        setRegistros(registrosCargados)
        setResultadoCarga({ idExamen, estado: 'listo' })
      }).catch(() => {
        if (vigente) setResultadoCarga({ idExamen, estado: 'error' })
      })
    return () => { vigente = false }
  }, [idExamen, idValido, reintentosCarga])

  const estadoCarga = !idValido ? 'error' : resultadoCarga?.idExamen !== idExamen ? 'cargando' : resultadoCarga.estado
  const error = !idValido
    ? 'El examen indicado no es válido.'
    : estadoCarga === 'error'
      ? 'No se pudo cargar la información de ingreso. Comprueba la conexión e inténtalo de nuevo.'
      : ''
  const cargando = estadoCarga === 'cargando'

  const totalIntentos = intentos?.length
  const ingresosAutorizados = registros?.filter((registro) => registro.resultado === 'AUTORIZADO') ?? []
  const totalAutorizados = registros === null ? null : ingresosAutorizados.length
  const lista = pestaña === 'intentos' ? intentos : ingresosAutorizados

  return <PanelLayout compactDesktop topBarVariant="controlMinimal" locationLabel={ubicacion}>
    <div className="mx-auto w-full max-w-6xl p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4 md:p-6 md:pb-[calc(5rem+env(safe-area-inset-bottom))] min-[960px]:pb-6">
      <Link to={`/dashboard/control/${idExamen}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9]"><ArrowLeft size={16}/>Volver al control</Link>
      <section className="mt-4 rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm md:min-h-[calc(100dvh-170px)] md:rounded-xl md:border-[#E2E6EC] md:p-5">
        <header className="flex flex-col gap-3 border-b border-[#E6EAF0] pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-base font-extrabold uppercase text-[#171C27]">Información de ingreso tiempo real</h1>
            <p className="mt-1 text-xs text-[#627A9B]">
              {examen ? `${examen.fecha} · ${examen.horaInicio} · ${examen.asignatura} · ${examen.ambienteNombre}${examen.docente ? ` · Docente: ${examen.docente}` : ''}` : 'Registros de control e intentos de ingreso del examen.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#E6ECFF] px-3 py-2 text-center text-[10px] font-bold uppercase text-[#0439D9]">
              Registros válidos<br/><span>{totalAutorizados ?? '…'} ingreso{totalAutorizados === 1 ? '' : 's'} autorizado{totalAutorizados === 1 ? '' : 's'}</span>
            </div>
            <div className="rounded-lg bg-[#FDECEC] px-3 py-2 text-center text-[10px] font-bold uppercase text-[#B91C1C]">
              Incidencias<br/><span>{totalIntentos ?? '…'} intento{totalIntentos === 1 ? '' : 's'} observado{totalIntentos === 1 ? '' : 's'}</span>
            </div>
          </div>
        </header>

        <div className="-mx-3 mt-3 flex gap-1 overflow-x-auto border-b border-[#E6EAF0] px-3 sm:mx-0 sm:gap-2 sm:px-0" role="tablist" aria-label="Información de ingreso">
          <button type="button" role="tab" aria-selected={pestaña === 'intentos'} onClick={() => setPestaña('intentos')} className={`min-h-11 shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold ${pestaña === 'intentos' ? 'border-[#0439D9] text-[#0439D9]' : 'border-transparent text-[#627A9B]'}`}>
            <TriangleAlert className="mr-1 inline" size={14}/>Historial de Intentos <span className="ml-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">{totalIntentos ?? '…'}</span>
          </button>
          <button type="button" role="tab" aria-selected={pestaña === 'autorizados'} onClick={() => setPestaña('autorizados')} className={`min-h-11 shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold ${pestaña === 'autorizados' ? 'border-[#0439D9] text-[#0439D9]' : 'border-transparent text-[#627A9B]'}`}>
            Ingresos Autorizados en Tiempo Real <span className="ml-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-[#0439D9]">{totalAutorizados ?? '…'}</span>
          </button>
        </div>

        <div role="tabpanel" className="pt-3">
          <h2 className="border-b border-[#E6EAF0] pb-2 text-sm font-bold text-[#20242A]">
            {pestaña === 'intentos' ? 'Ingresos no autorizados' : 'Ingresos autorizados'}
          </h2>
          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><p>{error}</p><button type="button" onClick={() => { setResultadoCarga(undefined); setReintentosCarga((valor) => valor + 1) }} className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700">Reintentar</button></div>
            : cargando ? <p role="status" className="py-8 text-center text-sm text-gray-500">Cargando información de ingreso…</p>
              : lista === null || lista.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">{pestaña === 'intentos' ? 'No hay intentos registrados para este examen.' : 'No hay ingresos autorizados registrados para este examen.'}</p>
                : pestaña === 'intentos' ? <ul aria-label="Intentos no autorizados" className="mt-3 space-y-2 md:mt-2">
                  {(lista as IntentoIngreso[]).map((intento) => <li key={intento.idIntento} className="rounded-xl border border-[#E1E7F0] bg-white px-3 py-3 text-sm shadow-[0_2px_8px_rgba(1,17,64,.05)] md:rounded-lg md:border-0 md:bg-[#F3F3F3] md:px-3 md:py-2.5 md:text-xs md:shadow-none">
                    <p className="font-semibold text-[#011140] md:text-[#20242A]">{intento.estudiante || intento.identificador}</p>
                    <p className="mt-0.5 break-words leading-5 text-red-700 md:mt-0 md:text-[11px]">{intento.motivo}</p>
                    <p className="mt-1 break-words text-[11px] leading-5 text-[#627A9B] md:hidden">{intento.identificador} · {intento.personalControl} · {fechaHora(intento.fechaHora)}</p>
                    <p className="hidden text-[10px] text-[#627A9B] md:mt-0.5 md:block">{intento.codigoSis || intento.identificador} <span aria-hidden="true">·</span> {fechaHora(intento.fechaHora)}</p>
                    <p className="hidden text-[10px] text-[#627A9B] md:mt-0.5 md:block">Personal de control: {intento.personalControl}</p>
                  </li>)}
                </ul> : <ul aria-label="Ingresos autorizados" className="mt-3 space-y-2 md:mt-2">
                  {(lista as RegistroControlIngresoExamen[]).map((registro) => <li key={registro.idRegistro} className="rounded-xl border border-[#E1E7F0] bg-white px-3 py-3 text-sm shadow-[0_2px_8px_rgba(1,17,64,.05)] md:rounded-lg md:border-0 md:bg-[#F3F3F3] md:px-3 md:py-2.5 md:text-xs md:shadow-none">
                    <p className="font-semibold text-[#20242A]">{registro.estudiante}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#0439D9]">Ingreso al examen autorizado.</p>
                    <p className="mt-1 break-words text-[11px] leading-5 text-[#627A9B] md:text-[10px]">{registro.codigoSis ?? `Estudiante ${registro.idEstudiante}`} · {fechaHora(registro.fechaHora)}{registro.usuarioControl ? ` · ${registro.usuarioControl}` : ''}</p>
                  </li>)}
                </ul>}
        </div>
      </section>
    </div>
    <MobileBottomNav variant="controlDetail" />
  </PanelLayout>
}
