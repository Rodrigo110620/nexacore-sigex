import axios from 'axios'
import api from './api'

/** Descarga un respaldo completo de la base (solo ADMIN, IMP-10). Devuelve el nombre del archivo. */
export async function descargarRespaldo(): Promise<string> {
  try {
    // pg_dump puede tardar con una base grande: más que los 12 s por defecto de api.
    const res = await api.get<Blob>('/admin/respaldo', { responseType: 'blob', timeout: 5 * 60 * 1000 })
    const disposicion = String(res.headers['content-disposition'] ?? '')
    const nombre = /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? 'sigex-respaldo.sql'
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = nombre
    link.click()
    URL.revokeObjectURL(url)
    return nombre
  } catch (err) {
    // Con responseType blob, el mensaje de error del servidor también llega como Blob.
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const datos = JSON.parse(await err.response.data.text()) as { mensaje?: string }
        if (datos.mensaje) throw new Error(datos.mensaje)
      } catch (e) {
        if (e instanceof Error && !(e instanceof SyntaxError)) throw e
      }
    }
    throw new Error('No se pudo descargar el respaldo. Inténtalo de nuevo.')
  }
}
