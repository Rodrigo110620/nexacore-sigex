import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
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
    <PanelLayout title="CONTROL DE INGRESO" description="Identifica al estudiante por código universitario, CI o QR.">
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/control/${idExamen}`)}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#D8E3F5] bg-white px-4 py-2.5 text-sm font-semibold text-[#627A9B] hover:bg-[#F1F6FF]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al examen
        </button>
        <section className="overflow-hidden rounded-2xl border border-[#D8E3F5] bg-white shadow-sm">
          <ControlIngresoHeader
            materia={examen?.asignatura}
            aula={examen?.ambienteNombre}
            fecha={examen?.fecha}
            hora={examen?.horaInicio}
          />
          {idValido ? (
            <div className="flex flex-col gap-5 p-6">
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
              <div aria-live="polite" className="flex flex-col gap-3 text-sm text-[#011140]">
                {busqueda.status !== 'idle' && busqueda.status !== 'no_vinculado' && (
                  <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[#627A9B] before:h-px before:flex-1 before:bg-[#D8E3F5] after:h-px after:flex-1 after:bg-[#D8E3F5]">
                    Resultado
                  </p>
                )}
                {busqueda.status === 'loading' && <p>Buscando…</p>}
                {estudiante && <ResultadoEstudianteCard estudiante={estudiante} />}
                {(busqueda.status === 'no_encontrado' || busqueda.status === 'error') && (
                  <p className="text-[#B91C1C]">{busqueda.mensaje}</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[#D8E3F5] pt-5">
                <button
                  type="button"
                  onClick={cambiarEstudiante}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D8E3F5] bg-white px-4 py-2.5 text-sm font-semibold text-[#627A9B] hover:bg-[#F1F6FF]"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Cambiar estudiante
                </button>
                <button
                  type="button"
                  disabled={!estudiante || !puedeContinuar}
                  onClick={manejarContinuar}
                  title={!puedeContinuar ? 'Se requiere el rol ADMIN o CONTROL para continuar' : undefined}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                  <ArrowRight size={16} aria-hidden="true" />
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
