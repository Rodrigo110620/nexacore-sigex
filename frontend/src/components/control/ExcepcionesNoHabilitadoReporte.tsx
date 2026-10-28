import { useEffect, useState } from 'react'
import useEnVivo from '../../hooks/useEnVivo'
import { listarExcepcionesNoHabilitado, type ExcepcionNoHabilitado } from '../../services/excepcionNoHabilitadoService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

/**
 * INCI-04: reporte de excepciones de estudiantes no habilitados que intentaron ingresar (sesión
 * actual del examen): estudiante, motivo, acción tomada, observaciones, aula, quién y cuándo. Se
 * actualiza en vivo cuando el control registra una nueva.
 */
export default function ExcepcionesNoHabilitadoReporte({ idExamen }: { idExamen: number }) {
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<{ clave: string; registros?: ExcepcionNoHabilitado[]; error?: string }>()
  const clave = `${idExamen}|${recarga}`
  useEnVivo((cambio) => cambio.idExamen === idExamen, () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    listarExcepcionesNoHabilitado(idExamen)
      .then((registros) => { if (vigente) setResultado({ clave, registros }) })
      .catch(() => { if (vigente) setResultado({ clave, error: 'No se pudieron cargar las excepciones de no habilitados.' }) })
    return () => { vigente = false }
  }, [idExamen, clave])

  const actual = resultado?.clave === clave ? resultado : undefined
  return (
    <section aria-label="Excepciones de no habilitados" className="my-4 rounded-xl border border-[#D8E3F5] p-3">
      <h3 className="font-semibold text-[#92400E]">No habilitados que intentaron ingresar ({actual?.registros?.length ?? '…'})</h3>
      {!actual && <p role="status" className="mt-2 text-sm text-[#627A9B]">Consultando excepciones…</p>}
      {actual?.error && (
        <div role="alert" className="mt-2 text-sm text-[#B91C1C]">
          <p>{actual.error}</p>
          <button type="button" onClick={() => setRecarga((n) => n + 1)} className="mt-2 rounded-lg border px-3 py-2">
            Reintentar excepciones
          </button>
        </div>
      )}
      {actual?.registros?.length === 0 && <p className="mt-2 text-sm text-[#627A9B]">No hay excepciones de no habilitados en la sesión actual.</p>}
      {actual?.registros && actual.registros.length > 0 && (
        <ul className="mt-3 space-y-3">
          {actual.registros.map((x) => (
            <li key={x.idExcepcion} className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3">
              <h4 className="text-sm font-semibold text-[#011140]">
                {x.estudiante ?? `Estudiante #${x.idEstudiante}`}{x.codigoSis ? ` · SIS ${x.codigoSis}` : ''}
              </h4>
              <dl className="mt-1 grid gap-x-3 gap-y-0.5 text-xs text-[#45628D] sm:grid-cols-[auto_1fr]">
                <dt className="font-semibold">Motivo</dt><dd>{x.motivoInhabilitacion}</dd>
                <dt className="font-semibold">Acción tomada</dt><dd>{x.accionTomada}</dd>
                {x.observaciones && <><dt className="font-semibold">Observaciones</dt><dd>{x.observaciones}</dd></>}
                {x.ambiente && <><dt className="font-semibold">Aula</dt><dd>{x.ambiente}</dd></>}
                <dt className="font-semibold">Registró</dt><dd>{x.registradoPor ?? '—'}</dd>
                <dt className="font-semibold">Fecha y hora (Bolivia)</dt><dd>{fechaHoraNumerica(x.fechaHora)}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
