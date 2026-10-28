import { Link } from 'react-router-dom'
import { CircleCheck, Clock3, TriangleAlert, UserCheck, type LucideIcon } from 'lucide-react'
import type { ResumenEstudiantes } from '../../services/controlExamenService'

interface Tarjeta {
  titulo: string
  valor?: number
  detalle: string
  icono: LucideIcon
  colores: string
  numero: string
  enlace?: string
}

/**
 * DASH-01: contadores del examen en tiempo real (se recargan con cada ingreso o incidencia):
 * habilitados, ingresados, ausentes (habilitados que aún no ingresaron) e incidencias de la sesión.
 */
export default function ResumenExamenCards({ resumen, idExamen }: { resumen?: ResumenEstudiantes; idExamen?: number }) {
  const habilitados = resumen?.habilitados
  const ingresados = resumen?.ingresados
  const ausentes = resumen ? Math.max(0, resumen.habilitados - resumen.ingresados) : undefined
  const incidencias = resumen?.incidencias
  const porcentaje = resumen && resumen.habilitados > 0 ? `${Math.round((resumen.ingresados / resumen.habilitados) * 100)} % de habilitados` : 'Sin habilitados'
  const tarjetas: Tarjeta[] = [
    {
      titulo: 'Habilitados', valor: habilitados, icono: CircleCheck, colores: 'bg-[#E9F1FF] text-[#0439D9]', numero: 'text-[#011140]',
      detalle: resumen ? `de ${resumen.total} asignados${resumen.noHabilitados ? ` · ${resumen.noHabilitados} con observación` : ''}` : '',
    },
    { titulo: 'Ingresados', valor: ingresados, icono: UserCheck, colores: 'bg-[#DCFCE7] text-[#166534]', numero: 'text-[#166534]', detalle: resumen ? porcentaje : '' },
    {
      titulo: 'Ausentes', valor: ausentes, icono: Clock3, colores: 'bg-[#FFF7E6] text-[#B45309]', numero: ausentes ? 'text-[#B45309]' : 'text-[#011140]',
      detalle: resumen ? (ausentes ? 'Aún no ingresan' : 'Todos ingresaron') : '',
    },
    {
      titulo: 'Incidencias', valor: incidencias, icono: TriangleAlert, colores: 'bg-[#FDECEC] text-[#B91C1C]', numero: incidencias ? 'text-[#B91C1C]' : 'text-[#011140]',
      detalle: resumen ? (incidencias ? 'Ver detalle' : 'Sin incidencias') : '',
      enlace: incidencias && idExamen ? `/dashboard/control/${idExamen}/informacion` : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
      {tarjetas.map(({ titulo, valor, detalle, icono: Icono, colores, numero, enlace }) => (
        <section key={titulo} aria-label={titulo} className="min-w-0 rounded-xl border border-[#D8E3F5] bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[#627A9B] sm:text-[11px]">{titulo}</h2>
            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${colores}`}>
              <Icono size={14} aria-hidden="true" />
            </span>
          </div>
          <p className={`mt-1.5 text-2xl font-bold leading-none tabular-nums sm:text-[28px] ${numero}`}>{valor ?? '—'}</p>
          {detalle && (enlace
            ? <Link to={enlace} className="mt-1 inline-block text-[11px] font-semibold text-[#B91C1C] hover:underline">{detalle} →</Link>
            : <p className="mt-1 truncate text-[11px] text-[#627A9B]">{detalle}</p>)}
        </section>
      ))}
    </div>
  )
}
