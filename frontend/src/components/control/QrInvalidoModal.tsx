import { AlertTriangle, ScanLine, X } from 'lucide-react'

interface Props {
  onReintentar: () => void
}

/** No expone el contenido escaneado: una credencial QR nunca debe mostrarse en la interfaz. */
export default function QrInvalidoModal({ onReintentar }: Props) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#011140]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="qr-invalido-title">
      <section className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <button type="button" onClick={onReintentar} aria-label="Cerrar y volver a escanear" className="absolute right-3 top-3 rounded-full p-1.5 text-[#627A9B] hover:bg-[#F1F5F9]">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={30} aria-hidden="true" />
        </div>
        <h2 id="qr-invalido-title" className="mt-4 text-lg font-extrabold text-[#011140]">Código QR no válido</h2>
        <p className="mt-2 text-sm leading-6 text-[#526684]">
          El código fue alterado, está vencido o no pertenece a un estudiante registrado.
        </p>
        <button type="button" onClick={onReintentar} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#032db0]">
          <ScanLine size={18} aria-hidden="true" />
          Escanear otro código
        </button>
      </section>
    </div>
  )
}
