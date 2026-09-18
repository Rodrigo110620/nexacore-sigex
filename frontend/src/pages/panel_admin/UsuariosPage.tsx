import { useState } from 'react'
import PanelLayout from '../../components/layout/PanelLayout'
import Footer from '../../components/layout/Footer'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import RegisterUserModal from '../../components/admin/RegisterUserModal'
import UserListContent from '../../components/users/UserListContent'
import useUsers from '../../hooks/useUsers'
import useUserStats from '../../hooks/useUserStats'
import EditUserModal from '../../components/users/EditUserModal'
import type { UserListItem } from '../../types/user'

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)

  const handleEditClick = (user: UserListItem) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const {
    data,
    users,
    loading,
    error,
    updateFilters,
    changePage,
    retry,
  } = useUsers()
  const { stats, retry: retryStats } = useUserStats()

  const refreshUsers = () => {
    retry()
    retryStats()
  }

  return (
    <PanelLayout>
      <div
        className="min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}
      >
        <UserListContent
          users={users}
          stats={stats ?? undefined}
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
          onEditClick={handleEditClick}
        />
        <div className="hidden lg:block">
          <Footer />
        </div>
        <MobileBottomNav />
        <RegisterUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refreshUsers}
        />
        {isEditModalOpen && selectedUser && (
          <EditUserModal
            key={selectedUser.id}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedUser(null)
            }}
            user={selectedUser}
            onSaveSuccess={refreshUsers}
          />
        )}
      </div>
    </PanelLayout>
  )
}
