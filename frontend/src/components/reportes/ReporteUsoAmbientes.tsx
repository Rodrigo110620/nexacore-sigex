import { useEffect, useState } from 'react'
import { reporteUsoAmbientes, type ReporteUsoAmbiente } from '../../services/usoAmbientesService'
import { formatFecha } from '../../utils/examenFormat'
import { CheckCircle2, Clock, XCircle, MapPin } from 'lucide-react'
import type { EstadoUsoAmbiente } from '../../services/usoAmbientesService'

interface Props {
  idExamen: number | null
  buscar: string
}

type Filtro = 'TODOS' | 'UTILIZADOS' | 'SIN_USO' | 'PENDIENTES'

const ESTADO: Record<EstadoUsoAmbiente, { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  UTILIZADO: { texto: 'Utilizado', clase: 'bg-[#DCFCE7] text-[#15803D]', Icono: CheckCircle2 },
  SIN_USO: { texto: 'Sin uso', clase: 'bg-[#FEE2E2] text-[#B91C1C]', Icono: XCircle },
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-[#EEF3FF] text-[#45628D]', Icono: Clock },
}

function EstadoChip({ estado }: { estado: EstadoUsoAmbiente }) {
  const { texto, clase, Icono } = ESTADO[estado] ?? ESTADO.SIN_USO
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${clase}`}>
      <Icono size={12} aria-hidden="true" /> {texto}
    </span>
  )
}

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
    d.materia.toLowerCase().includes(buscar.toLowerCase()) ||
    d.grupo.toLowerCase().includes(buscar.toLowerCase())
  )

  // 2. Filtro de estado (Utilizados / Sin Uso)
  const filtrados = filtradosBusqueda.filter((d) => {
    if (filtro === 'UTILIZADOS') return d.estado === 'UTILIZADO'
    if (filtro === 'SIN_USO') return d.estado === 'SIN_USO'
    if (filtro === 'PENDIENTES') return d.estado === 'PENDIENTE'
    return true
  })

  // 3. Contadores para los botones de filtro (basados en la búsqueda actual)
  const totalRegistros = filtradosBusqueda.length
  const totalUtilizados = filtradosBusqueda.filter((d) => d.estado === 'UTILIZADO').length
  const totalSinUso = filtradosBusqueda.filter((d) => d.estado === 'SIN_USO').length
  const totalPendientes = filtradosBusqueda.filter((d) => d.estado === 'PENDIENTE').length
  // El docente solo ve sus exámenes: si todas las filas son del mismo docente, la columna sobra.
  const variosDocentes = new Set(datos.map((d) => d.docente)).size > 1

  return (
    <section aria-label="Uso de Ambientes" className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-5">
      
      {/* Cabecera con Título, Descripción y Filtros a la derecha */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        
        {/* Título y Descripción */}
        <div>
          <h2 className="text-base font-bold text-[#011140]">Uso de Ambientes</h2>
          <p className=" max-w-2xl text-[13px] text-[#627A9B]">
            Aulas reservadas para cada examen y cuántos estudiantes ingresaron en cada una. «Pendiente»: el examen aún no termina.
          </p>
        </div>

        {/* Filtros de Estado (con contadores) */}
        <div className="flex w-full shrink-0 gap-1 overflow-x-auto rounded-lg bg-[#E9EFF8] p-1 [scrollbar-width:none] sm:w-auto sm:gap-2">
          {[
            { id: 'TODOS', texto: 'Todos', cantidad: totalRegistros },
            { id: 'UTILIZADOS', texto: 'Utilizados', cantidad: totalUtilizados },
            { id: 'SIN_USO', texto: 'Sin uso', cantidad: totalSinUso },
            ...(totalPendientes > 0 ? [{ id: 'PENDIENTES', texto: 'Pendientes', cantidad: totalPendientes }] : []),
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
          {/* VISTA DE PC (Tabla): cada dato en su columna */}
          <div className="mt-4 hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#627A9B]">
                <tr>
                  <th className="px-3 py-2">Ambiente</th>
                  <th className="px-3 py-2">Materia</th>
                  <th className="px-3 py-2">Grupo</th>
                  {variosDocentes && <th className="px-3 py-2">Docente</th>}
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Horario</th>
                  <th className="px-3 py-2 text-right">Ingresos</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, i) => (
                  <tr key={`${d.idExamen}-${d.ambiente}-${i}`} className="border-b border-[#EDF1F7] transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-3 py-2.5 font-bold text-[#011140]">
                      <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#0439D9]" aria-hidden="true" /> {d.ambiente}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.materia}</td>
                    <td className="px-3 py-2.5"><span className="rounded-md bg-[#EEF3FF] px-2 py-0.5 text-xs font-bold text-[#0439D9]">{d.grupo}</span></td>
                    {variosDocentes && <td className="px-3 py-2.5 text-[#334155]">{d.docente}</td>}
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#45628D]">{formatFecha(d.fecha)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#45628D]">{d.horaInicio.slice(0, 5)} – {d.horaFin.slice(0, 5)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {d.estado === 'PENDIENTE' ? <span className="text-[#94A3B8]">—</span> : (
                        <><span className="font-semibold text-[#011140]">{d.ingresos}</span>{d.capacidad ? <span className="text-[#94A3B8]"> / {d.capacidad}</span> : null}</>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><EstadoChip estado={d.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VISTA DE CELULAR (Tarjetas) */}
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {filtrados.map((d, i) => (
              <li key={`${d.idExamen}-${d.ambiente}-${i}`} className="flex min-w-0 flex-col rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 border-b border-[#EDF1F7] pb-3">
                  <p className="flex min-w-0 items-center gap-1.5 break-words text-sm font-bold text-[#011140]">
                    <MapPin size={16} className="shrink-0 text-[#0439D9]" aria-hidden="true" /> {d.ambiente}
                  </p>
                  <EstadoChip estado={d.estado} />
                </div>
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                  <dt className="font-semibold text-[#627A9B]">Materia</dt>
                  <dd className="min-w-0 break-words text-right font-bold text-[#011140]">{d.materia}</dd>
                  <dt className="font-semibold text-[#627A9B]">Grupo</dt>
                  <dd className="text-right font-semibold text-[#0439D9]">{d.grupo}</dd>
                  {variosDocentes && (<>
                    <dt className="font-semibold text-[#627A9B]">Docente</dt>
                    <dd className="min-w-0 break-words text-right text-[#334155]">{d.docente}</dd>
                  </>)}
                  <dt className="font-semibold text-[#627A9B]">Fecha</dt>
                  <dd className="text-right text-[#334155]">{formatFecha(d.fecha)}</dd>
                  <dt className="font-semibold text-[#627A9B]">Horario</dt>
                  <dd className="text-right tabular-nums text-[#334155]">{d.horaInicio.slice(0, 5)} – {d.horaFin.slice(0, 5)}</dd>
                  <dt className="font-semibold text-[#627A9B]">Ingresos</dt>
                  <dd className="text-right tabular-nums font-bold text-[#011140]">
                    {d.estado === 'PENDIENTE' ? '—' : `${d.ingresos}${d.capacidad ? ` / ${d.capacidad}` : ''}`}
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