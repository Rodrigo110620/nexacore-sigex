import { useState, useEffect } from 'react'
import api from '../services/api'
import { type RolOption, ROLES_OPTIONS } from '../types/usuario.types'

interface RolApi {
  id: number
  nombre: string
}

/**
 * Diccionario de etiquetas para roles conocidos.
 * Cualquier rol nuevo que llegue de la BD se muestra con su nombre como título.
 */
const ETIQUETAS: Record<string, Omit<RolOption, 'value'>> = {
  ADMIN: { titulo: 'Administrador', subtitulo: 'ROOT', descripcion: 'Acceso total al sistema' },
  DOCENTE: { titulo: 'Docente', subtitulo: 'EVALUADOR', descripcion: 'Gestión de exámenes y evaluaciones' },
  CONTROL: { titulo: 'P. Control', subtitulo: 'VIGILANCIA', descripcion: 'Control de ingreso a exámenes' },
}

function mapearRol(nombre: string): RolOption {
  const etiqueta = ETIQUETAS[nombre]
  if (etiqueta) return { value: nombre, ...etiqueta }
  // Rol desconocido: se muestra con su nombre directamente
  return { value: nombre, titulo: nombre, subtitulo: nombre, descripcion: nombre }
}

/**
 * Obtiene y gestiona los roles desde la API.
 * - cargando: true mientras se espera la primera respuesta
 * - crearRol: llama a POST /usuarios/roles y refresca la lista
 */
export function useRoles() {
  const [roles, setRoles] = useState<RolOption[]>(ROLES_OPTIONS)
  const [cargando, setCargando] = useState(true)

  const cargarRoles = async () => {
    try {
      const { data } = await api.get<RolApi[]>('/usuarios/roles')
      setRoles(data.map(r => mapearRol(r.nombre)))
    } catch {
      // Si falla, se quedan los ROLES_OPTIONS estáticos como fallback
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarRoles()
  }, [])

  const crearRol = async (nombre: string): Promise<void> => {
    await api.post('/usuarios/roles', { nombre: nombre.toUpperCase() })
    await cargarRoles()
  }

  return { roles, cargando, crearRol }
}
