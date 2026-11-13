import { describe, expect, it } from 'vitest'
import { enlaceNotificacion } from '../utils/incidencias'
import type { Notificacion } from '../services/notificacionService'

const aviso = (tipo: string, extra: Partial<Notificacion> = {}): Notificacion => ({
  id: 1, tipo, titulo: 't', detalle: null, idExamen: 4, idEstudiante: 8, enlace: '/dashboard/control/4/informacion',
  creadaEn: '2026-11-12T19:18:42', leida: false, ...extra,
})

describe('Al tocar una notificación lleva directo al caso', () => {
  it('intentos, aula incorrecta y QR duplicado: pestaña Intentos con el estudiante y la hora', () => {
    for (const tipo of ['INTENTO_INGRESO', 'AULA_INCORRECTA', 'QR_DUPLICADO']) {
      expect(enlaceNotificacion(aviso(tipo))).toBe('/dashboard/control/4/informacion?estudiante=8&pestana=intentos&hora=2026-11-12T19%3A18')
    }
  })

  it('excepción de no habilitado e ingreso manual: pestaña Excepciones con el estudiante', () => {
    expect(enlaceNotificacion(aviso('EXCEPCION_NO_HABILITADO'))).toBe('/dashboard/control/4/informacion?estudiante=8&pestana=excepciones')
    expect(enlaceNotificacion(aviso('INGRESO_MANUAL'))).toBe('/dashboard/control/4/informacion?estudiante=8&pestana=excepciones')
  })

  it('expulsión, anulación y traslado: el panel del examen con el estudiante resaltado', () => {
    for (const tipo of ['EXPULSION', 'EXPULSION_ANULADA', 'TRASLADO_AMBIENTE']) {
      expect(enlaceNotificacion(aviso(tipo))).toBe('/dashboard/control/4?estudiante=8')
    }
  })

  it('aula llena, foto reportada y mesa de ayuda', () => {
    expect(enlaceNotificacion(aviso('AULA_LLENA', { idEstudiante: null }))).toBe('/dashboard/control/4')
    expect(enlaceNotificacion(aviso('FOTO_REPORTADA'))).toBe('/dashboard/estudiantes/fotos?estudiante=8')
    expect(enlaceNotificacion(aviso('AYUDA', { idExamen: null, idEstudiante: null, enlace: '/dashboard/mesa-ayuda' }))).toBe('/dashboard/mesa-ayuda')
  })
})
