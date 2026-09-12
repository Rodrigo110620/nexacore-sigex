import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#e9f1ff] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-10 text-center">
        <h1 className="text-2xl font-bold text-[#011140] mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-6">Módulo en desarrollo — Sprint 2</p>
        <button
          onClick={handleLogout}
          className="text-sm px-6 py-2 bg-[#0439D9] text-white rounded-lg hover:bg-[#0027a2]"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
