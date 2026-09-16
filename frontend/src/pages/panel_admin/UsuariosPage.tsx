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
          onRegisterClick={() => setIsModalOpen(true)}
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
