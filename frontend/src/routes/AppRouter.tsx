import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { setNavigate } from '../utils/navigate'
import LoginPage from '../pages/Login/LoginPage'
import ForgotPasswordPage from '../pages/Login/ForgotPasswordPage'
import ResetPasswordPage from '../pages/Login/ResetPasswordPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import PerfilPage from '../pages/Dashboard/PerfilPage'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import UsuariosPage from '../pages/panel_admin/UsuariosPage'
import ExamenesPage from '../pages/Examenes/ExamenesPage'

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Dashboard general (cualquier usuario logueado) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Perfil del usuario autenticado */}
        <Route
          path="/dashboard/perfil"
          element={
            <ProtectedRoute>
              <PerfilPage />
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

        {/* Exámenes: ADMIN y DOCENTE pueden ver; solo ADMIN puede registrar/editar */}
        <Route
          path="/dashboard/examenes"
          element={
            <ProtectedRoute>
              <ExamenesPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}