/** "hoy · 06:12", "ayer · 21:14" o "19 oct. · 21:14". */
export function fechaCorta(iso: string, ahora = new Date()): string {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dias = Math.round(
    (new Date(ahora.toDateString()).getTime() - new Date(fecha.toDateString()).getTime()) / 86_400_000,
  )
  if (dias === 0) return `hoy · ${hora}`
  if (dias === 1) return `ayer · ${hora}`
  return `${fecha.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} · ${hora}`
}
