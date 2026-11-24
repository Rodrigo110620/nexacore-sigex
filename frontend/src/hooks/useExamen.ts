import { useEffect, useState } from 'react'
import { listarExamenes, type ExamenDto } from '../services/examenService'
import { TODOS_LOS_PERIODOS } from '../services/periodoService'
import { examenesControlGuardados, guardarExamenesControl } from '../services/controlOfflineService'

/**
 * Datos del examen para el encabezado de las pantallas de control. No hay GET /examenes/{id}:
 * se busca en el listado (CONTROL tiene acceso). Si falla queda undefined y el encabezado muestra "—".
 */
export default function useExamen(idExamen: number): ExamenDto | undefined {
  const [examen, setExamen] = useState<ExamenDto>()

  useEffect(() => {
    if (!Number.isInteger(idExamen) || idExamen <= 0) return
    let vigente = true
    listarExamenes(TODOS_LOS_PERIODOS)
      .then((examenes) => {
        guardarExamenesControl(examenes)
        if (vigente) setExamen(examenes.find((e) => e.idExamen === idExamen))
      })
      .catch(() => {
        if (vigente) setExamen(examenesControlGuardados().find((e) => e.idExamen === idExamen))
      })
    return () => {
      vigente = false
    }
  }, [idExamen])

  return examen
}
