import axios from 'axios'

/**
 * Instancia base de axios para todos los requests al backend.
 * La URL viene de la variable de entorno VITE_API_BASE_URL (definida en .env).
 *
 * Uso:
 *   import api from '@/services/api'
 *   const response = await api.get('/health')
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de request: adjunta el JWT si existe en localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de response: redirige al login si el token expiró
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
