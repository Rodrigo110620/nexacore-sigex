import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PerfilDelRol from '../components/perfil/PerfilDelRol'
import CabeceraPerfil from '../components/perfil/CabeceraPerfil'
import { quitarMiFoto, subirMiFoto, type PerfilDelRol as Datos } from '../services/profileService'

vi.mock('../services/profileService', () => ({ subirMiFoto: vi.fn().mockResolvedValue(undefined), quitarMiFoto: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../services/estudianteService', () => ({ descargarFotoEstudiante: vi.fn().mockRejectedValue(new Error('sin foto en la prueba')) }))
vi.mock('../utils/fotoEstudiante', () => ({ validarArchivoFoto: () => null, prepararFoto: vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' })) }))

const datos = (extra: Partial<Datos> = {}): Datos => ({ permisos: [], docente: null, examenesAsignados: null, fotoUrl: null, ...extra })
const montar = (d: Datos, esAdmin = false) => render(<MemoryRouter><PerfilDelRol datos={d} esAdmin={esAdmin} /></MemoryRouter>)

describe('Mi perfil: lo propio de cada rol', () => {
  it('el docente ve sus datos, sus materias con grupos y lo que puede hacer', () => {
    montar(datos({
      permisos: [{ codigo: 'EXAMENES_GESTIONAR_PROPIOS', modulo: 'Exámenes', descripcion: 'Programar y editar sus exámenes' }],
      docente: { titulo: 'Lic.', especialidad: null, categoria: 'INTERINO',
        materias: [{ idMateria: 5, sigla: 'INF-261', nombre: 'Base de Datos I', grupos: ['G1', 'G2'] }] },
    }))
    const docente = screen.getByRole('region', { name: 'Datos del docente' })
    expect(within(docente).getByText('Lic.')).toBeInTheDocument()
    expect(within(docente).getByText('Interino')).toBeInTheDocument()
    expect(within(docente).getByText('Sin registrar')).toBeInTheDocument()
    expect(within(docente).getByText('INF-261 · Grupos: G1, G2')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mis exámenes asignados' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Lo que puedes hacer' })).getByText('Programar y editar sus exámenes')).toBeInTheDocument()
  })

  it('el control ve sus exámenes asignados', () => {
    montar(datos({ examenesAsignados: [{ idExamen: 7, materia: 'Cálculo I', fecha: '2026-11-09', horaInicio: '08:00:00', duracionMinutos: 90, aula: '690A', estado: 'programado' }] }))
    const lista = screen.getByRole('list', { name: 'Mis exámenes asignados' })
    expect(within(lista).getByRole('link')).toHaveAttribute('href', '/dashboard/control/7')
    expect(screen.queryByRole('region', { name: 'Datos del docente' })).not.toBeInTheDocument()
  })

  it('el ADMIN ve que tiene acceso total', () => {
    montar(datos(), true)
    expect(screen.getByText('Como administrador tienes acceso total al sistema.')).toBeInTheDocument()
  })
})

describe('Foto de perfil (opcional)', () => {
  beforeEach(() => { vi.mocked(subirMiFoto).mockClear(); vi.mocked(quitarMiFoto).mockClear() })
  const cabecera = (fotoUrl: string | null, onFotoCambiada = vi.fn()) => {
    render(<CabeceraPerfil nombre="Diego Pardo" iniciales="DP" email="diego@umss.edu" roles={['DOCENTE']} fotoUrl={fotoUrl} onFotoCambiada={onFotoCambiada} />)
    return onFotoCambiada
  }

  it('sin foto, la recomienda y la sube reducida', async () => {
    const recargar = cabecera(null)
    expect(screen.getByText(/Agrega una foto de perfil \(opcional, recomendable\)/)).toBeInTheDocument()
    expect(screen.getByText('Docente')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Elegir foto de perfil'), { target: { files: [new File(['x'], 'yo.png', { type: 'image/png' })] } })
    expect(await screen.findByText('Tu foto de perfil se actualizó.')).toBeInTheDocument()
    expect(subirMiFoto).toHaveBeenCalled()
    expect(recargar).toHaveBeenCalled()
  })

  it('con foto, se puede quitar', async () => {
    cabecera('/auth/me/foto')
    fireEvent.click(screen.getByRole('button', { name: /Quitar foto/ }))
    expect(await screen.findByText('Quitaste tu foto de perfil.')).toBeInTheDocument()
    expect(quitarMiFoto).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cambiar foto de perfil' })).toBeInTheDocument()
  })
})
