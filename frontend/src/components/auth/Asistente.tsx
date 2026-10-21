import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Barra de pasos de los asistentes del estudiante (activar la cuenta, registrar la foto). */
export function ProgresoAsistente({ titulo, pasos, paso }: { titulo: string; pasos: string[]; paso: number }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="text-[#011140]">{titulo}</span>
        <span className="text-[#0439D9]">{paso}/{pasos.length}</span>
      </div>
      <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
        {pasos.map((nombre, i) => (
          <li key={nombre} aria-current={i + 1 === paso ? 'step' : undefined} className="flex flex-col gap-1.5">
            <span className={`h-1 rounded-full ${i < paso ? 'bg-[#0439D9]' : 'bg-[#E4E9F2]'}`} />
            <span className={`text-[11px] ${i + 1 === paso ? 'font-semibold text-[#0439D9]' : i < paso ? 'text-[#0439D9]' : 'text-[#627A9B]'}`}>
              {nombre}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const TONOS = {
  azul: 'bg-[#F1F6FF] text-[#0439D9]',
  verde: 'bg-[#ECFDF5] text-[#047857]',
  ambar: 'bg-[#FFF7E6] text-[#B45309]',
  rojo: 'bg-[#FEF2F2] text-[#B91C1C]',
} as const

/** Icono, título y explicación de un paso del asistente. */
export function EncabezadoAsistente({
  icono: Icono,
  titulo,
  tono = 'azul',
  children,
}: {
  icono: LucideIcon
  titulo: string
  tono?: keyof typeof TONOS
  children: ReactNode
}) {
  return (
    <div className="mb-6">
      <span className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg ${TONOS[tono]}`}>
        <Icono size={22} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-extrabold text-[#092068]">{titulo}</h1>
      <p className="mt-2 text-sm text-gray-500">{children}</p>
    </div>
  )
}
