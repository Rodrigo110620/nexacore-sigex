import { useEffect, useState } from 'react'
import { listarExamenes, type ExamenDto } from '../services/examenService'

export const REFRESCO_MS = 30_000

/**
 * Exámenes no cancelados para el panel de CONTROL y la hora actual, que se renueva cada 30 s
 * mientras la página está abierta (así cambia qué examen está en curso y se refresca el avance).
 */
export default function usePanelControl() {
  const [examenes, setExamenes] = useState<ExamenDto[]>()
  const [error, setError] = useState<string>()
  const [ahora, setAhora] = useState(() => new Date())

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
  }, [])

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), REFRESCO_MS)
    return () => window.clearInterval(intervalo)
  }, [])

  return { examenes, error, ahora }
}
