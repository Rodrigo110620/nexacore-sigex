import { UserCheck } from 'lucide-react'

export interface ControlIngresoHeaderProps {
  materia?: string
  aula?: string
  /** Fecha ISO (YYYY-MM-DD), como la devuelve el backend. */
  fecha?: string
  /** Hora HH:mm o HH:mm:ss. */
  hora?: string
}

const SIN_DATO = '—'

function formatearFecha(fecha?: string): string {
  const [anio, mes, dia] = fecha?.split('-') ?? []
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : SIN_DATO
}

function formatearHora(hora?: string): string {
  return hora ? `${hora.slice(0, 5)} hrs` : SIN_DATO
}

/**
 * Encabezado de las pantallas de control de ingreso.
 * Recibe los datos del examen por props; sin datos muestra "—".
 */
export default function ControlIngresoHeader({ materia, aula, fecha, hora }: ControlIngresoHeaderProps) {
  const detalles = [
    { label: 'Fecha', valor: formatearFecha(fecha) },
    { label: 'Hora', valor: formatearHora(hora) },
    { label: 'Aula', valor: aula ?? SIN_DATO },
  ]

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[#D8E3F5] bg-[#F8FAFC] px-6 py-4">
      <h1 className="flex min-w-0 items-center gap-2 text-base font-bold text-[#011140]">
        <UserCheck size={18} className="shrink-0 text-[#0439D9]" aria-hidden="true" />
        <span className="truncate">
          CONTROL DE INGRESO · {materia ?? SIN_DATO} · {aula ?? SIN_DATO}
        </span>
      </h1>
      <dl className="flex shrink-0 items-center gap-4 text-xs text-[#627A9B]">
        {detalles.map(({ label, valor }) => (
          <div key={label} className="flex gap-1">
            <dt>{label}:</dt>
            <dd className="font-medium text-[#011140]">{valor}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
