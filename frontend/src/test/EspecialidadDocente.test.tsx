import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DatosDocenteCampos from '../components/admin/DatosDocenteCampos'
import { DATOS_DOCENTE_INICIALES, errorEspecialidad, normalizarEspecialidad } from '../utils/datosDocente'

function Campo({ error }: { error?: string }) {
  const [v, setV] = useState(DATOS_DOCENTE_INICIALES)
  return <DatosDocenteCampos value={v} onChange={setV} error={error} />
}

describe('Especialidad del docente (BUG-C01, C02, C03)', () => {
  it('solo deja escribir letras y un espacio entre palabras, y avisa cuando se escribe otra cosa', () => {
    render(<Campo />)
    const campo = screen.getByLabelText('Especialidad')
    fireEvent.change(campo, { target: { value: ' Redes 2  de datos#' } })
    expect(campo).toHaveValue('Redes de datos')
    expect(screen.getByRole('alert')).toHaveTextContent('Solo se admiten letras y un espacio entre palabras.')
  })

  it('muestra el contador y, al salir del campo, el error si tiene menos de 10 caracteres', () => {
    render(<Campo />)
    const campo = screen.getByLabelText('Especialidad')
    expect(screen.getByText('0/100')).toBeInTheDocument()
    fireEvent.change(campo, { target: { value: 'Redes' } })
    expect(screen.getByText('5/100')).toBeInTheDocument()
    fireEvent.blur(campo)
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe al menos 10 caracteres (llevas 5).')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
  })

  it('al salir del campo lo deja en formato oración', () => {
    render(<Campo />)
    const campo = screen.getByLabelText('Especialidad')
    fireEvent.change(campo, { target: { value: 'bases DE DATOS ' } })
    fireEvent.blur(campo)
    expect(campo).toHaveValue('Bases de datos')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('reglas: opcional, 10 a 100 caracteres, solo letras', () => {
    expect(errorEspecialidad('')).toBeNull()
    expect(errorEspecialidad('Bases de datos')).toBeNull()
    expect(errorEspecialidad('fgfddreyydr')).toBeNull() // letras y 11 caracteres: el formato es válido
    expect(errorEspecialidad('Redes')).toMatch(/al menos 10/)
    expect(errorEspecialidad('Redes 2023 x')).toMatch(/Solo letras/)
    expect(normalizarEspecialidad('  ingeniería   DE software ')).toBe('Ingeniería de software')
  })

  it('muestra el error que marca el formulario al intentar avanzar', () => {
    render(<Campo error="Escribe al menos 10 caracteres (llevas 3)." />)
    expect(screen.getByRole('alert')).toHaveTextContent('llevas 3')
  })
})
