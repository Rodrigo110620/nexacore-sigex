import { CircleCheck, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import type { ResumenEstudiantes } from '../../services/controlExamenService'

interface Tarjeta {
  titulo: string
  tituloMovil: string
  valor?: number
  detalle: string
  detalleMovil: string
  icono: LucideIcon
  colores: string
  badge?: boolean
  alerta?: boolean
}

/** Totales de "Control del examen": asignados, habilitados (con su % del total) y con observación. */
export default function ResumenExamenCards({ resumen }: { resumen?: ResumenEstudiantes }) {
  const porcentaje = resumen && resumen.total > 0 ? `${((resumen.habilitados / resumen.total) * 100).toFixed(1)}%` : ''
  const tarjetas: Tarjeta[] = [
    { titulo: 'Total asignados', tituloMovil: 'Total', valor: resumen?.total, detalle: 'estudiantes', detalleMovil: 'Estudiantes', icono: Users, colores: 'bg-[#E9F1FF] text-[#0439D9]' },
    { titulo: 'Habilitados', tituloMovil: 'Habilitados', valor: resumen?.habilitados, detalle: porcentaje, detalleMovil: 'Listos', icono: CircleCheck, colores: 'bg-[#DCFCE7] text-[#166534]', badge: true },
    { titulo: 'Con observación', tituloMovil: 'Observados', valor: resumen?.noHabilitados, detalle: 'Bloqueados', detalleMovil: 'Bloqueados', icono: TriangleAlert, colores: 'bg-[#FDECEC] text-[#B91C1C]', badge: true, alerta: true },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {tarjetas.map(({ titulo, tituloMovil, valor, detalle, detalleMovil, icono: Icono, colores, badge, alerta }) => (
        <section key={titulo} aria-label={titulo} className="min-w-0 rounded-lg border border-[#D8E3F5] bg-white p-2 shadow-sm sm:rounded-xl sm:p-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[8px] font-semibold uppercase tracking-wide text-[#627A9B] sm:text-[10px]"><span className="sm:hidden">{tituloMovil}</span><span className="hidden sm:inline">{titulo}</span></h2>
            <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md sm:h-6 sm:w-6 sm:rounded-lg ${colores}`}>
              <Icono size={11} className="sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 sm:mt-2 sm:gap-x-2 sm:gap-y-1">
            <span className={`text-xl font-bold sm:text-2xl ${alerta ? 'text-[#B91C1C]' : 'text-[#011140]'}`}>
              {valor ?? '—'}
            </span>
            {detalle && (
              <span className={`${alerta || !badge ? 'hidden sm:inline' : ''} ${badge ? `rounded-full px-1 py-0.5 text-[8px] font-semibold sm:px-2 sm:text-[10px] ${colores}` : 'text-xs text-[#627A9B]'}`}>
                {detalle}
              </span>
            )}
          </p>
          <p className={`text-[9px] sm:hidden ${alerta ? 'text-[#B91C1C]' : 'text-[#627A9B]'}`}>{detalleMovil}</p>
        </section>
      ))}
    </div>
  )
}
