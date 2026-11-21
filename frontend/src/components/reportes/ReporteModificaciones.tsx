
import { useEffect, useState } from 'react'
import {
  reporteModificacionesInhabilitados,
  type ReporteModificacion,
} from '../../services/modificacionInhabilitadoService'
import { fechaHoraNumerica } from '../../utils/examenFormat'
import { Ban, CheckCircle2 } from 'lucide-react'

interface Props {
  idExamen: number | null
  buscar: string
  desde?: string
}

export default function ReporteModificaciones({ idExamen, buscar, desde }: Props) {
  const [resultado, setResultado] = useState<{
    clave: string
    datos?: ReporteModificacion[]
    error?: string
  }>()

  const clave = `${idExamen ?? 'todos'}|${desde ?? ''}`

  useEffect(() => {
    let vigente = true

    reporteModificacionesInhabilitados(idExamen, desde)
      .then((res) => {
        if (vigente) {
          setResultado({ clave, datos: res })
        }
      })
      .catch(() => {
        if (vigente) {
          setResultado({
            clave,
            error: 'No se pudo cargar el reporte de modificaciones.',
          })
        }
      })

    return () => {
      vigente = false
    }
  }, [idExamen, desde, clave])

  // Solo mostramos el resultado si corresponde al examen y período actuales.
  const actual = resultado?.clave === clave ? resultado : undefined

  if (!actual) {
    return (
      <p className="mt-4 text-sm text-[#627A9B]">
        Consultando modificaciones…
      </p>
    )
  }

  if (actual.error) {
    return (
      <div className="mt-4 text-sm text-[#B91C1C]">
        {actual.error}
      </div>
    )
  }

  const datos = actual.datos ?? []

  const filtrados = datos.filter((d) =>
    !buscar ||
    d.estudiante?.toLowerCase().includes(buscar.toLowerCase()) ||
    d.codigoSis?.includes(buscar) ||
    d.docente?.toLowerCase().includes(buscar.toLowerCase())
  )

  return (
    <section
      aria-label="Intentos de modificación a inhabilitados"
      className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-[#011140]">
          Intentos de modificación a inhabilitados
        </h2>
        <p className="text-sm font-semibold text-[#45628D]">
          {filtrados.length} registros
        </p>
      </div>

      <p className="mt-1 text-xs text-[#627A9B]">
        Historial de intentos de modificar a estudiantes que estaban NO HABILITADOS.
      </p>

      {filtrados.length === 0 ? (
        <p className="mt-6 rounded-lg bg-[#F8FAFC] p-6 text-center text-sm text-[#627A9B]">
          {buscar.trim()
            ? 'Ningún registro coincide con la búsqueda.'
            : 'No hay intentos de modificación registrados.'}
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
                  <tr
                    key={d.idAuditoria}
                    className="border-b border-[#EDF1F7] align-top"
                  >
                    <td className="px-3 py-2.5 font-semibold text-[#011140]">
                      {d.docente}
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">
                      {d.estudiante}
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">
                      {d.codigoSis}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-[#E9F1FF] px-2 py-0.5 text-[11px] font-semibold text-[#0439D9]">
                        Intentó: {d.accion}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.esFallo ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                            <Ban size={12} /> Bloqueado
                          </span>
                          <span
                            className="max-w-[200px] truncate text-[11px] text-[#B91C1C]"
                            title={d.motivoFallo || ''}
                          >
                            {d.motivoFallo}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                          <CheckCircle2 size={12} /> Exitoso
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#011140]">
                      {fechaHoraNumerica(d.fechaHora, true)}
                    </td>
                    <td className="px-3 py-2.5 text-[#45628D]">
                      {d.examen}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

                    {/* Vista móvil */}
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {filtrados.map((d) => (
              <li
                key={d.idAuditoria}
                className="relative flex flex-col min-w-0 rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                {/* Cabecera: Docente y Estudiante */}
                <div className="flex items-start justify-between gap-2 border-b border-[#EDF1F7] pb-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-[#011140]">
                      {d.docente}
                    </p>
                    <p className="mt-1 text-xs text-[#45628D]">
                      Intentó <span className="font-semibold text-[#B91C1C]">{d.accion}</span> a:
                    </p>
                    <p className="break-words text-sm font-semibold text-[#011140]">
                      {d.estudiante} <span className="inline-block rounded bg-[#E9F1FF] px-1.5 py-0.5 text-[10px] font-bold text-[#0439D9]">{d.codigoSis}</span>
                    </p>
                  </div>
                </div>

                {/* Detalle del fallo o éxito */}
                <div className="mt-3">
                  {d.esFallo ? (
                    <div className="rounded-lg border-l-4 border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#991B1B]">
                        <Ban size={12} /> Bloqueado
                      </span>
                      <p className="mt-1 break-words text-xs font-medium text-[#991B1B]">
                        {d.motivoFallo}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border-l-4 border-[#0a5626] bg-[#F0FDF4] px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#166534]">
                        <CheckCircle2 size={12} /> Exitoso
                      </span>
                    </div>
                  )}
                </div>

                {/* Fecha y Examen */}
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                  <dt className="font-semibold text-[#627A9B]">Fecha</dt>
                  <dd className={`min-w-0 break-words text-right font-bold ${d.esFallo ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                    {fechaHoraNumerica(d.fechaHora, true)}
                  </dd>

                  <dt className="font-semibold text-[#627A9B]">Examen</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-[#011140]">
                    {d.examen}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
