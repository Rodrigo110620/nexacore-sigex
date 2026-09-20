/**
 * Utilidad de navegación imperativa para usarse fuera de componentes React
 * (por ejemplo en interceptores de axios).
 *
 * Uso:
 *   1. En AppRouter: setNavigate(navigate) dentro de un useEffect.
 *   2. En api.ts o cualquier módulo: navigateTo('/login').
 *
 * Si el navigate de React Router no está disponible aún, usa
 * window.location.replace como fallback (no agrega entrada al historial).
 */
let _navigate: ((path: string) => void) | null = null

export function setNavigate(fn: (path: string) => void): void {
  _navigate = fn
}

export function navigateTo(path: string): void {
  if (_navigate) {
    _navigate(path)
  } else {
    window.location.replace(path)
  }
}

/**
 * Callback de logout imperativo para usarse fuera de componentes React.
 * Se registra en AuthProvider y se llama desde el interceptor de axios
 * para actualizar el estado de React cuando el token expira (401).
 */
let _logout: (() => void) | null = null

export function setLogoutCallback(fn: () => void): void {
  _logout = fn
}

export function callLogout(): void {
  if (_logout) {
    _logout()
  } else {
    // Fallback: limpiar localStorage manualmente si AuthContext no está listo
    localStorage.removeItem('token')
    localStorage.removeItem('nombre')
    localStorage.removeItem('roles')
  }
}
