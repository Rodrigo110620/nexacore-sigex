import { CircleAlert, ArrowRight, X } from 'lucide-react'

interface Props {
  open: boolean
  fieldLabel: string
  message: string
  onContinue: () => void
  onClose: () => void
}

export default function FieldErrorModal({
  open,
  fieldLabel,
  message,
  onContinue,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center bg-black/20 justify-center p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-300 bg-white shadow-2xl">
        {/* Header rojo */}
        <div className="flex items-start justify-between gap-3 bg-red-600 px-5 py-4">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 shrink-0 text-white" size={22} />
            <h3 className="text-base font-bold text-white">
              Error en {fieldLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded p-1 text-white hover:bg-red-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-5">
          <p className="text-sm text-gray-800">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Continuar
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}