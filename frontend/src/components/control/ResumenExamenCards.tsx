import { CircleCheck, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import type { ResumenEstudiantes } from '../../services/controlExamenService'

interface Tarjeta {
  titulo: string
  valor?: number
  detalle: string
  icono: LucideIcon
  colores: string
  badge?: boolean
  alerta?: boolean
}

/** Totales de "Control del examen": asignados, habilitados (con su % del total) y con observación. */
export default function ResumenExamenCards({ resumen }: { resumen?: ResumenEstudiantes }) {
  const porcentaje = resumen && resumen.total > 0 ? `${((resumen.habilitados / resumen.total) * 100).toFixed(1)}%` : ''
  const tarjetas: Tarjeta[] = [
    { titulo: 'Total asignados', valor: resumen?.total, detalle: 'estudiantes', icono: Users, colores: 'bg-[#E9F1FF] text-[#0439D9]' },
    { titulo: 'Habilitados', valor: resumen?.habilitados, detalle: porcentaje, icono: CircleCheck, colores: 'bg-[#DCFCE7] text-[#166534]', badge: true },
    { titulo: 'Con observación', valor: resumen?.noHabilitados, detalle: 'Bloqueados', icono: TriangleAlert, colores: 'bg-[#FDECEC] text-[#B91C1C]', badge: true, alerta: true },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {tarjetas.map(({ titulo, valor, detalle, icono: Icono, colores, badge, alerta }) => (
        <section key={titulo} aria-label={titulo} className="rounded-xl border border-[#D8E3F5] bg-white p-3 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[#627A9B] sm:text-xs">{titulo}</h2>
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${colores}`}>
              <Icono size={16} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className={`text-2xl font-bold sm:text-3xl ${alerta ? 'text-[#B91C1C]' : 'text-[#011140]'}`}>
              {valor ?? '—'}
            </span>
            {detalle && (
              <span className={badge ? `rounded-full px-2 py-0.5 text-[10px] font-semibold ${colores}` : 'text-xs text-[#627A9B]'}>
                {detalle}
              </span>
            )}
          </p>
        </section>
      ))}
    </div>
  )
}
