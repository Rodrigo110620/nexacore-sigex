import api from './api'

/** Una sesión abierta de mi cuenta (navegador y dispositivo); actual = la de este dispositivo. */
export interface SesionDto {
  idSesion: string
  dispositivo: string
  ip: string | null
  iniciadaEn: string
  ultimaActividad: string
  actual: boolean
}

export async function listarMisSesiones(): Promise<SesionDto[]> {
  const { data } = await api.get<SesionDto[]>('/auth/sesiones')
  return data
}

export async function cerrarSesionDe(idSesion: string): Promise<void> {
  await api.delete(`/auth/sesiones/${encodeURIComponent(idSesion)}`)
}

export async function cerrarOtrasSesiones(): Promise<number> {
  const { data } = await api.post<{ cerradas: number }>('/auth/sesiones/cerrar-otras')
  return data.cerradas
}

/**
 * Al cerrar sesión se avisa al servidor para que el token deje de servir (si alguien lo copió, ya no entra). Se envía
 * con el token explícito porque el almacenamiento local se limpia enseguida; si falla (sin conexión), no se bloquea.
 */
export function avisarCierreDeSesion(token: string | null): void {
  if (!token) return
  try {
    const envio = api.post('/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
      _skipAutoLogout: true,
    } as Parameters<typeof api.post>[2])
    if (envio && typeof envio.catch === 'function') envio.catch(() => undefined)
  } catch {
    // Sin conexión o en pruebas: cerrar sesión en este dispositivo no depende del servidor.
  }
}
