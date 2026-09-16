import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { setNavigate } from '../utils/navigate'
import LoginPage from '../pages/Login/LoginPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import UsuariosPage from '../pages/panel_admin/UsuariosPage'

function LoginRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

/** Registra el navigate de React Router para que api.ts pueda usarlo. */
function NavigateRegistrar() {
  const navigate = useNavigate()
  useEffect(() => {
    setNavigate((path) => navigate(path, { replace: true }))
  }, [navigate])
  return null
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <NavigateRegistrar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginRoute />} />

        {/* Dashboard general (cualquier usuario logueado) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Gestión de usuarios (SOLO ADMIN) */}
        <Route
          path="/dashboard/usuarios"
          element={
            <AdminRoute>
              <UsuariosPage />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}