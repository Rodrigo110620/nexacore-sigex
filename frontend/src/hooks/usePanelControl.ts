import { useEffect, useState } from 'react'
import { listarMisExamenes, type ExamenDto } from '../services/examenService'
import useEnVivo from './useEnVivo'
import { ahoraServidorMs, sincronizarReloj } from '../services/tiempoService'
import { TODOS_LOS_PERIODOS } from '../services/periodoService'
import { examenesControlGuardados, guardarExamenesControl } from '../services/controlOfflineService'

export const REFRESCO_MS = 30_000

/**
 * Exámenes no cancelados para el panel de CONTROL (solo los que tiene asignados; el docente, también los suyos; el
 * ADMIN, todos para supervisar) y la hora actual, que se renueva cada 30 s
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
    listarMisExamenes(TODOS_LOS_PERIODOS)
      .then((lista) => {
        guardarExamenesControl(lista)
        if (vigente) setExamenes(lista.filter((e) => e.estado?.toLowerCase() !== 'cancelado'))
      })
      .catch(() => {
        if (!vigente) return
        const guardados = examenesControlGuardados()
        if (guardados.length) setExamenes(guardados.filter((e) => e.estado?.toLowerCase() !== 'cancelado'))
        else setError('No se pudo cargar la lista de exámenes.')
      })
    return () => {
      vigente = false
    }
  },[recarga])

  useEffect(() => {
    // Con la hora del servidor: solo se corrige si el reloj del dispositivo estaba desfasado más de
    // 30 s; si no, no hace falta volver a pedir el avance de los exámenes.
    // Si la pantalla ya se cerró cuando responde el servidor, no se actualiza nada.
    let vigente = true
    void sincronizarReloj().then(() => {
      if (!vigente) return
      setAhora((anterior) => {
        const servidor = ahoraServidorMs()
        return Math.abs(servidor - anterior.getTime()) > REFRESCO_MS ? new Date(servidor) : anterior
      })
    })
    const intervalo = window.setInterval(() => setAhora(new Date(ahoraServidorMs())), REFRESCO_MS)
    return () => {
      vigente = false
      window.clearInterval(intervalo)
    }
  }, [])

  /** Vuelve a pedir los exámenes (botón Reintentar). */
  const recargar = () => {
    setError(undefined)
    setRecarga((n) => n + 1)
  }

  return { examenes, error, ahora, recargar }
}
