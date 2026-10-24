import { useEffect, useState } from 'react'
import { listarExamenes, type ExamenDto } from '../services/examenService'
import useEnVivo from './useEnVivo'
import { ahoraServidorMs, sincronizarReloj } from '../services/tiempoService'

export const REFRESCO_MS = 30_000

/**
 * Exámenes no cancelados para el panel de CONTROL y la hora actual, que se renueva cada 30 s
 * mientras la página está abierta (así cambia qué examen está en curso y se refresca el avance).
 */
export default function usePanelControl() {
  const [examenes, setExamenes] = useState<ExamenDto[]>()
  const [error, setError] = useState<string>()
  const [ahora, setAhora] = useState(() => new Date(ahoraServidorMs()))
  const [recarga, setRecarga] = useState(0)
  useEnVivo((c) => c.tipo === 'EXAMEN' || c.tipo === 'INGRESO' || c.tipo === 'HABILITACION', () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    listarExamenes()
      .then((lista) => {
        if (vigente) setExamenes(lista.filter((e) => e.estado?.toLowerCase() !== 'cancelado'))
      })
      .catch(() => {
        if (vigente) setError('No se pudo cargar la lista de exámenes.')
      })
    return () => {
      vigente = false
    }
  },[recarga])

  useEffect(() => {
    void sincronizarReloj().then(() => setAhora(new Date(ahoraServidorMs())))
    const intervalo = window.setInterval(() => setAhora(new Date(ahoraServidorMs())), REFRESCO_MS)
    return () => window.clearInterval(intervalo)
  }, [])

  return { examenes, error, ahora }
}
