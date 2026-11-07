import api from './api'

/** Un archivo que el servidor devolvió: su contenido y el nombre que mandó en Content-Disposition. */
export interface Archivo {
  blob: Blob
  nombre: string
}

export async function obtenerArchivo(ruta: string, params?: Record<string, unknown>, nombrePorDefecto = 'archivo'): Promise<Archivo> {
  const res = await api.get<Blob>(ruta, { params, responseType: 'blob', timeout: 2 * 60 * 1000 })
  const disposicion = String(res.headers['content-disposition'] ?? '')
  const nombre = /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? nombrePorDefecto
  return { blob: res.data, nombre }
}

/** Guarda el archivo en el equipo con su nombre. */
export function guardarArchivo({ blob, nombre }: Archivo) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

/** Lee un CSV (con ',' o ';', comillas y BOM) en filas de texto, para la vista previa. */
export function leerCsv(texto: string): string[][] {
  texto = texto.replace(/^\uFEFF/, '')
  const primera = texto.split('\n', 1)[0] ?? ''
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ';' : ','
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo); campo = ''
      if (fila.some((v) => v !== '')) filas.push(fila)
      fila = []
    } else campo += c
  }
  fila.push(campo)
  if (fila.some((v) => v !== '')) filas.push(fila)
  return filas
}
