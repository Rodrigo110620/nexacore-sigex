import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import Footer from '../../components/layout/Footer'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import UserListContent from '../../components/users/UserListContent'
import useUsers from '../../hooks/useUsers'

export default function DashboardPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const {
    data,
    users,
    loading,
    error,
    updateFilters,
    changePage,
    retry,
  } = useUsers()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#E9F1FF] pb-24 lg:pb-0">
      <Header />
      <div className="border-b border-[#D8E3F5] bg-white px-4 py-3 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-[#B8CBEF] bg-white px-4 text-sm font-semibold text-[#011140] hover:bg-[#E9F1FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
          >
            <LogOut size={17} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>

      <main className="flex-1 bg-white">
        <UserListContent
          users={users}
          loading={loading}
          error={error}
          page={data.pagina}
          pageSize={data.tamano}
          totalRecords={data.totalRegistros}
          totalPages={data.totalPaginas}
          onFiltersChange={updateFilters}
          onPageChange={changePage}
          onRetry={retry}
        />
      </main>
      <MobileBottomNav />
      <Footer />
    </div>
  )
}
