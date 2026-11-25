import { useEffect, useState } from 'react'
import { reporteUsoAmbientes, type ReporteUsoAmbiente } from '../../services/usoAmbientesService'
import { formatFecha } from '../../utils/examenFormat'
import { CheckCircle2, XCircle, MapPin } from 'lucide-react'

interface Props {
  idExamen: number | null
  buscar: string
}

type Filtro = 'TODOS' | 'UTILIZADOS' | 'SIN_USO'

export default function ReporteUsoAmbientes({ idExamen, buscar }: Props) {
  const [resultado, setResultado] = useState<{ clave: string; datos?: ReporteUsoAmbiente[]; error?: string }>()
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  
  const clave = `${idExamen ?? 'todos'}`

  useEffect(() => {
    let vigente = true
    reporteUsoAmbientes(idExamen)
      .then((res) => { if (vigente) setResultado({ clave, datos: res }) })
      .catch(() => { if (vigente) setResultado({ clave, error: 'No se pudo cargar el reporte de ambientes.' }) })
    return () => { vigente = false }
  }, [idExamen, clave])

  const actual = resultado?.clave === clave ? resultado : undefined

  if (!actual) return <p className="mt-4 text-sm text-[#627A9B]">Consultando ambientes…</p>
  if (actual.error) return <div className="mt-4 text-sm text-[#B91C1C]">{actual.error}</div>

  const datos = actual.datos ?? []

  // 1. Filtro de búsqueda (texto)
  const filtradosBusqueda = datos.filter((d) =>
    !buscar || 
    d.ambiente.toLowerCase().includes(buscar.toLowerCase()) || 
    d.docente.toLowerCase().includes(buscar.toLowerCase()) ||
    d.materiaGrupo.toLowerCase().includes(buscar.toLowerCase())
  )

  // 2. Filtro de estado (Utilizados / Sin Uso)
  const filtrados = filtradosBusqueda.filter((d) => {
    if (filtro === 'UTILIZADOS') return d.utilizado
    if (filtro === 'SIN_USO') return !d.utilizado
    return true
  })

  // 3. Contadores para los botones de filtro (basados en la búsqueda actual)
  const totalRegistros = filtradosBusqueda.length
  const totalUtilizados = filtradosBusqueda.filter(d => d.utilizado).length
  const totalSinUso = filtradosBusqueda.filter(d => !d.utilizado).length

  return (
    <section aria-label="Uso de Ambientes" className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-5">
      
      {/* Cabecera con Título, Descripción y Filtros a la derecha */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        
        {/* Título y Descripción */}
        <div>
          <h2 className="text-base font-bold text-[#011140]">Uso de Ambientes</h2>
          <p className=" max-w-2xl text-[13px] text-[#627A9B]">
            Historial de aulas, laboratorios y auditorios reservados para exámenes, y si se registraron ingresos en ellos.
          </p>
        </div>

        {/* Filtros de Estado (con contadores) */}
        <div className="flex w-full shrink-0 gap-1 overflow-x-auto rounded-lg bg-[#E9EFF8] p-1 [scrollbar-width:none] sm:w-auto sm:gap-2">
          {[
            { id: 'TODOS', texto: 'Todos', cantidad: totalRegistros },
            { id: 'UTILIZADOS', texto: 'Utilizados', cantidad: totalUtilizados },
            { id: 'SIN_USO', texto: 'Sin Uso', cantidad: totalSinUso }
          ].map(({ id, texto, cantidad }) => {
            const activo = filtro === id;
            return (
              <button 
                key={id} 
                type="button" 
                onClick={() => setFiltro(id as Filtro)}
                className={`flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none sm:text-[13px] ${
                  activo ? 'bg-white text-[#0439D9] shadow-sm' : 'text-[#627A9B] hover:text-[#011140]'
                }`}
              >
                {texto}
                <span className={`inline-grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold ${
                  activo ? 'bg-[#0439D9] text-white' : 'bg-[#D8E3F5] text-[#45628D]'
                }`}>
                  {cantidad}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="mt-6 rounded-lg bg-[#F8FAFC] p-6 text-center text-sm text-[#627A9B]">
          No hay ambientes que coincidan con la búsqueda o el filtro.
        </p>
      ) : (
        <>
          {/* VISTA DE PC (Tabla) */}
          <div className="mt-4 hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#627A9B]">
                <tr>
                  <th className="px-3 py-2">Ambiente</th>
                  <th className="px-3 py-2">Docente</th>
                  <th className="px-3 py-2">Examen / Materia</th>
                  <th className="px-3 py-2">Fecha y hora</th>
                  <th className="px-3 py-2">Ingresos</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, i) => (
                  <tr key={`${d.idExamen}-${d.ambiente}-${i}`} className="border-b border-[#EDF1F7] transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-3 py-2.5 font-bold text-[#011140]">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#0439D9]" /> {d.ambiente}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.docente}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.materiaGrupo}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#45628D]">
                      {formatFecha(d.fecha)} · {d.horaInicio.slice(0, 5)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[#011140]">{d.ingresos} est.</td>
                    <td className="px-3 py-2.5">
                      {d.utilizado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                          <CheckCircle2 size={12} /> Utilizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                          <XCircle size={12} /> Sin uso
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VISTA DE CELULAR (Tarjetas) */}
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {filtrados.map((d, i) => (
              <li key={`${d.idExamen}-${d.ambiente}-${i}`} className="relative flex flex-col min-w-0 rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm transition-all hover:shadow-md">
                
                {/* Cabecera: Ambiente y Estado */}
                <div className="flex items-start justify-between gap-2 border-b border-[#EDF1F7] pb-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-[#011140] flex items-center gap-1.5">
                      <MapPin size={16} className="text-[#0439D9]" /> {d.ambiente}
                    </p>
                    <p className="mt-1 text-xs text-[#627A9B]">{d.docente}</p>
                  </div>
                  <div className="shrink-0">
                    {d.utilizado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                        <CheckCircle2 size={12} /> Utilizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                        <XCircle size={12} /> Sin uso
                      </span>
                    )}
                  </div>
                </div>

                {/* Datos */}
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                  <dt className="font-semibold text-[#627A9B]">Examen</dt>
                  <dd className="min-w-0 text-right break-words font-bold text-[#011140]">
                    {d.materiaGrupo}
                  </dd>
                  
                  <dt className="font-semibold text-[#627A9B]">Fecha</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-[#334155]">
                    {formatFecha(d.fecha)} · {d.horaInicio.slice(0, 5)}
                  </dd>
                  
                  <dt className="font-semibold text-[#627A9B]">Ingresos</dt>
                  <dd className="min-w-0 break-words text-right font-bold text-[#0F766E]">
                    {d.ingresos} estudiantes
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