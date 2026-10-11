const ETIQUETAS: Record<string, string> = {
  REGULAR: 'Estudiante regular',
  POSTULANTE: 'Postulante',
}

/** Condición o tipo de estudiante para mostrar; sin dato, se asume regular (valor por defecto del registro). */
export function etiquetaCondicion(condicion: string | null | undefined): string {
  return ETIQUETAS[(condicion ?? 'REGULAR').toUpperCase()] ?? condicion ?? ETIQUETAS.REGULAR
}

export const OPCIONES_CONDICION = [
  { valor: 'REGULAR', etiqueta: 'Estudiante regular' },
  { valor: 'POSTULANTE', etiqueta: 'Postulante' },
] as const
