/** Avisa que el usuario cambió o quitó su foto de perfil (el avatar del menú de la cuenta se actualiza). */
export const EVENTO_MI_FOTO = 'sigex:mi-foto'

export function avisarCambioMiFoto(): void {
  window.dispatchEvent(new Event(EVENTO_MI_FOTO))
}
