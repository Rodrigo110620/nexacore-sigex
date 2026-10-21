import { describe, it, expect } from 'vitest'
import { aGrises, cajaDelRostro, evaluar, luzPromedio, nitidez, orientacion, type Medicion, type Punto } from '../utils/calidadFoto'

/** Medición de un rostro centrado, nítido, con buena luz y de frente. */
const BUENA: Medicion = {
  rostros: 1,
  luz: 140,
  nitidez: 60,
  caja: { x: 0.35, y: 0.25, ancho: 0.3, alto: 0.5 },
  giro: 0,
  inclinacion: 0,
}

/** Malla mínima: solo los 5 puntos que usa la orientación (el resto da igual). */
function malla(nariz: Punto): Punto[] {
  const puntos: Punto[] = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }))
  puntos[1] = nariz
  puntos[10] = { x: 0.5, y: 0.2 }
  puntos[152] = { x: 0.5, y: 0.8 }
  puntos[234] = { x: 0.3, y: 0.5 }
  puntos[454] = { x: 0.7, y: 0.5 }
  return puntos
}

describe('calidadFoto (CTA-02)', () => {
  it('convierte a grises y mide el brillo promedio', () => {
    const blanco = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])
    expect(luzPromedio(aGrises(blanco))).toBeCloseTo(127.5, 0)
  })

  it('una imagen con bordes es más nítida que una lisa', () => {
    const ancho = 8
    const lisa = new Float32Array(ancho * ancho).fill(120)
    const tablero = new Float32Array(ancho * ancho).map((_, i) => ((i % ancho) + Math.floor(i / ancho)) % 2 ? 255 : 0)
    expect(nitidez(lisa, ancho, ancho)).toBe(0)
    expect(nitidez(tablero, ancho, ancho)).toBeGreaterThan(1000)
  })

  it('calcula la caja del rostro', () => {
    expect(cajaDelRostro([{ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.9 }])).toEqual({ x: 0.2, y: 0.3, ancho: expect.closeTo(0.4), alto: expect.closeTo(0.6) })
  })

  it('de frente el giro y la inclinación son casi cero; de lado cambian', () => {
    const frente = orientacion(malla({ x: 0.5, y: 0.536 }))
    expect(Math.abs(frente.giro)).toBeLessThan(0.01)
    expect(Math.abs(frente.inclinacion)).toBeLessThan(0.01)
    expect(orientacion(malla({ x: 0.36, y: 0.536 })).giro).toBeLessThan(-0.2)
    expect(orientacion(malla({ x: 0.5, y: 0.4 })).inclinacion).toBeLessThan(-0.15)
  })

  it('acepta un rostro centrado, nítido, con buena luz y de frente', () => {
    expect(evaluar(BUENA)).toEqual({ luz: 'ok', nitidez: 'ok', centrado: 'ok', deFrente: true, indicacion: null })
  })

  it('pide una sola persona y un rostro en el óvalo', () => {
    expect(evaluar({ ...BUENA, rostros: 0, caja: null }).indicacion).toBe('Ubica tu rostro dentro del óvalo')
    expect(evaluar({ ...BUENA, rostros: 2 }).indicacion).toBe('Solo debe aparecer una persona')
  })

  it('indica acercarse, alejarse o centrarse', () => {
    expect(evaluar({ ...BUENA, caja: { x: 0.45, y: 0.4, ancho: 0.1, alto: 0.2 } }).indicacion).toBe('Acércate un poco a la cámara')
    expect(evaluar({ ...BUENA, caja: { x: 0.1, y: 0.05, ancho: 0.8, alto: 0.9 } }).indicacion).toBe('Aléjate un poco de la cámara')
    expect(evaluar({ ...BUENA, caja: { x: 0.05, y: 0.25, ancho: 0.3, alto: 0.5 } }).indicacion).toBe('Centra tu rostro en el óvalo')
  })

  it('rechaza poca luz, demasiada luz e imagen borrosa', () => {
    expect(evaluar({ ...BUENA, luz: 40 })).toMatchObject({ luz: 'falta', indicacion: 'Hay poca luz: busca un lugar más iluminado' })
    expect(evaluar({ ...BUENA, luz: 240 }).indicacion).toBe('Hay demasiada luz: evita la luz directa')
    expect(evaluar({ ...BUENA, nitidez: 5 })).toMatchObject({ nitidez: 'falta', indicacion: 'La imagen está borrosa: quédate quieto' })
  })

  it('pide mirar de frente si la cabeza está girada', () => {
    expect(evaluar({ ...BUENA, giro: 0.25 })).toMatchObject({ deFrente: false, indicacion: 'Mira de frente a la cámara' })
  })
})
