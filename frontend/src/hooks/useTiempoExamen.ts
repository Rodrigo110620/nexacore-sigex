import useReloj from './useReloj'
import { offsetServidorMinutos } from '../services/tiempoService'
import { tiempoExamen, type HorarioExamen, type TiempoExamen } from '../utils/tiempoExamen'

/**
 * Fase y tiempo restante del examen, en vivo. Cada segundo para un cronómetro; en listas largas
 * conviene un intervalo mayor (solo hace falta que la fase cambie a tiempo).
 */
export default function useTiempoExamen(examen: HorarioExamen | null | undefined, intervaloMs = 1000): TiempoExamen | null {
  const ahora = useReloj(intervaloMs)
  if (!examen?.fecha || !examen.horaInicio) return null
  return tiempoExamen(examen, ahora, offsetServidorMinutos())
}
