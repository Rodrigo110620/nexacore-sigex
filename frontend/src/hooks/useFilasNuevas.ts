import { useEffect, useMemo, useRef, useState } from 'react'

/** Cuánto dura resaltada una fila que llegó o cambió en vivo. */
const MS_RESALTADA = 8000

export type EstadoFilaViva = 'nuevo' | 'actualizado'

/**
 * Filas que llegaron o cambiaron en vivo respecto a la carga anterior, para resaltarlas unos segundos
 * («Nuevo» / «Actualizado»). La {@code firma} de cada fila resume lo que se ve de ella: si cambia, la fila
 * se marca como actualizada. La primera carga y cada cambio de {@code contexto} (filtro, página, examen)
 * solo toman la lista como base: no marcan nada.
 */
export function useFilasVivas<T extends string | number>(
  filas: readonly { id: T; firma?: string }[] | undefined,
  contexto: string,
): ReadonlyMap<T, EstadoFilaViva> {
  const vistas = useRef<{ contexto: string; firmas: Map<T, string> } | null>(null)
  const temporizadores = useRef<number[]>([])
  const [marcadas, setMarcadas] = useState<ReadonlyMap<T, EstadoFilaViva>>(() => new Map())

  useEffect(() => {
    // Sin lista (cargando por un filtro, página o reintento): la próxima lista es la nueva base, no «nuevos».
    if (!filas) { vistas.current = null; return }
    const anterior = vistas.current
    vistas.current = { contexto, firmas: new Map(filas.map((f) => [f.id, f.firma ?? ''])) }
    if (!anterior || anterior.contexto !== contexto) return
    const cambios = filas.flatMap((f): [T, EstadoFilaViva][] => {
      if (!anterior.firmas.has(f.id)) return [[f.id, 'nuevo']]
      return anterior.firmas.get(f.id) !== (f.firma ?? '') ? [[f.id, 'actualizado']] : []
    })
    if (cambios.length === 0) return
    // En callbacks (no en el cuerpo del efecto): se marca ya y se desmarca pasado el tiempo. No se cancelan
    // si llega otra recarga antes: así ninguna fila queda marcada para siempre.
    temporizadores.current.push(
      window.setTimeout(() => setMarcadas((prev) => new Map([...prev, ...cambios])), 0),
      window.setTimeout(() => setMarcadas((prev) => {
        const siguiente = new Map(prev)
        cambios.forEach(([id]) => siguiente.delete(id))
        return siguiente
      }), MS_RESALTADA),
    )
  }, [filas, contexto])

  useEffect(() => () => { temporizadores.current.forEach((t) => window.clearTimeout(t)) }, [])

  return marcadas
}

/** Solo las filas que llegaron (no las que cambiaron), por su id. */
export default function useFilasNuevas<T extends string | number>(ids: readonly T[] | undefined, contexto: string): ReadonlySet<T> {
  // La lista de ids se rearma en cada render: se memoriza por su contenido.
  const firma = ids?.join(',')
  const filas = useMemo(() => (firma == null ? undefined : firma.split(',').filter(Boolean).map((id) => ({ id: (typeof ids?.[0] === 'number' ? Number(id) : id) as T }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depende del contenido (firma), no de la referencia
    [firma])
  const marcadas = useFilasVivas(filas, contexto)
  return new Set([...marcadas].filter(([, e]) => e === 'nuevo').map(([id]) => id))
}

/** Clase de una fila recién llegada o cambiada: fondo ámbar suave que se apaga solo. */
export const CLASE_FILA_NUEVA = 'sigex-fila-nueva'
