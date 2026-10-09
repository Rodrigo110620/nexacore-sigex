import { Building2, CalendarDays, Clock3, GraduationCap, UserRoundCheck } from 'lucide-react'

export interface ControlIngresoHeaderProps {
  materia?: string
  aula?: string
  /** Fecha ISO (YYYY-MM-DD), como la devuelve el backend. */
  fecha?: string
  /** Hora HH:mm o HH:mm:ss. */
  hora?: string
  docente?: string
  duracionMinutos?: number
  /** Variante densa para la identificación, sin alterar el encabezado del detalle del examen. */
  compact?: boolean
}

const SIN_DATO = '—'

function formatearFecha(fecha?: string): string {
  const [anio, mes, dia] = fecha?.split('-') ?? []
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : SIN_DATO
}

function formatearHorario(hora?: string, duracionMinutos?: number): string {
  if (!hora) return SIN_DATO
  const [horas, minutos] = hora.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(horas) || !Number.isFinite(minutos) || !duracionMinutos) return `${hora.slice(0, 5)} hrs`
  const total = horas * 60 + minutos + duracionMinutos
  return `${hora.slice(0, 5)} - ${String(Math.floor((total / 60) % 24)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')} hrs`
}

/**
 * Encabezado de las pantallas de control de ingreso.
 * Recibe los datos del examen por props; sin datos muestra "—".
 */
export default function ControlIngresoHeader({ materia, aula, fecha, hora, docente, duracionMinutos, compact = false }: ControlIngresoHeaderProps) {
  const detalles = [
    { icono: CalendarDays, valor: formatearFecha(fecha) },
    { icono: Clock3, valor: formatearHorario(hora, duracionMinutos) },
    { icono: GraduationCap, valor: `Docente: ${docente ?? SIN_DATO}` },
  ]

  if (compact) {
    return (
      <header className="flex flex-col gap-2 border-b border-[#E6EAF0] bg-[#FAFAFB] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3">
        <h1 className="flex min-w-0 items-center gap-2 truncate text-[13px] font-bold uppercase text-[#1D2430] sm:text-base">
          <UserRoundCheck size={18} className="shrink-0 text-[#0439D9]" aria-hidden="true" />
          <span className="truncate">Control de ingreso · {materia ?? SIN_DATO} · {aula ?? SIN_DATO}</span>
        </h1>
        <dl className="flex shrink-0 flex-wrap items-center gap-x-4 text-[10px] text-[#597197] sm:text-xs">
          {detalles.slice(0, 2).map(({ icono: Icono, valor }, index) => (
            <div key={`${index}-${valor}`} className="flex items-center gap-1">
              <Icono size={14} aria-hidden="true" />
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </header>
    )
  }

  return (
    <>
    <header className="md:hidden">
      <h1 className="truncate text-sm font-extrabold text-[#011140]">
        Control de ingreso · {materia ?? SIN_DATO}
      </h1>
      <div className="mt-1 rounded-lg bg-[#F1F3F6] px-3 py-2 text-[#011140]">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Building2 size={13} className="text-[#0439D9]" aria-hidden="true" />
          {aula ?? SIN_DATO}
        </p>
        <dl className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#627A9B]">
          {detalles.slice(0, 2).map(({ icono: Icono, valor }, index) => (
            <div key={`${index}-${valor}`} className="flex items-center gap-1">
              <Icono size={11} aria-hidden="true" />
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
    <header className="hidden flex-col gap-2 px-1 py-1 md:flex md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-extrabold uppercase tracking-tight text-[#171C27] sm:text-base">
          Control de ingreso · {materia ?? SIN_DATO} · {aula ?? SIN_DATO}
        </h1>
        <dl className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#718099] sm:text-[11px]">
          {detalles.map(({ icono: Icono, valor }, index) => (
            <div key={`${index}-${valor}`} className="flex items-center gap-1">
              <Icono size={11} aria-hidden="true" />
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[#F5F7FB] px-3 py-2 text-xs font-semibold text-[#344158]">
        <Building2 size={12} aria-hidden="true" />
        {aula ?? SIN_DATO}
      </div>
    </header>
    </>
  )
}
