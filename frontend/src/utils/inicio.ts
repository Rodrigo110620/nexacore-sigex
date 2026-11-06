/** Constantes y cálculos compartidos por los paneles de inicio (ADMIN y CONTROL). */

export const TARJETA = 'rounded-2xl border border-[#E8EDF5] bg-white shadow-[0_4px_16px_rgba(13,26,77,0.07)]'
export const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0)
export const formatoPct = (valor: number) => `${valor.toLocaleString('es-BO', { maximumFractionDigits: 1 })} %`
export const horaMinutos = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export function saludo(hora: number) {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Horas que muestran las gráficas del día: de las 07:00 (o antes, si hubo actividad) hasta la hora actual. */
export function horasDelDia(series: number[][], horaActual: number, hastaMinimo = horaActual): number[] {
  const conDatos = series.flatMap((s) => s.map((v, i) => (v ? i : -1)).filter((i) => i >= 0))
  const desde = Math.min(7, horaActual, ...conDatos)
  const hasta = Math.max(hastaMinimo, ...conDatos)
  return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
}
