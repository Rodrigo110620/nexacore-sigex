import { describe, expect, it } from 'vitest'

function minutesBetween(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null
  const diff = eh * 60 + em - (sh * 60 + sm)
  return diff > 0 ? diff : null
}

describe('duración de examen', () => {
  it('calcula minutos entre inicio y fin', () => {
    expect(minutesBetween('10:00', '12:00')).toBe(120)
    expect(minutesBetween('08:15', '09:45')).toBe(90)
  })

  it('rechaza fin anterior o igual al inicio', () => {
    expect(minutesBetween('12:00', '10:00')).toBeNull()
    expect(minutesBetween('10:00', '10:00')).toBeNull()
  })
})
