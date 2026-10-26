import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CronometroExamen from '../components/examenes/CronometroExamen'

const examen = { fecha: '2026-10-26', horaInicio: '09:00:00', duracionMinutos: 90 }

describe('cronómetro del estudiante expulsado', () => {
  it('se detiene en la hora oficial de la expulsión con el tiempo que le quedaba', () => {
    render(<CronometroExamen examen={examen} detenidoEn="2026-10-26T09:42:00" />)
    const cronometro = screen.getByRole('timer')
    expect(cronometro).toHaveTextContent('Cronómetro detenido')
    expect(cronometro).toHaveTextContent('Expulsión registrada a las 09:42')
    // Termina 10:30: a las 09:42 le quedaban 48 minutos, y no sigue corriendo.
    expect(cronometro).toHaveTextContent('48:00')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('sin expulsión, el cronómetro funciona como siempre', () => {
    render(<CronometroExamen examen={examen} />)
    expect(screen.getByRole('timer')).not.toHaveTextContent('Cronómetro detenido')
  })
})
