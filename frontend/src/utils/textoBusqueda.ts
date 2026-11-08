/** Texto de búsqueda sin tildes y en minúsculas, igual que el servidor (TextoBusqueda): «perez» encuentra «Pérez». */
export const sinTildes = (texto: string | null | undefined) =>
  (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** true si el texto contiene la búsqueda, sin distinguir tildes ni mayúsculas. */
export const contiene = (texto: string | null | undefined, busqueda: string) => sinTildes(texto).includes(sinTildes(busqueda))
