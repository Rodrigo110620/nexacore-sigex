import { CircleAlert, RotateCcw } from 'lucide-react'

/**
 * Error al cargar datos, con el botón Reintentar. Lo usan todas las pantallas que cargan del servidor,
 * para que un corte de red no obligue a recargar la página entera.
 */
export default function ErrorCarga({ mensaje, onReintentar, className = '' }: { mensaje: string; onReintentar: () => void; className?: string }) {
  return (
    <div role="alert" className={`flex flex-col gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C] sm:flex-row sm:items-center ${className}`}>
      <span className="flex flex-1 items-start gap-2">
        <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        {mensaje}
      </span>
      <button type="button" onClick={onReintentar}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-white px-4 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEE2E2]">
        <RotateCcw size={15} aria-hidden="true" /> Reintentar
      </button>
    </div>
  )
}
