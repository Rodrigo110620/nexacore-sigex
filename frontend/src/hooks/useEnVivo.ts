import { useEffect, useRef } from 'react'
import { alRecibirCambio, type CambioEnVivo } from '../services/notificacionService'

/** Espera breve para juntar varios cambios seguidos (p. ej. una asociación en lote) en una recarga. */
const ESPERA_MS = 400

/**
 * Recarga los datos de la pantalla cuando llega en vivo un cambio que le afecta. Al reconectar
 * (tras un corte de red) siempre recarga, por si se perdió algún cambio.
 */
export default function useEnVivo(afecta: (c: CambioEnVivo) => boolean, recargar: () => void) {
  const afectaRef = useRef(afecta)
  const recargarRef = useRef(recargar)
  useEffect(() => {
    afectaRef.current = afecta
    recargarRef.current = recargar
  })

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined
    const dejar = alRecibirCambio((c) => {
      if (c.tipo !== 'RECONECTADO' && !afectaRef.current(c)) return
      clearTimeout(temporizador)
      temporizador = setTimeout(() => recargarRef.current(), ESPERA_MS)
    })
    return () => {
      clearTimeout(temporizador)
      dejar()
    }
  }, [])
}
