import axios, { type InternalAxiosRequestConfig } from 'axios'

/**
 * Instancia base de axios para todos los requests al backend.
 *
 * En desarrollo: por defecto `/api/v1` (misma origen). Vite hace proxy al backend,
 * así funciona en localhost, otra PC o móvil en la misma WiFi sin cambiar la URL.
 * Opcional: VITE_API_BASE_URL absoluto (ej. http://192.168.x.x:8080/api/v1).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 12000, // 12 s — evita que SMTP colgado bloquee indefinidamente
})

// Interceptor de request: adjunta el JWT si existe en localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de response: redirige al login SOLO si el token expiró.
// Regla: un 401 en rutas de autenticación propias (login, recovery) es un
// error de credenciales/flujo, no sesión vencida → el formulario debe mostrarlo.
// Un 401 en cualquier otra ruta significa que la sesión real expiró → logout.
// Excepción adicional: si la request lleva _skipAutoLogout=true (ej. creación de
// usuarios donde el backend a veces tarda por SMTP), se muestra el error en el
// componente en lugar de forzar un cierre de sesión.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = String(error.config?.url ?? '')
    const config = error.config as InternalAxiosRequestConfig & { _skipAutoLogout?: boolean }

    const isLoginRequest = url.includes('/auth/login')
    const isPasswordRecoveryRequest =
      url.includes('/auth/forgot-password') || url.includes('/auth/reset-password')
    const skipAutoLogout = config?._skipAutoLogout === true

    if (!error.response) {
      return Promise.reject(error)
    }

    const isTestEnv = import.meta.env.MODE === 'test'

    if (
      status === 401 &&
      !isLoginRequest &&
      !isPasswordRecoveryRequest &&
      !skipAutoLogout &&
      !isTestEnv
    ) {
      localStorage.removeItem('token')
      localStorage.removeItem('nombre')
      localStorage.removeItem('roles')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)
export default api
