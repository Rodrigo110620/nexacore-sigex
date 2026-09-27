import { useLayoutEffect, useRef, useState } from 'react'

interface ConfirmDiscardProps {
  open: boolean
  onStay: () => void
  onLeave: () => void
}

export function ConfirmDiscardDialog({ open, onStay, onLeave }: ConfirmDiscardProps) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#011140]/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl">
        <h3 className="text-sm font-bold text-[#011140]">¿Descartar los datos?</h3>
        <p className="mt-2 text-xs text-gray-600">
          Hay información sin guardar. Si sales ahora se perderá lo ingresado.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onStay}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-[#011140] hover:bg-gray-50"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  )
}

interface OfflineDialogProps {
  open: boolean
  onClose: () => void
}

export function OfflineDialog({ open, onClose }: OfflineDialogProps) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#011140]/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl">
        <h3 className="text-sm font-bold text-[#011140]">Sin conexión a Internet</h3>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          No se pudo guardar y registrar el examen porque no hay conexión a Internet. Verifica tu
          conexión e inténtalo nuevamente. Los datos del formulario se conservan.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-[#0439D9] py-2 text-sm font-semibold text-white hover:bg-[#032db0]"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

export function NormaTexto({ texto, expanded, onToggle }: {
  texto: string
  expanded: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLParagraphElement | null>(null)
  const [recortado, setRecortado] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    const medir = () => setRecortado(el.scrollWidth > el.clientWidth + 1)
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(medir)
    observer.observe(el)
    return () => observer.disconnect()
  }, [texto, expanded])

  return (
    <div className="min-w-0">
      <p ref={ref} className={`text-xs leading-relaxed text-[#011140] ${expanded ? 'break-words' : 'truncate'}`}>
        {texto}
      </p>
      {(recortado || expanded) && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 text-[10px] font-semibold text-[#0439D9] hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver todo'}
        </button>
      )}
    </div>
  )
}
