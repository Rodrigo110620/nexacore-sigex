/**
 * Razones de inhabilitación de un estudiante en un examen. El backend las guarda una por línea
 * en motivoInhabilitacion: la del administrador y, debajo, las denegaciones del personal de control.
 */
export function razonesInhabilitacion(motivo: string | null | undefined): string[] {
  if (!motivo) return []
  return motivo
    .split(/\r?\n/)
    .map((razon) => razon.trim())
    .filter(Boolean)
}
