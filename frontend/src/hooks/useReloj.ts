import { useEffect, useState } from 'react'
import { ahoraServidorMs, sincronizarReloj } from '../services/tiempoService'

/** Hora del servidor en milisegundos, renovada cada `intervaloMs` (por defecto, cada segundo). */
export default function useReloj(intervaloMs = 1000): number {
  const [ahora, setAhora] = useState(ahoraServidorMs)

  useEffect(() => {
    let vigente = true
    void sincronizarReloj().then(() => {
      if (vigente) setAhora(ahoraServidorMs())
    })
    const id = window.setInterval(() => setAhora(ahoraServidorMs()), intervaloMs)
    return () => {
      vigente = false
      window.clearInterval(id)
    }
  }, [intervaloMs])

  return ahora
}
