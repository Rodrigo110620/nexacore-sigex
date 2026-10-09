import { useEffect, useState } from 'react'
import { listarExamenes, type ExamenDto } from '../services/examenService'

/**
 * Datos del examen para el encabezado de las pantallas de control. No hay GET /examenes/{id}:
 * se busca en el listado (CONTROL tiene acceso). Si falla queda undefined y el encabezado muestra "—".
 */
export default function useExamen(idExamen: number): ExamenDto | undefined {
  const [examen, setExamen] = useState<ExamenDto>()

  useEffect(() => {
    if (!Number.isInteger(idExamen) || idExamen <= 0) return
    let vigente = true
    listarExamenes()
      .then((examenes) => {
        if (vigente) setExamen(examenes.find((e) => e.idExamen === idExamen))
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [idExamen])

  return examen
}
