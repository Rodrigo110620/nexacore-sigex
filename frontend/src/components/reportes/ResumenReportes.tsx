import PuntoVivo from '../ui/PuntoVivo'
import { NumeroVivo } from '../ui/FilaViva'
import { Ban, CameraOff, ShieldAlert, UserX, type LucideIcon } from 'lucide-react'
import type { ClaveResumen, Cifra, ResumenReportes as Resumen } from '../../hooks/useResumenReportes'

const TARJETAS: { clave: ClaveResumen; texto: string; corto: string; Icono: LucideIcon; color: string; fondo: string }[] = [
  { clave: 'intentos', texto: 'Intentos incorrectos', corto: 'Intentos', Icono: Ban, color: 'text-[#B45309]', fondo: 'bg-[#FEF3C7]' },
  { clave: 'expulsiones', texto: 'Expulsiones', corto: 'Expulsiones', Icono: UserX, color: 'text-[#B91C1C]', fondo: 'bg-[#FEE2E2]' },
  { clave: 'excepciones', texto: 'Excepciones', corto: 'Excepciones', Icono: ShieldAlert, color: 'text-[#6D28D9]', fondo: 'bg-[#EDE9FE]' },
  { clave: 'fotos', texto: 'Fotos reportadas', corto: 'Fotos', Icono: CameraOff, color: 'text-[#0439D9]', fondo: 'bg-[#E9F1FF]' },
]

function Tendencia({ cifra }: { cifra: Cifra }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
      <span className={`rounded-full px-1.5 py-0.5 font-semibold ${cifra.hoy > 0 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
        {cifra.hoy > 0 ? `+${cifra.hoy} hoy` : 'Nada hoy'}
      </span>
      <span className="text-[#8BA0BF]">ayer {cifra.ayer}</span>
    </span>
  )
}

/**
 * Resumen de Reportes: una tarjeta por tipo con el total, lo de hoy y lo de ayer. Se actualiza en vivo
 * y al tocar una tarjeta se abre su pestaña.
 */
export default function ResumenReportes({ resumen, activa, onElegir }: {
  resumen: Resumen
  activa: ClaveResumen
  onElegir: (clave: ClaveResumen) => void
}) {
  return (
    <div>
    <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#15803D]">
      <PuntoVivo tamano="size-1.5" /> En vivo · se actualiza solo
    </p>
    <ul aria-label="Resumen de reportes" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {TARJETAS.map(({ clave, texto, corto, Icono, color, fondo }) => {
        const cifra = resumen[clave]
        const seleccionada = activa === clave
        return (
          <li key={clave}>
            <button type="button" onClick={() => onElegir(clave)} aria-pressed={seleccionada}
              aria-label={cifra ? `${texto}: ${cifra.total}, ${cifra.hoy} hoy` : texto}
              className={`flex h-full w-full items-start gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/40 sm:p-4 ${
                seleccionada ? 'border-[#0439D9] ring-1 ring-[#0439D9]/30' : 'border-[#D8E3F5]'}`}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg sm:size-10 ${fondo} ${color}`}><Icono size={18} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-[#627A9B] sm:text-xs">
                  <span className="sm:hidden">{corto}</span><span className="hidden sm:inline">{texto}</span>
                </span>
                {cifra ? (
                  <>
                    <span className="block text-2xl font-extrabold leading-tight text-[#011140] sm:text-[28px]"><NumeroVivo valor={cifra.total} /></span>
                    <Tendencia cifra={cifra} />
                  </>
                ) : (
                  <span aria-hidden="true" className="mt-1.5 block space-y-1.5">
                    <span className="block h-6 w-10 animate-pulse rounded bg-[#E9EFF8]" />
                    <span className="block h-3 w-20 animate-pulse rounded bg-[#E9EFF8]" />
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
    </div>
  )
}
