import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginPage from '../pages/Login/LoginPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import ProtectedRoute from './ProtectedRoute'
import UsuariosPage from '../pages/panel_admin/UsuariosPage'   // 👈 AGREGAR

function LoginRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Ruta temporal para probar registro*/}
        <Route path="/test-modal" element={<UsuariosPage />} />
      </Routes>
    </BrowserRouter>
  )
}
