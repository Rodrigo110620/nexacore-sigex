import { CircleAlert, LoaderCircle } from 'lucide-react'

/** Estado de carga del portal del estudiante mientras se lee su perfil. */
export function PortalCargando() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-10 text-[#011140]">
      <LoaderCircle className="animate-spin text-[#0439D9]" size={30} aria-hidden="true" />
      <p className="text-sm font-semibold">Cargando tu cuenta...</p>
    </div>
  )
}

/** Error al leer el perfil del estudiante, con opción de reintentar. */
export function PortalError({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <CircleAlert className="text-[#B91C1C]" size={30} aria-hidden="true" />
      <p className="text-sm text-[#B91C1C]">{mensaje}</p>
      <button
        type="button"
        onClick={onReintentar}
        className="inline-flex h-11 items-center rounded-xl bg-[#0439D9] px-5 text-sm font-bold text-white hover:bg-[#0027a2]"
      >
        Reintentar
      </button>
    </div>
  )
}
