import { useRef } from 'react'
import { ScanLine } from 'lucide-react'
import useEscanerQr from '../../hooks/useEscanerQr'

interface EscanerQrProps {
  onLeer: (codigo: string) => void
  /** La página lo remonta (nueva key) para limpiar el resultado y volver a encender la cámara. */
  onReescanear: () => void
}

/** Lectura del QR del estudiante con la cámara. Al desmontarse apaga la cámara. */
export default function EscanerQr({ onLeer, onReescanear }: EscanerQrProps) {
  const video = useRef<HTMLVideoElement>(null)
  const estado = useEscanerQr(video, onLeer)

  return (
    <div className="rounded-lg border border-[#E7E9EE] bg-[#F4F4F5] p-4 sm:p-5">
      <p className="mb-2 block text-[11px] font-semibold text-[#303846] sm:text-xs">Escanea el código QR del estudiante:</p>
      <div className="flex flex-col items-center gap-2.5">
        <div
          className={`relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl border border-[#B8CBEF] bg-[#011140] shadow-inner sm:max-w-md ${
            estado.status === 'escaneando' ? '' : 'hidden'
          }`}
        >
          <video
            ref={video}
            muted
            playsInline
            aria-label="Vista de la cámara"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden="true" />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/95 shadow-[0_0_0_999px_rgba(1,17,64,0.30)] sm:h-56 sm:w-56"
            aria-hidden="true"
          >
            <span className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-[#49C8F1]" />
            <span className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-[#49C8F1]" />
            <span className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-[#49C8F1]" />
            <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-[#49C8F1]" />
          </div>
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-full bg-[#011140]/85 px-3 py-1.5 text-center text-xs font-semibold text-white shadow" aria-hidden="true">
            Encierra el código QR dentro del recuadro
          </p>
        </div>
        {estado.status === 'iniciando' && <p className="text-xs text-[#627A9B]">Iniciando cámara…</p>}
        {estado.status === 'escaneando' && <p className="text-xs text-[#627A9B]">Apunta la cámara y alinea el código dentro del recuadro.</p>}
        {estado.status === 'leido' && <p className="text-xs text-[#526684]">Código leído. Verificando identidad…</p>}
        {estado.status === 'error' && (
          <p role="alert" className="text-xs text-[#B91C1C]">
            {estado.mensaje}
          </p>
        )}
        {(estado.status === 'leido' || estado.status === 'error') && (
          <button
            type="button"
            onClick={onReescanear}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0439D9] px-3.5 text-sm font-semibold text-white hover:bg-[#032db0] sm:h-11 sm:px-4"
          >
            <ScanLine size={17} aria-hidden="true" />
            Volver a escanear
          </button>
        )}
      </div>
    </div>
  )
}
