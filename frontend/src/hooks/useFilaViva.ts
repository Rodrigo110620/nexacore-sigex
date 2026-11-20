import { createContext, useContext } from 'react'
import type { EstadoFilaViva } from './useFilasNuevas'

/** Qué filas de la lista abierta llegaron o cambiaron en vivo (por id). */
export const FilasVivasContexto = createContext<ReadonlyMap<number, EstadoFilaViva>>(new Map())

/** Estado en vivo de una fila: 'nuevo', 'actualizado' o undefined. */
export default function useFilaViva(id: number): EstadoFilaViva | undefined {
  return useContext(FilasVivasContexto).get(id)
}

/** Clase para la fila: se resalta en ámbar y se apaga sola; también aparece suave al cargar. */
export function claseFilaViva(estado: EstadoFilaViva | undefined): string {
  return estado ? 'sigex-fila-nueva' : 'sigex-aparece'
}

/** Todas las filas marcadas de la lista abierta (para usar dentro de un .map). */
export function useFilasVivasActuales(): ReadonlyMap<number, EstadoFilaViva> {
  return useContext(FilasVivasContexto)
}
