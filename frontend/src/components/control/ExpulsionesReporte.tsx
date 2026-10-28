import { useEffect, useState } from 'react'
import type { RegistroControlIngresoExamen } from '../../services/controlIngresoService'
import { listarExpulsionesExamen, type ExpulsionResponse } from '../../services/expulsionService'
import useEnVivo from '../../hooks/useEnVivo'
import RegistroExpulsion from './RegistroExpulsion'

interface Props {
  idExamen: number
  examen?: string
  controles: RegistroControlIngresoExamen[]
}

export default function ExpulsionesReporte({ idExamen, examen, controles }: Props) {
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<{ clave: string; registros?: ExpulsionResponse[]; error?: string }>()
  const clave = `${idExamen}|${recarga}`
  useEnVivo((cambio) => cambio.idExamen === idExamen, () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    listarExpulsionesExamen(idExamen).then((registros) => {
      if (vigente) setResultado({ clave, registros: [...new Map(registros.map((r) => [r.idExpulsion, r])).values()] })
    }).catch(() => {
      if (vigente) setResultado({ clave, error: 'No se pudieron cargar las expulsiones de la sesión actual.' })
    })
    return () => { vigente = false }
  }, [idExamen, clave])

  const actual = resultado?.clave === clave ? resultado : undefined
  // Nombre y código SIS desde los registros del control; sin ellos se muestra el identificador real.
  const nombres = new Map(controles.filter((r) => r.idExamen === idExamen).map((r) => [r.idEstudiante, r]))
  const titulo = (e: ExpulsionResponse) => {
    const r = nombres.get(e.idEstudiante)
    const nombre = e.estudiante || r?.estudiante
    const sis = e.codigoSis || r?.codigoSis
    if (!nombre) return `Estudiante #${e.idEstudiante}`
    return sis ? `${nombre} · SIS ${sis}` : nombre
  }
  return (
    <section aria-label="Expulsiones de la sesión actual" className="my-4 rounded-xl border border-[#D8E3F5] p-3">
      <h3 className="font-semibold text-[#B91C1C]">Expulsiones de la sesión actual ({actual?.registros?.length ?? '…'})</h3>
      {!actual && <p role="status" className="mt-2 text-sm text-[#627A9B]">Consultando expulsiones…</p>}
      {actual?.error && (
        <div role="alert" className="mt-2 text-sm text-[#B91C1C]">
          <p>{actual.error}</p>
          <button type="button" onClick={() => setRecarga((n) => n + 1)} className="mt-2 rounded-lg border px-3 py-2">
            Reintentar expulsiones
          </button>
        </div>
      )}
      {actual?.registros?.length === 0 && <p className="mt-2 text-sm text-[#627A9B]">No hay expulsiones en la sesión actual.</p>}
      {actual?.registros && actual.registros.length > 0 && (
        <ul className="mt-3 space-y-3">
          {actual.registros.map((registro) => (
            <li key={registro.idExpulsion} className="rounded-lg border border-[#F1C4C9] bg-[#FFF8F8] p-3">
              <h4 className="text-sm font-semibold text-[#011140]">
                {titulo(registro)}
              </h4>
              <p className="mt-1 text-xs text-[#627A9B]">{examen ?? `Examen #${registro.idExamen}`}</p>
              <RegistroExpulsion registro={registro} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
