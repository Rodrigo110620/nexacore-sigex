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
import ExamenDetallePage from '../pages/Examenes/ExamenDetallePage'
import IdentificacionPage from '../pages/Control/IdentificacionPage'
import ControlExamenPage from '../pages/Control/ControlExamenPage'
import ControlInicioPage from '../pages/Control/ControlInicioPage'
import ControlRoute from './ControlRoute'
import IdentificacionRoute from './IdentificacionRoute'
import ControlIngresoPage from '../pages/Control/ControlIngresoPage'
import EstudiantesPage from '../pages/panel_admin/EstudiantesPage'

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
        {/* Gestión de estudiantes (por el momento solo admin)*/}
        <Route
          path="/dashboard/estudiantes"
          element={
            <AdminRoute>
              <EstudiantesPage />
            </AdminRoute>
          }
        />
        {/* Exámenes: ADMIN y DOCENTE pueden ver; solo ADMIN puede registrar/editar */}
        <Route
          path="/dashboard/examenes/:idExamen/:idParalelo"
          element={
            <ProtectedRoute>
              <ExamenDetallePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/examenes"
          element={
            <ProtectedRoute>
              <ExamenesPage />
            </ProtectedRoute>
          }
        />

        {/* Inicio del rol CONTROL: exámenes en curso y del día (ACCS-01). */}
        <Route
          path="/dashboard/inicio"
          element={
            <ControlRoute>
              <ControlInicioPage />
            </ControlRoute>
          }
        />
        {/* Control del examen ACCS-01: estudiantes asignados; disponible para ADMIN y CONTROL. */}
        <Route
          path="/dashboard/control/:idExamen"
          element={
            <IdentificacionRoute>
              <ControlExamenPage />
            </IdentificacionRoute>
          }
        />
        {/* Identificación ACCS-01: disponible para ADMIN y CONTROL. */}
        <Route
          path="/dashboard/control/:idExamen/identificar"
          element={
            <IdentificacionRoute>
              <IdentificacionPage />
            </IdentificacionRoute>
          }
        />
        {/* ACCS-02: registrar el control y autorizar o denegar el ingreso. */}
        <Route
          path="/dashboard/control-ingresos/:idEstudiante/:idExamen"
          element={
            <ControlRoute>
              <ControlIngresoPage />
            </ControlRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
