import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { ProtectedRoute } from '../components/ProtectedRoute'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import LoginPage from '../pages/Login/LoginPage'
import ReportesPage from '../pages/Reportes/ReportesPage'
import ScannerQRPage from '../pages/ScannerQR/ScannerQRPage'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/scanner" element={<ScannerQRPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
