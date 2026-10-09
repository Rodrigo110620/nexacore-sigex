import { describe, expect, it } from 'vitest'

function parseHora24(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

function sanitizeHoraInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function minutesBetween(start: string, end: string): number | null {
  const a = parseHora24(start)
  const b = parseHora24(end)
  if (!a || !b) return null
  const diff = b.h * 60 + b.m - (a.h * 60 + a.m)
  return diff > 0 ? diff : null
}

describe('duración de examen', () => {
  it('calcula minutos entre inicio y fin (24 h)', () => {
    expect(minutesBetween('10:00', '12:00')).toBe(120)
    expect(minutesBetween('08:15', '09:45')).toBe(90)
    expect(minutesBetween('13:00', '15:30')).toBe(150)
  })

  it('rechaza fin anterior o igual al inicio', () => {
    expect(minutesBetween('12:00', '10:00')).toBeNull()
    expect(minutesBetween('10:00', '10:00')).toBeNull()
  })

  it('rechaza horas fuera de 00–23 / minutos fuera de 00–59', () => {
    expect(parseHora24('24:00')).toBeNull()
    expect(parseHora24('13:60')).toBeNull()
    expect(parseHora24('8:00')).toEqual({ h: 8, m: 0 })
  })

  it('formatea entrada manual a HH:MM', () => {
    expect(sanitizeHoraInput('1300')).toBe('13:00')
    expect(sanitizeHoraInput('0800')).toBe('08:00')
    expect(sanitizeHoraInput('13:45')).toBe('13:45')
  })
})
