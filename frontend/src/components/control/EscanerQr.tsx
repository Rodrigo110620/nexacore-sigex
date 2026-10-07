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
        <video
          ref={video}
          muted
          playsInline
          aria-label="Vista de la cámara"
          className={`w-full max-w-sm rounded-lg border border-gray-200 bg-[#011140] sm:max-w-md ${
            estado.status === 'escaneando' ? '' : 'hidden'
          }`}
        />
        {estado.status === 'iniciando' && <p className="text-xs text-[#627A9B]">Iniciando cámara…</p>}
        {estado.status === 'escaneando' && <p className="text-xs text-[#627A9B]">Apunta la cámara al código QR.</p>}
        {estado.status === 'leido' && (
          <p className="text-xs text-[#011140]">
            Código leído: <span className="font-semibold text-[#0439D9]">{estado.codigo}</span>
          </p>
        )}
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
