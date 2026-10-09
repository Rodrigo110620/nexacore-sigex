import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import ControlIngresoHeader from '../../components/control/ControlIngresoHeader'
import MecanismoSelector, { type Mecanismo } from '../../components/control/MecanismoSelector'
import BusquedaEstudianteForm from '../../components/control/BusquedaEstudianteForm'
import EscanerQr from '../../components/control/EscanerQr'
import ResultadoEstudianteCard from '../../components/control/ResultadoEstudianteCard'
import EstudianteNoVinculadoModal from '../../components/control/EstudianteNoVinculadoModal'
import VerificacionHabilitacionModal from '../../components/control/VerificacionHabilitacionModal'
import useIdentificacion from '../../hooks/useIdentificacion'
import useExamen from '../../hooks/useExamen'
import { useAuth } from '../../context/AuthContext'
import type { EstudianteIdentificado } from '../../services/identificacionService'

/** Control de ingreso: identificar al estudiante por código universitario, CI o QR dentro de un examen. */
export default function IdentificacionPage() {
  const { roles } = useAuth()
  const navigate = useNavigate()
  const puedeContinuar = roles.some((role) => role === 'ADMIN' || role === 'CONTROL')
  const idExamen = Number(useParams().idExamen)
  const idValido = Number.isInteger(idExamen) && idExamen > 0
  const [tipo, setTipo] = useState<Mecanismo>('codigo')
  const [reinicios, setReinicios] = useState(0)
  const examen = useExamen(idExamen)
  const { busqueda, buscar, reset } = useIdentificacion(idExamen)
  const [modalVerificacionOpen, setModalVerificacionOpen] = useState(false)

  // El ojo de "Control del examen" llega con ?codigo=: se busca una sola vez por código universitario.
  const [searchParams] = useSearchParams()
  const codigoUrl = searchParams.get('codigo')?.trim() ?? ''
  const [valorInicial, setValorInicial] = useState(codigoUrl)
  const buscoCodigoUrl = useRef(false)
  useEffect(() => {
    if (buscoCodigoUrl.current || !codigoUrl || !idValido) return
    buscoCodigoUrl.current = true
    void buscar('codigo', codigoUrl)
  }, [codigoUrl, idValido, buscar])

  const cambiarMecanismo = (nuevo: Mecanismo) => {
    setTipo(nuevo)
    setValorInicial('')
    reset()
  }

  // Cambiar la key remonta el formulario con el input vacío, sin tocar el mecanismo.
  const cambiarEstudiante = () => {
    reset()
    setValorInicial('')
    setReinicios((n) => n + 1)
  }

  const regresarAControl = () => {
    navigate(`/dashboard/control/${idExamen}`)
  }

  // HABILITADO y DESHABILITADO llegan como "encontrado"; NO_VINCULADO no permite continuar.
  const estudiante = busqueda.status === 'encontrado' ? busqueda.estudiante : null

  const onContinuar = (estudianteSeleccionado: EstudianteIdentificado) => {
    navigate(`/dashboard/control-ingresos/${estudianteSeleccionado.idEstudiante}/${idExamen}`)
  }

  // Continuar siempre pasa por la verificación de habilitación (ACCS-03/04).
  const manejarContinuar = () => {
    if (estudiante) setModalVerificacionOpen(true)
  }

  return (
    <PanelLayout topBarVariant="controlMinimal" locationLabel={examen && [examen.ambienteUbicacion, examen.ambienteNombre].filter(Boolean).join(' · ')} title="CONTROL DE INGRESO" description="Identifica al estudiante por código universitario, CI o QR.">
      <div className="mx-auto w-full max-w-[76rem] px-5 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:pb-7">
        {examen && (
          <span className="mb-3 inline-flex max-w-full items-center gap-1 rounded-full border border-[#E2E6EC] bg-white px-2 py-1 text-[10px] text-[#344158] lg:hidden">
            <Building2 size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{[examen.ambienteUbicacion, examen.ambienteNombre].filter(Boolean).join(' · ')}</span>
          </span>
        )}
        <section className="overflow-hidden rounded-lg border border-[#E2E6EC] bg-white shadow-sm">
          <ControlIngresoHeader
            materia={examen?.asignatura}
            aula={examen?.ambienteNombre}
            fecha={examen?.fecha}
            hora={examen?.horaInicio}
            docente={examen?.docente}
            duracionMinutos={examen?.duracionMinutos}
            compact
          />
          {idValido ? (
            <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6">
              <MecanismoSelector value={tipo} onChange={cambiarMecanismo} />
              {tipo === 'qr' ? (
                <EscanerQr
                  key={reinicios}
                  onLeer={(codigo) => void buscar('codigo', codigo)}
                  onReescanear={cambiarEstudiante}
                />
              ) : (
                <BusquedaEstudianteForm
                  key={`${tipo}-${reinicios}`}
                  tipo={tipo}
                  buscando={busqueda.status === 'loading'}
                  valorInicial={valorInicial}
                  onBuscar={(valor) => void buscar(tipo, valor)}
                />
              )}
              <div aria-live="polite" className="flex flex-col gap-2 text-sm text-[#011140]">
                {busqueda.status !== 'idle' && busqueda.status !== 'no_vinculado' && (
                  <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-[#627A9B] before:h-px before:flex-1 before:bg-[#E1E6EF] after:h-px after:flex-1 after:bg-[#E1E6EF] sm:text-[10px]">
                    Resultado
                  </p>
                )}
                {busqueda.status === 'loading' && <p>Buscando…</p>}
                {estudiante && <ResultadoEstudianteCard estudiante={estudiante} />}
                {(busqueda.status === 'no_encontrado' || busqueda.status === 'error') && (
                  <p className="text-[#B91C1C]">{busqueda.mensaje}</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[#E1E6EF] pt-4 sm:pt-5">
                <button
                  type="button"
                  onClick={regresarAControl}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-[#F1F3F6] px-3.5 text-sm font-semibold text-[#526684] hover:bg-[#E8ECF2] sm:h-10 sm:px-4"
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  Regresar
                </button>
                <button
                  type="button"
                  disabled={!estudiante || !puedeContinuar}
                  onClick={manejarContinuar}
                  title={!puedeContinuar ? 'Se requiere el rol ADMIN o CONTROL para continuar' : undefined}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0439D9] px-3.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:px-4"
                >
                  Continuar
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
              {/* Fuera del aria-live: el diálogo se anuncia solo al recibir el foco. */}
              {busqueda.status === 'no_vinculado' && (
                <EstudianteNoVinculadoModal
                  estudiante={busqueda.estudiante}
                  idExamen={idExamen}
                  materia={examen?.asignatura}
                  aula={examen?.ambienteNombre}
                  onCerrar={cambiarEstudiante}
                />
              )}
              {modalVerificacionOpen && estudiante && (
                <VerificacionHabilitacionModal
                  estudiante={estudiante}
                  materia={examen?.asignatura}
                  aula={examen?.ambienteNombre}
                  fecha={examen?.fecha}
                  hora={examen?.horaInicio}
                  onVolver={() => setModalVerificacionOpen(false)}
                  onContinuar={() => onContinuar(estudiante)}
                />
              )}
            </div>
          ) : (
            <p className="p-6 text-sm text-[#B91C1C]">El examen indicado no es válido.</p>
          )}
        </section>
      </div>
    </PanelLayout>
  )
}
