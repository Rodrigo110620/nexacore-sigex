import { useEffect, useState } from 'react'
import useEnVivo from './useEnVivo'
import { obtenerResumenExamen, type ResumenEstudiantes } from '../services/controlExamenService'

const CAMBIOS = new Set(['INGRESO', 'HABILITACION', 'EXAMEN'])

/**
 * Contadores (habilitados, ingresados…) de varios exámenes: se vuelven a pedir cuando cambia `refresco`
 * (por ejemplo, la hora cada 30 s) y con cada ingreso o cambio en vivo de uno de ellos, sin recargar.
 * Si una carga falla se conserva el último dato; sin dato previo queda 'error' para ofrecer Reintentar.
 */
export default function useResumenesExamenes(ids: number[], refresco?: unknown) {
  const [resumenes, setResumenes] = useState<Record<number, ResumenEstudiantes | 'error'>>({})
  const [recarga, setRecarga] = useState(0)
  const clave = ids.join(',')

  useEnVivo((c) => CAMBIOS.has(c.tipo) && (c.idExamen == null || clave.split(',').includes(String(c.idExamen))), () => setRecarga((n) => n + 1))

  useEffect(() => {
    if (!clave) return
    let vigente = true
    for (const id of clave.split(',').map(Number)) {
      obtenerResumenExamen(id)
        .then((r) => { if (vigente) setResumenes((prev) => ({ ...prev, [id]: r })) })
        .catch(() => { if (vigente) setResumenes((prev) => (prev[id] && prev[id] !== 'error' ? prev : { ...prev, [id]: 'error' })) })
    }
    return () => { vigente = false }
  }, [clave, recarga, refresco])

  return { resumenes, recargar: () => setRecarga((n) => n + 1) }
}
