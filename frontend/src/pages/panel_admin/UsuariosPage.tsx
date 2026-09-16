import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import PanelLayout from '../../components/layout/PanelLayout'
import Footer from '../../components/layout/Footer'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import RegisterUserModal from '../../components/admin/RegisterUserModal'
import UserListContent from '../../components/users/UserListContent'
import useUsers from '../../hooks/useUsers'

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const {
    data,
    users,
    loading,
    error,
    updateFilters,
    changePage,
    retry,
  } = useUsers()

  return (
    <PanelLayout>
      <div className="min-h-full bg-[#E9F1FF] pb-24 lg:pb-0">
        <div className="flex items-center justify-between border-b border-[#D8E3F5] bg-white px-4 py-4 sm:px-6 lg:px-10">
          <h1 className="text-lg font-bold text-[#011140]">Gestión de Usuarios</h1>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
          >
            <UserPlus size={17} aria-hidden="true" />
            Registrar Usuario
          </button>
        </div>

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

        <Footer />
        <MobileBottomNav />
        <RegisterUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </PanelLayout>
  )
}
