import { useEffect, useState } from 'react'
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
}

/** Fotografía del estudiante para identificarlo; mientras carga, si falla o si no tiene, sus iniciales. */
export default function FotoEstudiante({ fotoUrl, src, nombre, iniciales, className }: Props) {
  const [cargada, setCargada] = useState<{ url: string; src: string } | null>(null)

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
  if (imagen) {
    return <img src={imagen} alt={`Fotografía de ${nombre}`} className={`${className} object-cover`} />
  }
  return (
    <span aria-hidden="true" className={className}>
      {iniciales}
    </span>
  )
}
