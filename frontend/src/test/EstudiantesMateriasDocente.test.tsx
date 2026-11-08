import { useState } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EstudianteDocenteFilters from '../components/estudiantes/EstudianteDocenteFilters'
import EstudianteTable from '../components/estudiantes/EstudianteTable'
import EstudianteCardList from '../components/estudiantes/EstudianteCardList'
import FichaEstudianteModal from '../components/estudiantes/FichaEstudianteModal'
import type { EstudianteFilterParams, EstudianteListItem } from '../types/estudiante'

vi.mock('../services/estudianteService', () => ({ getMateriasDocente: vi.fn().mockResolvedValue([
  { idMateria: 1, materia: 'Base de datos', idParalelo: 11, paralelo: 'A' },
  { idMateria: 1, materia: 'Base de datos', idParalelo: 12, paralelo: 'B' },
  { idMateria: 2, materia: 'Programacion funcional', idParalelo: 21, paralelo: 'C' },
]) }))
vi.mock('../components/control/AvisoFotoReportada', () => ({ AvisoFotoReportadaDe: () => null }))
const estudiante: EstudianteListItem = { id: 1, nombre: 'Ana', apellidos: 'Perez', codigoSis: '202600001', ci: '8888888', carreras: [], materiasDocente: [
  { idMateria: 1, materia: 'Base de datos', idParalelo: 11, paralelo: 'A' },
  { idMateria: 2, materia: 'Programacion funcional', idParalelo: 21, paralelo: 'C' },
] }
function Filtros() {
  const [value, onChange] = useState<EstudianteFilterParams>({ search: '', idCarrera: '', idFacultad: '' })
  return <EstudianteDocenteFilters value={value} onChange={onChange} />
}
describe('materias del docente en Estudiantes', () => {
  it('agrupa las materias y reinicia el paralelo al cambiar de materia', async () => {
    render(<Filtros />)
    await screen.findByRole('option', { name: 'Base de datos' })
    expect(screen.getAllByRole('option', { name: 'Base de datos' })).toHaveLength(1)
    const materia = screen.getByRole('combobox', { name: 'Materia' })
    const paralelo = screen.getByRole('combobox', { name: 'Paralelo' })
    expect(paralelo).toBeDisabled()
    fireEvent.change(materia, { target: { value: '1' } })
    fireEvent.change(paralelo, { target: { value: '12' } })
    expect(paralelo).toHaveValue('12')
    fireEvent.change(materia, { target: { value: '2' } })
    expect(paralelo).toHaveValue('')
    expect(within(paralelo).queryByRole('option', { name: 'B' })).not.toBeInTheDocument()
    expect(within(paralelo).getByRole('option', { name: 'C' })).toBeInTheDocument()
  })
  it('muestra ambas materias en tabla, tarjetas y ficha sin duplicar al estudiante', () => {
    const { unmount } = render(<EstudianteTable estudiantes={[estudiante]} puedeEditar={false} />)
    expect(screen.getAllByRole('row')).toHaveLength(2)
    // En la lista se pliegan: "2 materias" y, al tocarlo, se despliegan.
    const plegadas = screen.getByRole('button', { name: /2 materias/ })
    expect(screen.queryByText('Base de datos')).not.toBeInTheDocument()
    fireEvent.click(plegadas)
    expect(screen.getByText('Base de datos')).toBeInTheDocument()
    expect(screen.getByText('Programacion funcional')).toBeInTheDocument()
    unmount()
    // Con un grupo elegido, las materias sobran y se ve la carrera.
    const conGrupo = render(<EstudianteTable estudiantes={[estudiante]} puedeEditar={false} ocultarMaterias />)
    expect(screen.queryByRole('button', { name: /materias/ })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Carrera Profesional' })).toBeInTheDocument()
    conGrupo.unmount()
    const cards = render(<EstudianteCardList estudiantes={[estudiante]} puedeEditar={false} />)
    fireEvent.click(screen.getByRole('button', { name: /2 materias/ }))
    expect(screen.getByText('Base de datos')).toBeInTheDocument()
    cards.unmount()
    render(<FichaEstudianteModal open estudiante={estudiante} onClose={() => {}} />)
    const materias = screen.getByRole('region', { name: 'Materias con este docente' })
    expect(within(materias).getByText('Base de datos')).toBeInTheDocument()
    expect(within(materias).getByText('Programacion funcional')).toBeInTheDocument()
  })
})
