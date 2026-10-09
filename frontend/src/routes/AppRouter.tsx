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
import IntentosIngresoPage from '../pages/Control/IntentosIngresoPage'
import EstudianteRoute from './EstudianteRoute'
import InicioEnDesarrollo from '../components/control/InicioEnDesarrollo'

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

/** CONTROL tiene su panel operativo; ADMIN y DOCENTE conservan un Inicio neutro. */
function InicioRoute() {
  const { roles } = useAuth()
  return roles.includes('CONTROL') ? <ControlInicioPage /> : <InicioEnDesarrollo />
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
            <EstudianteRoute>
              <EstudiantesPage />
            </EstudianteRoute>
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
        <Route
          path="/dashboard/control"
          element={
            <ControlRoute>
              <ExamenesPage />
            </ControlRoute>
          }
        />

        {/* Inicio general: CONTROL ve su panel operativo; los demás roles ven el módulo en desarrollo. */}
        <Route
          path="/dashboard/inicio"
          element={
            <ProtectedRoute>
              <InicioRoute />
            </ProtectedRoute>
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
        <Route path="/dashboard/control/:idExamen/intentos" element={<IdentificacionRoute><IntentosIngresoPage /></IdentificacionRoute>} />
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
