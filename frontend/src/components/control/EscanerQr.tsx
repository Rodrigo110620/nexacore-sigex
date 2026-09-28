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
    <div className="rounded-xl border border-[#D8E3F5] bg-[#F8FBFF] p-4">
      <p className="mb-1 block text-xs font-semibold text-gray-700">Escanea el código QR del estudiante:</p>
      <div className="flex flex-col items-center gap-3">
        <video
          ref={video}
          muted
          playsInline
          aria-label="Vista de la cámara"
          className={`w-full max-w-sm rounded-xl border border-gray-200 bg-[#011140] ${
            estado.status === 'escaneando' ? '' : 'hidden'
          }`}
        />
        {estado.status === 'iniciando' && <p className="text-sm text-[#627A9B]">Iniciando cámara…</p>}
        {estado.status === 'escaneando' && <p className="text-sm text-[#627A9B]">Apunta la cámara al código QR.</p>}
        {estado.status === 'leido' && (
          <p className="text-sm text-[#011140]">
            Código leído: <span className="font-semibold text-[#0439D9]">{estado.codigo}</span>
          </p>
        )}
        {estado.status === 'error' && (
          <p role="alert" className="text-sm text-[#B91C1C]">
            {estado.mensaje}
          </p>
        )}
        {(estado.status === 'leido' || estado.status === 'error') && (
          <button
            type="button"
            onClick={onReescanear}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#032db0]"
          >
            <ScanLine size={16} aria-hidden="true" />
            Volver a escanear
          </button>
        )}
      </div>
    </div>
  )
}
