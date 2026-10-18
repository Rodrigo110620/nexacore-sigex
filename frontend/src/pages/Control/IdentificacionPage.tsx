import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import ControlIngresoHeader from '../../components/control/ControlIngresoHeader'
import MecanismoSelector, { type Mecanismo } from '../../components/control/MecanismoSelector'
import BusquedaEstudianteForm from '../../components/control/BusquedaEstudianteForm'
import EscanerQr from '../../components/control/EscanerQr'
import { DURACION_MINIMA_VERIFICACION_MS } from '../../hooks/useEscanerQr'
import ResultadoEstudianteCard from '../../components/control/ResultadoEstudianteCard'
import EstudianteNoVinculadoModal from '../../components/control/EstudianteNoVinculadoModal'
import VerificacionHabilitacionModal from '../../components/control/VerificacionHabilitacionModal'
import QrInvalidoModal from '../../components/control/QrInvalidoModal'
import useIdentificacion from '../../hooks/useIdentificacion'
import useExamen from '../../hooks/useExamen'
import { useAuth } from '../../context/AuthContext'
import { identificarEstudiante, type EstudianteIdentificado } from '../../services/identificacionService'
import { isNetworkError, isOffline } from '../../utils/examFormUtils'

const SIN_CONEXION_VERIFICAR =
  'Sin conexión a Internet: no se pudo verificar la habilitación del estudiante. No se confirma ningún estado; vuelve a presionar Continuar cuando recuperes la conexión.'
const SIN_CONEXION_CONTINUAR =
  'Sin conexión a Internet: no es posible continuar con el control de ingreso. Los datos del estudiante y del examen se conservan; vuelve a presionar Continuar cuando recuperes la conexión.'

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
  const { busqueda, buscar, buscarQr, reset } = useIdentificacion(idExamen)
  const [modalVerificacionOpen, setModalVerificacionOpen] = useState(false)
  // Estado de habilitación consultado de nuevo al presionar Continuar (ACCS-03): nunca se asume.
  const [estudianteVerificado, setEstudianteVerificado] = useState<EstudianteIdentificado | null>(null)
  const [verificando, setVerificando] = useState(false)
  // El aviso queda ligado al estudiante con el que se intentó continuar; otra búsqueda lo oculta.
  const [errorVerificacion, setErrorVerificacion] = useState<{ para: EstudianteIdentificado; mensaje: string } | null>(null)
  const [errorContinuar, setErrorContinuar] = useState<string | null>(null)
  const [qrInvalidoOpen, setQrInvalidoOpen] = useState(false)
  const lecturaQrActual = useRef(0)
  useEffect(() => () => { lecturaQrActual.current += 1 }, [])

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

  const limpiarVerificacion = () => {
    lecturaQrActual.current += 1
    setModalVerificacionOpen(false)
    setEstudianteVerificado(null)
    setErrorVerificacion(null)
    setErrorContinuar(null)
  }

  const cambiarMecanismo = (nuevo: Mecanismo) => {
    setTipo(nuevo)
    setValorInicial('')
    limpiarVerificacion()
    setQrInvalidoOpen(false)
    reset()
  }

  // Cambiar la key remonta el formulario con el input vacío, sin tocar el mecanismo.
  const cambiarEstudiante = () => {
    limpiarVerificacion()
    reset()
    setValorInicial('')
    setQrInvalidoOpen(false)
    setReinicios((n) => n + 1)
  }

  const regresarAControl = () => {
    navigate(`/dashboard/control/${idExamen}`)
  }

  // HABILITADO y DESHABILITADO llegan como "encontrado"; NO_VINCULADO no permite continuar.
  const estudiante = busqueda.status === 'encontrado' ? busqueda.estudiante : null

  // Sin conexión no se pasa al control de ingreso: se queda en la verificación con sus datos.
  const onContinuar = (estudianteSeleccionado: EstudianteIdentificado) => {
    if (isOffline()) {
      setErrorContinuar(SIN_CONEXION_CONTINUAR)
      return
    }
    setErrorContinuar(null)
    navigate(`/dashboard/control-ingresos/${estudianteSeleccionado.idEstudiante}/${idExamen}`)
  }

  // Continuar siempre pasa por la verificación de habilitación (ACCS-03/04), consultada otra vez al servidor.
  const manejarContinuar = async () => {
    if (!estudiante || verificando) return
    setErrorVerificacion(null)
    if (isOffline()) {
      setErrorVerificacion({ para: estudiante, mensaje: SIN_CONEXION_VERIFICAR })
      return
    }
    setVerificando(true)
    try {
      setEstudianteVerificado(await identificarEstudiante(idExamen, 'codigo', estudiante.codigoSis))
      setErrorContinuar(null)
      setModalVerificacionOpen(true)
    } catch (error) {
      setErrorVerificacion({
        para: estudiante,
        mensaje: isNetworkError(error)
          ? SIN_CONEXION_VERIFICAR
          : 'No se pudo verificar la habilitación del estudiante. Intenta de nuevo.',
      })
    } finally {
      setVerificando(false)
    }
  }

  const manejarQrLeido = async (contenido: string) => {
    const lectura = ++lecturaQrActual.current
    const inicioVerificacion = Date.now()
    const resultado = await buscarQr(contenido)
    const restante = DURACION_MINIMA_VERIFICACION_MS - (Date.now() - inicioVerificacion)
    if (restante > 0) await new Promise<void>((resolver) => setTimeout(resolver, restante))
    if (lectura !== lecturaQrActual.current) return
    if (resultado === 'invalido') setQrInvalidoOpen(true)
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
                  onLeer={manejarQrLeido}
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
                {busqueda.status !== 'idle' && busqueda.status !== 'no_vinculado' && busqueda.status !== 'qr_invalido' && (
                  <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-[#627A9B] before:h-px before:flex-1 before:bg-[#E1E6EF] after:h-px after:flex-1 after:bg-[#E1E6EF] sm:text-[10px]">
                    Resultado
                  </p>
                )}
                {busqueda.status === 'loading' && <p>Buscando…</p>}
                {estudiante && <ResultadoEstudianteCard estudiante={estudiante} />}
                {(busqueda.status === 'no_encontrado' || busqueda.status === 'error') && (
                  <p role="alert" className="text-[#B91C1C]">{busqueda.mensaje}</p>
                )}
                {estudiante && errorVerificacion?.para === estudiante && (
                  <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{errorVerificacion.mensaje}</p>
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
                  disabled={!estudiante || !puedeContinuar || verificando}
                  aria-busy={verificando}
                  onClick={() => void manejarContinuar()}
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
              {modalVerificacionOpen && estudianteVerificado && (
                <VerificacionHabilitacionModal
                  estudiante={estudianteVerificado}
                  materia={examen?.asignatura}
                  aula={examen?.ambienteNombre}
                  fecha={examen?.fecha}
                  hora={examen?.horaInicio}
                  onVolver={() => {
                    setModalVerificacionOpen(false)
                    setErrorContinuar(null)
                  }}
                  onContinuar={() => onContinuar(estudianteVerificado)}
                  errorContinuar={errorContinuar}
                />
              )}
              {qrInvalidoOpen && <QrInvalidoModal onReintentar={cambiarEstudiante} />}
            </div>
          ) : (
            <p className="p-6 text-sm text-[#B91C1C]">El examen indicado no es válido.</p>
          )}
        </section>
      </div>
    </PanelLayout>
  )
}
