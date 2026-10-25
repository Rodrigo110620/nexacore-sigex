import { useEffect, useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import { listarSesionesExamen, type SesionExamen } from '../../services/examenService'
import { formatFecha, horaCorta } from '../../utils/examenFormat'

interface Props {
  idExamen: number
  idParalelo: number
  /** Cambia tras reprogramar, para volver a cargar el historial. */
  recarga?: number
}

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })

/** Sesiones anteriores de un examen reprogramado. No muestra nada si nunca se reprogramó. */
export default function HistorialSesiones({ idExamen, idParalelo, recarga = 0 }: Props) {
  const [sesiones, setSesiones] = useState<SesionExamen[]>([])
  const [abierta, setAbierta] = useState<number | null>(null)

  useEffect(() => {
    let vigente = true
    listarSesionesExamen(idExamen, idParalelo)
      .then((lista) => { if (vigente) setSesiones(lista) })
      .catch(() => { if (vigente) setSesiones([]) })
    return () => { vigente = false }
  }, [idExamen, idParalelo, recarga])

  if (sesiones.length === 0) return null

  return (
    <section className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:px-5" aria-labelledby="historial-sesiones">
      <h2 id="historial-sesiones" className="flex items-center gap-2 text-sm font-bold text-[#011140]">
        <History size={16} aria-hidden="true" /> Historial de sesiones
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {sesiones.map((s) => {
          const expandida = abierta === s.numero
          return (
            <li key={s.numero} className="rounded-xl border border-[#E8EEF7]">
              <button type="button" onClick={() => setAbierta(expandida ? null : s.numero)} aria-expanded={expandida}
                className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-[#F8FAFC]">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#011140]">
                    Sesión {s.numero} · {formatFecha(s.fecha)} · {horaCorta(s.horaInicio)} · {s.duracionMinutos} min{s.ambiente ? ` · ${s.ambiente}` : ''}
                  </span>
                  <span className="block text-xs text-[#45628D]">
                    Ingresaron {s.ingresaron} de {s.asociados} · Reprogramado{s.reprogramadoPor ? ` por ${s.reprogramadoPor}` : ''} el {fechaHora(s.cerradaEn)}
                  </span>
                  <span className="block text-xs text-[#627A9B]">Motivo: {s.motivoReprogramacion}</span>
                </span>
                <ChevronDown size={16} className={`mt-1 shrink-0 text-[#627A9B] transition-transform ${expandida ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {expandida && (
                <ul className="border-t border-[#E8EEF7] px-3 py-2 text-xs">
                  {s.estudiantes.map((e) => (
                    <li key={e.idEstudiante} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-[#F1F4F9] py-1.5 last:border-b-0">
                      <span className="font-medium text-[#011140]">{e.nombre} <span className="text-[#627A9B]">({e.codigoSis})</span></span>
                      <span className={e.fechaHoraIngreso ? 'text-[#15803D]' : e.habilitado === false ? 'text-[#B91C1C]' : 'text-[#627A9B]'}>
                        {e.fechaHoraIngreso
                          ? `Ingresó ${fechaHora(e.fechaHoraIngreso)}${e.aulaIngreso ? ` · ${e.aulaIngreso}` : ''}`
                          : e.habilitado === false ? 'No habilitado' : 'No se presentó'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
