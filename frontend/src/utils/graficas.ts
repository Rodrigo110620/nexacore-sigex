/** Utilidades de las gráficas SVG del panel de inicio. */

/** Curva suave (Catmull-Rom) que no baja de la línea base `piso`. */
export function curvaSuave(puntos: [number, number][], piso: number): string {
  if (puntos.length === 0) return ''
  let d = `M${puntos[0][0].toFixed(1)} ${puntos[0][1].toFixed(1)}`
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i]
    const p1 = puntos[i]
    const p2 = puntos[i + 1]
    const p3 = puntos[i + 2] ?? p2
    const c1y = Math.min(piso, p1[1] + (p2[1] - p0[1]) / 6)
    const c2y = Math.min(piso, p2[1] - (p3[1] - p1[1]) / 6)
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${c1y.toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

/** Máximo del eje con 3 tramos iguales y "redondos": 3, 6, 15, 30, 60, 150, 450... */
export function maximoEje(valor: number): number {
  const tramo = Math.max(1, valor) / 3
  const base = 10 ** Math.floor(Math.log10(tramo))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * base).find((m) => m >= tramo) ?? 10 * base
  return Math.max(3, Math.ceil(paso) * 3)
}
