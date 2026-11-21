import { useEffect, useState } from 'react'
import { reporteModificacionesInhabilitados, type ReporteModificacion } from '../../services/modificacionInhabilitadoService'
import { fechaHoraNumerica } from '../../utils/examenFormat'
import { Ban, CheckCircle2 } from 'lucide-react'

interface Props {
  idExamen: number | null
  buscar: string
  desde?: string
}

export default function ReporteModificaciones({ idExamen, buscar, desde }: Props) {
  const [datos, setDatos] = useState<ReporteModificacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setCargando(true)
    reporteModificacionesInhabilitados(idExamen, desde)
      .then((res) => { if (vigente) { setDatos(res); setError('') } })
      .catch(() => { if (vigente) setError('No se pudo cargar el reporte de modificaciones.') })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [idExamen, desde])

  const filtrados = datos.filter((d) =>
    !buscar || d.estudiante?.toLowerCase().includes(buscar.toLowerCase()) || d.codigoSis?.includes(buscar) || d.docente?.toLowerCase().includes(buscar.toLowerCase())
  )

  if (cargando) return <p className="mt-4 text-sm text-[#627A9B]">Consultando modificaciones…</p>
  if (error) return <div className="mt-4 text-sm text-[#B91C1C]">{error}</div>

  return (
    <section aria-label="Intentos de modificación a inhabilitados" className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-[#011140]">Intentos de modificación a inhabilitados</h2>
        <p className="text-sm font-semibold text-[#45628D]">{filtrados.length} registros</p>
      </div>
      <p className="mt-1 text-xs text-[#627A9B]">
        Historial de intentos de modificar a estudiantes que estaban NO HABILITADOS.
      </p>

      {filtrados.length === 0 ? (
        <p className="mt-6 rounded-lg bg-[#F8FAFC] p-6 text-center text-sm text-[#627A9B]">
          {buscar.trim() ? 'Ningún registro coincide con la búsqueda.' : 'No hay intentos de modificación registrados.'}
        </p>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#627A9B]">
                <tr>
                  <th className="px-3 py-2">Docente / Personal</th>
                  <th className="px-3 py-2">Estudiante</th>
                  <th className="px-3 py-2">Código SIS</th>
                  <th className="px-3 py-2">Acción</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha y hora</th>
                  <th className="px-3 py-2">Examen</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d) => (
                  <tr key={d.idAuditoria} className="border-b border-[#EDF1F7] align-top">
                    <td className="px-3 py-2.5 font-semibold text-[#011140]">{d.docente}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.estudiante}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.codigoSis}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-[#E9F1FF] px-2 py-0.5 text-[11px] font-semibold text-[#0439D9]">
                        Intentó: {d.accion}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.esFallo ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                            <Ban size={12} /> Bloqueado
                          </span>
                          <span className="text-[11px] text-[#B91C1C] max-w-[200px] truncate" title={d.motivoFallo || ''}>
                            {d.motivoFallo}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                          <CheckCircle2 size={12} /> Exitoso
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#011140]">{fechaHoraNumerica(d.fechaHora, true)}</td>
                    <td className="px-3 py-2.5 text-[#45628D]">{d.examen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Vista móvil */}
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {filtrados.map((d) => (
              <li key={d.idAuditoria} className="min-w-0 rounded-xl border border-[#E4E9F2] bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[#011140]">{d.docente}</p>
                    <p className="text-xs text-[#627A9B]">Intentó {d.accion} a {d.estudiante} ({d.codigoSis})</p>
                  </div>
                </div>
                <div className="mt-2">
                    {d.esFallo ? (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                          <Ban size={12} /> Bloqueado
                        </span>
                        <span className="text-xs text-[#B91C1C]">{d.motivoFallo}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                        <CheckCircle2 size={12} /> Exitoso
                      </span>
                    )}
                </div>
                <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-[#627A9B]">Fecha</dt><dd className="min-w-0 break-words text-right font-semibold text-[#011140]">{fechaHoraNumerica(d.fechaHora, true)}</dd>
                  <dt className="text-[#627A9B]">Examen</dt><dd className="min-w-0 break-words text-right text-[#011140]">{d.examen}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}