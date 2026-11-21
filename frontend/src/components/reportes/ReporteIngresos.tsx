import { useEffect, useState } from 'react'
import { reporteIngresos, type ReporteIngreso } from '../../services/ingresoService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

interface Props {
  idExamen: number | null
  buscar: string
  tipo: 'QR' | 'MANUAL'
}

export default function ReporteIngresos({ idExamen, buscar, tipo }: Props) {
  const [resultado, setResultado] = useState<{
    clave: string
    datos?: ReporteIngreso[]
    error?: string
  }>()

  const clave = `${idExamen ?? 'todos'}`

  useEffect(() => {
    let vigente = true

    reporteIngresos(idExamen)
      .then((res) => {
        if (vigente) {
          setResultado({ clave, datos: res })
        }
      })
      .catch(() => {
        if (vigente) {
          setResultado({ clave, error: 'No se pudo cargar el reporte de ingresos.' })
        }
      })

    return () => {
      vigente = false
    }
  }, [idExamen, clave])

  const actual = resultado?.clave === clave ? resultado : undefined

  if (!actual) {
    return <p className="mt-4 text-sm text-[#627A9B]">Consultando ingresos…</p>
  }

  if (actual.error) {
    return <div className="mt-4 text-sm text-[#B91C1C]">{actual.error}</div>
  }

  const datos = actual.datos ?? []

  // Filtramos por el tipo de pestaña (QR = NORMAL, MANUAL = MANUAL)
  const filtradosPorTipo = datos.filter((d) => tipo === 'QR' ? d.tipoIngreso === 'NORMAL' : d.tipoIngreso === 'MANUAL')
  
  const filtrados = filtradosPorTipo.filter((d) =>
    !buscar || d.estudiante.toLowerCase().includes(buscar.toLowerCase()) || d.codigoSis.includes(buscar)
  )

  return (
    <section aria-label={`Ingresos por ${tipo}`} className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-[#011140]">
          {tipo === 'QR' ? 'Ingresos por QR' : 'Ingresos Manuales'}
        </h2>
        <p className="text-sm font-semibold text-[#45628D]">{filtrados.length} registros</p>
      </div>
      <p className="mt-1 text-xs text-[#627A9B]">
        {tipo === 'QR'
          ? 'Historial de ingresos verificados con identificación QR.'
          : 'Historial de ingresos registrados manualmente por el personal de control.'}
      </p>

      {filtrados.length === 0 ? (
        <p className="mt-6 rounded-lg bg-[#F8FAFC] p-6 text-center text-sm text-[#627A9B]">
          No hay ingresos {tipo === 'QR' ? 'por QR' : 'manuales'} registrados.
        </p>
      ) : (
        <>
          {/* VISTA DE PC (Tabla) */}
          <div className="mt-4 hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#627A9B]">
                <tr>
                  <th className="px-3 py-2">Estudiante</th>
                  <th className="px-3 py-2">Código SIS</th>
                  <th className="px-3 py-2">Examen</th>
                  <th className="px-3 py-2">Controlador</th>
                  <th className="px-3 py-2">Fecha y hora</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d) => (
                  <tr key={d.idControl} className="border-b border-[#EDF1F7]">
                    <td className="px-3 py-2.5 font-semibold text-[#011140]">{d.estudiante}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.codigoSis}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.examen}</td>
                    <td className="px-3 py-2.5 text-[#45628D]">{d.controlador}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#011140]">{fechaHoraNumerica(d.fechaHora, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VISTA DE CELULAR (Tarjetas) */}
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {filtrados.map((d) => (
              <li key={d.idControl} className="relative flex flex-col min-w-0 rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm transition-all hover:shadow-md">
                
                {/* Cabecera: Estudiante, SIS y Tipo */}
                <div className="flex items-start justify-between gap-2 border-b border-[#EDF1F7] pb-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-[#011140]">{d.estudiante}</p>
                    <p className="mt-1 inline-block rounded bg-[#E9F1FF] px-1.5 py-0.5 text-[11px] font-bold text-[#0439D9]">
                      SIS {d.codigoSis}
                    </p>
                  </div>
                  
                  {/* Etiqueta de Tipo (QR o Manual) */}
                  <div className="shrink-0">
                    {d.tipoIngreso === 'NORMAL' ? (
                      <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                        QR
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
                        Manual
                      </span>
                    )}
                  </div>
                </div>

                {/* Examen y Controlador */}
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                  <dt className="font-semibold text-[#627A9B]">Examen</dt>
                  <dd className="min-w-0 text-right break-words font-bold text-[#011140]">
                    {d.examen}
                  </dd>
                  
                  <dt className="font-semibold text-[#627A9B]">Controló</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-[#334155]">
                    {d.controlador}
                  </dd>
                  
                  <dt className="font-semibold text-[#627A9B]">Fecha</dt>
                  <dd className="min-w-0 break-words text-right font-bold text-[#0F766E]"> {/* Color verde azulado para indicar que fue exitoso */}
                    {fechaHoraNumerica(d.fechaHora, true)}
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