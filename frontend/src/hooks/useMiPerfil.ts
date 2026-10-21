import { useCallback, useEffect, useState } from 'react'
import { obtenerMiPerfil, type MiPerfilEstudiante } from '../services/panelEstudianteService'

/** Carga el perfil del estudiante con sesión iniciada (GET /mi/perfil). */
export default function useMiPerfil() {
  const [perfil, setPerfil] = useState<MiPerfilEstudiante | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    obtenerMiPerfil()
      .then((datos) => {
        if (!vigente) return
        setPerfil(datos)
        setCargando(false)
      })
      .catch((err: unknown) => {
        if (!vigente) return
        setError(err instanceof Error ? err.message : 'No se pudo cargar tu perfil.')
        setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [intento])

  const recargar = useCallback(() => {
    setCargando(true)
    setError('')
    setIntento((n) => n + 1)
  }, [])

  return { perfil, cargando, error, recargar }
}
