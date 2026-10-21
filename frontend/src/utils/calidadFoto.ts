/**
 * Medidas de calidad para el escaneo de rostro (CTA-02). Son funciones puras para poder probarlas
 * sin cámara: reciben los píxeles en gris o los puntos del rostro que entrega MediaPipe.
 */

export interface Punto {
  x: number
  y: number
}

/** Límites de la foto aceptable. Se ajustan probando con cámaras reales. */
export const LIMITES = {
  luzMinima: 70,
  luzMaxima: 215,
  nitidezMinima: 18,
  /** Alto del rostro respecto del alto de la imagen. */
  tamanoMinimo: 0.38,
  tamanoMaximo: 0.8,
  /** Cuánto se puede alejar el centro del rostro del centro del óvalo. */
  desvioMaximo: 0.12,
  /** Cuánto se puede girar o inclinar la cabeza para contar como "de frente". */
  giroFrente: 0.1,
  /** Cuánto hay que girar (izquierda/derecha) o inclinar (arriba/abajo) para contar la posición. */
  giroLateral: 0.12,
  inclinacionVertical: 0.08,
} as const

/** Posiciones del escaneo, en orden. La foto se toma en la primera (de frente). */
export const POSICIONES = ['frente', 'izquierda', 'derecha', 'arriba', 'abajo'] as const
export type Posicion = (typeof POSICIONES)[number]

/**
 * Indica si la cabeza está en la posición pedida. Los puntos de MediaPipe vienen de la imagen sin
 * espejo: cuando el estudiante gira hacia SU izquierda, la nariz se mueve hacia la derecha de la
 * imagen y el giro es positivo.
 */
export function posicionCumplida(posicion: Posicion, giro: number, inclinacion: number): boolean {
  switch (posicion) {
    case 'frente':
      return Math.abs(giro) <= LIMITES.giroFrente && Math.abs(inclinacion) <= LIMITES.giroFrente
    case 'izquierda':
      return giro >= LIMITES.giroLateral
    case 'derecha':
      return giro <= -LIMITES.giroLateral
    case 'arriba':
      return inclinacion <= -LIMITES.inclinacionVertical
    case 'abajo':
      return inclinacion >= LIMITES.inclinacionVertical
  }
}

/** Puntos de la malla de MediaPipe Face Landmarker que se usan para la orientación. */
const NARIZ = 1
const FRENTE = 10
const MENTON = 152
const MEJILLA_IZQUIERDA = 234
const MEJILLA_DERECHA = 454

/** Píxeles RGBA → luminancia (0-255) de cada píxel. */
export function aGrises(rgba: Uint8ClampedArray): Float32Array {
  const gris = new Float32Array(rgba.length / 4)
  for (let i = 0; i < gris.length; i++) {
    gris[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
  }
  return gris
}

/** Brillo promedio (0-255). */
export function luzPromedio(gris: Float32Array): number {
  if (gris.length === 0) return 0
  let suma = 0
  for (const valor of gris) suma += valor
  return suma / gris.length
}

/** Nitidez: varianza del laplaciano. Una imagen borrosa tiene bordes suaves y da un valor bajo. */
export function nitidez(gris: Float32Array, ancho: number, alto: number): number {
  if (ancho < 3 || alto < 3) return 0
  const valores: number[] = []
  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x
      valores.push(gris[i - ancho] + gris[i + ancho] + gris[i - 1] + gris[i + 1] - 4 * gris[i])
    }
  }
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  return valores.reduce((a, v) => a + (v - media) ** 2, 0) / valores.length
}

/** Caja del rostro en coordenadas normalizadas (0-1). */
export function cajaDelRostro(puntos: Punto[]) {
  const xs = puntos.map((p) => p.x)
  const ys = puntos.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y }
}

/**
 * Orientación de la cabeza a partir de la posición de la nariz.
 * giro: 0 de frente; negativo o positivo según hacia qué lado de la imagen gira.
 * inclinacion: 0 de frente; negativo mirando arriba, positivo mirando abajo.
 */
export function orientacion(puntos: Punto[]) {
  const nariz = puntos[NARIZ]
  const izquierda = puntos[MEJILLA_IZQUIERDA]
  const derecha = puntos[MEJILLA_DERECHA]
  const frente = puntos[FRENTE]
  const menton = puntos[MENTON]
  const giro = (nariz.x - izquierda.x) / (derecha.x - izquierda.x) - 0.5
  // De frente, la nariz queda un poco por debajo de la mitad entre la frente y el mentón.
  const inclinacion = (nariz.y - frente.y) / (menton.y - frente.y) - 0.56
  return { giro, inclinacion }
}

export type EstadoControl = 'ok' | 'falta'

export interface Medicion {
  rostros: number
  luz: number
  nitidez: number
  caja: { x: number; y: number; ancho: number; alto: number } | null
  giro: number
  inclinacion: number
}

export interface Evaluacion {
  luz: EstadoControl
  nitidez: EstadoControl
  centrado: EstadoControl
  deFrente: boolean
  /** Lo primero que el estudiante debe corregir, o null si todo está bien. */
  indicacion: string | null
}

/** Revisa la medición del cuadro actual y dice qué falta corregir. */
export function evaluar(m: Medicion): Evaluacion {
  const sinRostro: Evaluacion = { luz: 'falta', nitidez: 'falta', centrado: 'falta', deFrente: false, indicacion: '' }
  if (m.rostros === 0 || !m.caja) return { ...sinRostro, indicacion: 'Ubica tu rostro dentro del óvalo' }
  if (m.rostros > 1) return { ...sinRostro, indicacion: 'Solo debe aparecer una persona' }

  const luz: EstadoControl = m.luz >= LIMITES.luzMinima && m.luz <= LIMITES.luzMaxima ? 'ok' : 'falta'
  const nitida: EstadoControl = m.nitidez >= LIMITES.nitidezMinima ? 'ok' : 'falta'
  const centroX = m.caja.x + m.caja.ancho / 2
  const centroY = m.caja.y + m.caja.alto / 2
  const lejos = m.caja.alto < LIMITES.tamanoMinimo
  const cerca = m.caja.alto > LIMITES.tamanoMaximo
  const descentrado = Math.abs(centroX - 0.5) > LIMITES.desvioMaximo || Math.abs(centroY - 0.5) > LIMITES.desvioMaximo
  const centrado: EstadoControl = !lejos && !cerca && !descentrado ? 'ok' : 'falta'
  const deFrente = posicionCumplida('frente', m.giro, m.inclinacion)

  let indicacion: string | null = null
  if (lejos) indicacion = 'Acércate un poco a la cámara'
  else if (cerca) indicacion = 'Aléjate un poco de la cámara'
  else if (descentrado) indicacion = 'Centra tu rostro en el óvalo'
  else if (luz === 'falta') indicacion = m.luz < LIMITES.luzMinima ? 'Hay poca luz: busca un lugar más iluminado' : 'Hay demasiada luz: evita la luz directa'
  else if (nitida === 'falta') indicacion = 'La imagen está borrosa: quédate quieto'
  else if (!deFrente) indicacion = 'Mira de frente a la cámara'

  return { luz, nitidez: nitida, centrado, deFrente, indicacion }
}
