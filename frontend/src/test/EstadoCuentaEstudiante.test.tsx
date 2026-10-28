import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EstudianteTable from '../components/estudiantes/EstudianteTable'
import EstudianteCardList from '../components/estudiantes/EstudianteCardList'
import type { EstudianteListItem } from '../types/estudiante'

const estudiante = (id: number, tieneCuenta: boolean): EstudianteListItem => ({
  id, codigoSis: `20210401${id}`, nombre: id === 1 ? 'Ana' : 'Luis', apellidos: 'Rojas', ci: `748921${id}`, telefono: null,
  email: `20210401${id}@est.umss.edu`, carreras: [], estadoMatricula: 'MATRICULADO', tieneCuenta, fotoUrl: null,
})

describe('estado de la cuenta del estudiante', () => {
  it('la tabla muestra si activó su cuenta o está pendiente, aparte de la matrícula', () => {
    render(<EstudianteTable estudiantes={[estudiante(1, true), estudiante(2, false)]} />)
    const filas = screen.getAllByRole('row')
    expect(within(filas[1]).getByText('Cuenta activa')).toBeInTheDocument()
    expect(within(filas[2]).getByText('Pendiente de activación')).toBeInTheDocument()
    expect(screen.getAllByText('Matriculado')).toHaveLength(2)
  })

  it('las tarjetas del celular también lo muestran', () => {
    render(<EstudianteCardList estudiantes={[estudiante(2, false)]} />)
    expect(screen.getByText('Pendiente de activación')).toBeInTheDocument()
  })
})
