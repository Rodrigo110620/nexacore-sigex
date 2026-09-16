import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import type { AuthRole } from '../types/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: AuthRole
}

/**
 * Envuelve rutas privadas.
 * Sin sesión activa → redirige a /login.
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, logout } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#E9F1FF] px-4">
        <section role="alert" aria-labelledby="access-denied-title" className="w-full max-w-md rounded-xl border border-[#B91C1C] bg-white p-8 text-center shadow-lg">
          <h1 id="access-denied-title" className="text-2xl font-bold text-[#B91C1C]">Acceso restringido</h1>
          <p className="mt-3 text-sm text-[#B91C1C]">No tienes permisos para consultar la gestión de usuarios.</p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 inline-flex h-11 items-center rounded-md bg-[#0439D9] px-5 text-sm font-semibold text-white hover:bg-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
          >
            Volver al inicio de sesión
          </button>
        </section>
      </main>
    )
  }

  return <>{children}</>
}
