import { useEffect, useRef, useState } from 'react'

/** Cuánto dura resaltada una fila que llegó en vivo. */
const MS_RESALTADA = 8000

/**
 * Filas que llegaron en vivo (no estaban en la carga anterior), para resaltarlas unos segundos con
 * «Nuevo». La primera carga y cada cambio de {@code contexto} (examen, página, búsqueda) solo toman
 * la lista como base: no marcan nada.
 */
export default function useFilasNuevas<T extends string | number>(ids: readonly T[] | undefined, contexto: string): ReadonlySet<T> {
  const vistas = useRef<{ contexto: string; ids: Set<T> } | null>(null)
  const temporizadores = useRef<number[]>([])
  const [nuevas, setNuevas] = useState<ReadonlySet<T>>(() => new Set())

  useEffect(() => {
    if (!ids) return
    const anterior = vistas.current
    vistas.current = { contexto, ids: new Set(ids) }
    if (!anterior || anterior.contexto !== contexto) return
    const llegaron = ids.filter((id) => !anterior.ids.has(id))
    if (llegaron.length === 0) return
    // En callbacks (no en el cuerpo del efecto): se marca ya y se desmarca pasado el tiempo. No se cancelan
    // si llega otra recarga antes: así ninguna fila queda marcada para siempre.
    temporizadores.current.push(
      window.setTimeout(() => setNuevas((prev) => new Set([...prev, ...llegaron])), 0),
      window.setTimeout(() => setNuevas((prev) => {
        const siguiente = new Set(prev)
        llegaron.forEach((id) => siguiente.delete(id))
        return siguiente
      }), MS_RESALTADA),
    )
  }, [ids, contexto])

  useEffect(() => () => { temporizadores.current.forEach((t) => window.clearTimeout(t)) }, [])

  return nuevas
}

/** Clases de una fila recién llegada: fondo ámbar suave que se apaga solo. */
export const CLASE_FILA_NUEVA = 'sigex-fila-nueva'
