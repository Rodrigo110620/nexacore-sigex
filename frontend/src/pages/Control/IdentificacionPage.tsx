import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import ControlIngresoHeader from '../../components/control/ControlIngresoHeader'
import MecanismoSelector from '../../components/control/MecanismoSelector'
import BusquedaEstudianteForm from '../../components/control/BusquedaEstudianteForm'
import ResultadoEstudianteCard from '../../components/control/ResultadoEstudianteCard'
import useIdentificacion from '../../hooks/useIdentificacion'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import type { EstudianteIdentificado, TipoIdentificacion } from '../../services/identificacionService'

/** Control de ingreso: identificar al estudiante por código universitario o CI dentro de un examen. */
export default function IdentificacionPage() {
  const idExamen = Number(useParams().idExamen)
  const idValido = Number.isInteger(idExamen) && idExamen > 0
  const [tipo, setTipo] = useState<TipoIdentificacion>('codigo')
  const [reinicios, setReinicios] = useState(0)
  const [examen, setExamen] = useState<ExamenDto>()
  const { busqueda, buscar, reset } = useIdentificacion(idExamen)

  // TODO: no hay GET /examenes/{id}; mientras tanto se busca en el listado (CONTROL tiene acceso).
  useEffect(() => {
    if (!idValido) return
    let vigente = true
    listarExamenes()
      .then((examenes) => {
        if (vigente) setExamen(examenes.find((e) => e.idExamen === idExamen))
      })
      .catch(() => undefined) // sin datos, el encabezado muestra "—"
    return () => {
      vigente = false
    }
  }, [idExamen, idValido])

  const cambiarMecanismo = (nuevo: TipoIdentificacion) => {
    setTipo(nuevo)
    reset()
  }

  // Cambiar la key remonta el formulario con el input vacío, sin tocar el mecanismo.
  const cambiarEstudiante = () => {
    reset()
    setReinicios((n) => n + 1)
  }

  // HABILITADO y DESHABILITADO llegan como "encontrado"; NO_VINCULADO no permite continuar.
  const estudiante = busqueda.status === 'encontrado' ? busqueda.estudiante : null

  // TODO(Fernando): abrir aquí el modal de verificación (UI 2); si está DESHABILITADO muestra el motivo.
  const onContinuar = (_estudiante: EstudianteIdentificado) => {}

  return (
    <PanelLayout>
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
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
              <BusquedaEstudianteForm
                key={`${tipo}-${reinicios}`}
                tipo={tipo}
                buscando={busqueda.status === 'loading'}
                onBuscar={(valor) => void buscar(tipo, valor)}
              />
              <div aria-live="polite" className="flex flex-col gap-3 text-sm text-[#011140]">
                {busqueda.status !== 'idle' && (
                  <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[#627A9B] before:h-px before:flex-1 before:bg-[#D8E3F5] after:h-px after:flex-1 after:bg-[#D8E3F5]">
                    Resultado
                  </p>
                )}
                {busqueda.status === 'loading' && <p>Buscando…</p>}
                {estudiante && <ResultadoEstudianteCard estudiante={estudiante} />}
                {/* Placeholder hasta el modal de no vinculado. */}
                {busqueda.status === 'no_vinculado' && (
                  <p>
                    {busqueda.estudiante.nombre} {busqueda.estudiante.apellidos} — {busqueda.estudiante.estado}
                  </p>
                )}
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
                  disabled={!estudiante}
                  onClick={() => estudiante && onContinuar(estudiante)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <p className="p-6 text-sm text-[#B91C1C]">El examen indicado no es válido.</p>
          )}
        </section>
      </div>
    </PanelLayout>
  )
}
