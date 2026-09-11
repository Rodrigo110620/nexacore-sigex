import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PlasmaDesktop from './components/PlasmaDesktop'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import ScannerPage from './pages/ScannerQR/ScannerPage'
import ReportesPage from './pages/Reportes/ReportesPage'
import AparienciaPage from './pages/Apariencia/AparienciaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PlasmaDesktop />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/apariencia" element={<AparienciaPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
