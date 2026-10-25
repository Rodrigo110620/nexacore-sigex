import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { setNavigate } from '../utils/navigate'
import LoginPage from '../pages/Login/LoginPage'
import ForgotPasswordPage from '../pages/Login/ForgotPasswordPage'
import ResetPasswordPage from '../pages/Login/ResetPasswordPage'
import ActivarCuentaPage from '../pages/Login/ActivarCuentaPage'
import InicioEstudiantePage from '../pages/PortalEstudiante/InicioEstudiantePage'
import RegistrarFotoPage from '../pages/PortalEstudiante/RegistrarFotoPage'
import MiPerfilPage from '../pages/PortalEstudiante/MiPerfilPage'
import MiQrPage from '../pages/PortalEstudiante/MiQrPage'
import CambiarFotoPage from '../pages/PortalEstudiante/CambiarFotoPage'
import PortalEstudianteRoute from './PortalEstudianteRoute'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import InicioDocentePage from '../pages/Dashboard/InicioDocentePage'
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
import RevisionFotosPage from '../pages/panel_admin/RevisionFotosPage'
import InformacionIngresoPage from '../pages/Control/InformacionIngresoPage'
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

/** Cada rol tiene un inicio adaptado a su tarea principal. */
function InicioRoute() {
  const { roles } = useAuth()
  if (roles.includes('CONTROL')) return <ControlInicioPage />
  if (roles.includes('DOCENTE')) return <InicioDocentePage />
  return <InicioEnDesarrollo />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <NavigateRegistrar />
      <Routes>
        {/* Una sola instancia para "/" y "/login": así la landing anima hacia el formulario sin remontarse. */}
        <Route element={<LoginRoute />}>
          <Route path="/" element={null} />
          <Route path="/login" element={null} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* CTA-01: el estudiante activa su cuenta antes de su primer inicio de sesión. */}
        <Route path="/activar-cuenta" element={<ActivarCuentaPage />} />

        {/* Portal del estudiante (rol ESTUDIANTE). */}
        <Route
          path="/estudiante"
          element={
            <PortalEstudianteRoute>
              <InicioEstudiantePage />
            </PortalEstudianteRoute>
          }
        />
        {/* CTA-02: la foto es obligatoria antes de usar el portal. */}
        <Route
          path="/estudiante/foto"
          element={
            <PortalEstudianteRoute>
              <RegistrarFotoPage />
            </PortalEstudianteRoute>
          }
        />
        <Route
          path="/estudiante/qr"
          element={
            <PortalEstudianteRoute>
              <MiQrPage />
            </PortalEstudianteRoute>
          }
        />
        <Route
          path="/estudiante/perfil"
          element={
            <PortalEstudianteRoute>
              <MiPerfilPage />
            </PortalEstudianteRoute>
          }
        />
        <Route
          path="/estudiante/foto/cambiar"
          element={
            <PortalEstudianteRoute>
              <CambiarFotoPage />
            </PortalEstudianteRoute>
          }
        />

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
        {/* Revisión de fotos: cambios y reportes (SOLO ADMIN) */}
        <Route
          path="/dashboard/estudiantes/fotos"
          element={
            <AdminRoute>
              <RevisionFotosPage />
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
        <Route path="/dashboard/control/:idExamen/informacion" element={<IdentificacionRoute><InformacionIngresoPage /></IdentificacionRoute>} />
        <Route path="/dashboard/control/:idExamen/intentos" element={<IdentificacionRoute><InformacionIngresoPage /></IdentificacionRoute>} />
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
