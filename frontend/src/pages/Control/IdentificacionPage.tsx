import { useState } from 'react'
import { useParams } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MecanismoSelector from '../../components/control/MecanismoSelector'
import BusquedaEstudianteForm from '../../components/control/BusquedaEstudianteForm'
import useIdentificacion from '../../hooks/useIdentificacion'
import type { TipoIdentificacion } from '../../services/identificacionService'

/** Control de ingreso: identificar al estudiante por código universitario o CI dentro de un examen. */
export default function IdentificacionPage() {
  const idExamen = Number(useParams().idExamen)
  const idValido = Number.isInteger(idExamen) && idExamen > 0
  const [tipo, setTipo] = useState<TipoIdentificacion>('codigo')
  const { busqueda, buscar, reset } = useIdentificacion(idExamen)

  const cambiarMecanismo = (nuevo: TipoIdentificacion) => {
    setTipo(nuevo)
    reset()
  }

  return (
    <PanelLayout>
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <section className="overflow-hidden rounded-2xl border border-[#D8E3F5] bg-white shadow-sm">
          {idValido ? (
            <div className="flex flex-col gap-5 p-6">
              <MecanismoSelector value={tipo} onChange={cambiarMecanismo} />
              <BusquedaEstudianteForm
                key={tipo}
                tipo={tipo}
                buscando={busqueda.status === 'loading'}
                onBuscar={(valor) => void buscar(tipo, valor)}
              />
              {/* Placeholder simple hasta tener la tarjeta de resultado y el modal de no vinculado. */}
              <div aria-live="polite" className="text-sm text-[#011140]">
                {busqueda.status === 'loading' && <p>Buscando…</p>}
                {(busqueda.status === 'encontrado' || busqueda.status === 'no_vinculado') && (
                  <p>
                    {busqueda.estudiante.nombre} {busqueda.estudiante.apellidos} — {busqueda.estudiante.estado}
                  </p>
                )}
                {(busqueda.status === 'no_encontrado' || busqueda.status === 'error') && (
                  <p className="text-[#B91C1C]">{busqueda.mensaje}</p>
                )}
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
