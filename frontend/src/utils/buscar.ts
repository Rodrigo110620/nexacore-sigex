/** Sin tildes y en minúsculas, para buscar «perez» y encontrar «Pérez». */
const normal = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** ¿Alguno de los campos contiene lo buscado? Con la búsqueda vacía, sí. */
export function coincide(buscar: string, ...campos: (string | null | undefined)[]): boolean {
  const b = normal(buscar.trim())
  return !b || campos.some((c) => c != null && normal(c).includes(b))
}
