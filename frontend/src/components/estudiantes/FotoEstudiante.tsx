import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { descargarFotoEstudiante } from '../../services/estudianteService'

interface Props {
  /** Ruta de la API de la foto; sin ella se muestran las iniciales. */
  fotoUrl?: string | null
  /** Foto ya cargada en el navegador (p. ej. la vista previa antes de guardar). */
  src?: string | null
  nombre: string
  iniciales: string
  /** Tamaño, forma y colores; la foto ocupa el mismo recuadro que las iniciales. */
  className: string
  /**
   * Al tocar la foto se ve en grande, para comparar la cara con la persona (p. ej. en el control de
   * ingreso). Solo si hay foto: con las iniciales no hay nada que ampliar.
   */
  ampliable?: boolean
  /** Dato que acompaña a la foto ampliada (p. ej. "Código: 202104010"). */
  detalle?: string
  /** Acción en la foto ampliada (p. ej. "Reportar foto"); recibe cómo cerrarla. */
  accionAmpliada?: (cerrar: () => void) => ReactNode
}

/** Fotografía del estudiante para identificarlo; mientras carga, si falla o si no tiene, sus iniciales. */
export default function FotoEstudiante({
  fotoUrl, src, nombre, iniciales, className, ampliable = false, detalle, accionAmpliada,
}: Props) {
  const [cargada, setCargada] = useState<{ url: string; src: string } | null>(null)
  const [ampliada, setAmpliada] = useState(false)

  useEffect(() => {
    if (!fotoUrl || src || typeof URL.createObjectURL !== 'function') return
    const controller = new AbortController()
    let objectUrl: string | null = null
    descargarFotoEstudiante(fotoUrl, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setCargada({ url: fotoUrl, src: objectUrl })
      })
      .catch(() => { /* sin foto: quedan las iniciales */ })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fotoUrl, src])

  const imagen = src ?? (cargada && cargada.url === fotoUrl ? cargada.src : null)
  if (imagen && ampliable) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          aria-label={`Ver la foto de ${nombre} en grande`}
          className="shrink-0 cursor-zoom-in rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
        >
          <img src={imagen} alt={`Fotografía de ${nombre}`} className={`${className} object-cover`} />
        </button>
        {ampliada && (
          <FotoAmpliada imagen={imagen} nombre={nombre} detalle={detalle} onClose={() => setAmpliada(false)}
            accion={accionAmpliada} />
        )}
      </>
    )
  }
  if (imagen) {
    return <img src={imagen} alt={`Fotografía de ${nombre}`} className={`${className} object-cover`} />
  }
  return (
    <span aria-hidden="true" className={className}>
      {iniciales}
    </span>
  )
}

/** Foto en grande sobre fondo oscuro. Se cierra con la X, con Escape o tocando fuera de la foto. */
function FotoAmpliada({ imagen, nombre, detalle, onClose, accion }: {
  imagen: string
  nombre: string
  detalle?: string
  onClose: () => void
  accion?: (cerrar: () => void) => ReactNode
}) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${nombre}`}
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#011140]/85 p-4"
    >
      <figure onClick={(e) => e.stopPropagation()} className="flex max-w-full flex-col items-center gap-3">
        <img src={imagen} alt={`Fotografía de ${nombre}`}
          className="max-h-[70dvh] max-w-[min(90vw,32rem)] rounded-2xl object-contain shadow-2xl ring-4 ring-white/90" />
        <figcaption className="text-center text-white">
          <span className="block text-base font-bold">{nombre}</span>
          {detalle && <span className="block text-sm text-white/80">{detalle}</span>}
        </figcaption>
        {accion?.(onClose)}
      </figure>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar foto"
        className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
      >
        <X size={20} />
      </button>
    </div>
  )
}
