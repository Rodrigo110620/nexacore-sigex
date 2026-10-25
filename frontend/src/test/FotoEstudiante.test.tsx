import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FotoEstudiante from '../components/estudiantes/FotoEstudiante'
import { descargarFotoEstudiante } from '../services/estudianteService'
import { etiquetaCondicion } from '../utils/condicionEstudiante'
import { validarArchivoFoto } from '../utils/fotoEstudiante'

vi.mock('../services/estudianteService', () => ({ descargarFotoEstudiante: vi.fn() }))

describe('FotoEstudiante', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:foto-laura')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.mocked(descargarFotoEstudiante).mockReset()
  })

  it('sin foto muestra las iniciales y no pide nada al servidor', () => {
    render(<FotoEstudiante nombre="Laura Paredes" iniciales="LP" className="avatar" />)
    expect(screen.getByText('LP')).toBeInTheDocument()
    expect(descargarFotoEstudiante).not.toHaveBeenCalled()
  })

  it('descarga la foto con el token y la muestra en lugar de las iniciales', async () => {
    vi.mocked(descargarFotoEstudiante).mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
    render(<FotoEstudiante fotoUrl="/estudiantes/10/foto" nombre="Laura Paredes" iniciales="LP" className="avatar" />)

    const img = await screen.findByRole('img', { name: 'Fotografía de Laura Paredes' })
    expect(img).toHaveAttribute('src', 'blob:foto-laura')
    expect(descargarFotoEstudiante).toHaveBeenCalledWith('/estudiantes/10/foto', expect.any(AbortSignal))
  })

  it('si la descarga falla se quedan las iniciales', async () => {
    vi.mocked(descargarFotoEstudiante).mockRejectedValue(new Error('404'))
    render(<FotoEstudiante fotoUrl="/estudiantes/10/foto" nombre="Laura Paredes" iniciales="LP" className="avatar" />)
    await vi.waitFor(() => expect(descargarFotoEstudiante).toHaveBeenCalled())
    expect(screen.getByText('LP')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('condición y archivo de la foto', () => {
  it('muestra la condición del estudiante; sin dato es regular', () => {
    expect(etiquetaCondicion('POSTULANTE')).toBe('Postulante')
    expect(etiquetaCondicion('REGULAR')).toBe('Estudiante regular')
    expect(etiquetaCondicion(null)).toBe('Estudiante regular')
  })

  it('solo acepta imágenes JPG, PNG o WEBP', () => {
    expect(validarArchivoFoto(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))).toBeNull()
    expect(validarArchivoFoto(new File(['x'], 'doc.pdf', { type: 'application/pdf' })))
      .toBe('La fotografía debe ser una imagen JPG, PNG o WEBP.')
  })
})

describe('FotoEstudiante ampliable', () => {
  const foto = 'blob:foto-de-prueba'

  it('al tocar la foto se ve en grande con su nombre y código, y se cierra con Escape', () => {
    render(<FotoEstudiante src={foto} nombre="Ana Prueba" iniciales="AP" className="h-10 w-10" ampliable detalle="Código: 202104010" />)

    fireEvent.click(screen.getByRole('button', { name: 'Ver la foto de Ana Prueba en grande' }))
    const ampliada = screen.getByRole('dialog', { name: 'Foto de Ana Prueba' })
    expect(ampliada).toHaveTextContent('Ana Prueba')
    expect(ampliada).toHaveTextContent('Código: 202104010')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra la acción (p. ej. reportar la foto) y la cierra al usarla', () => {
    const reportar = vi.fn()
    render(<FotoEstudiante src={foto} nombre="Ana Prueba" iniciales="AP" className="h-10 w-10" ampliable
      accionAmpliada={(cerrar) => <button type="button" onClick={() => { cerrar(); reportar() }}>Reportar foto</button>} />)

    fireEvent.click(screen.getByRole('button', { name: /en grande/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Reportar foto' }))
    expect(reportar).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sin foto (solo iniciales) no hay nada que ampliar', () => {
    render(<FotoEstudiante nombre="Ana Prueba" iniciales="AP" className="h-10 w-10" ampliable />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('AP')).toBeInTheDocument()
  })
})
