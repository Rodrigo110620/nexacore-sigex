import { useState } from 'react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import RegisterUserModal from '../../components/admin/RegisterUserModal'
import UserListContent from '../../components/users/UserListContent'
import useUsers from '../../hooks/useUsers'
import useUserStats from '../../hooks/useUserStats'
import EditUserModal from '../../components/users/EditUserModal'
import ConfirmarEstadoUsuarioModal from '../../components/users/ConfirmarEstadoUsuarioModal'
import ImportarUsuariosModal from '../../components/users/ImportarUsuariosModal'
import { cambiarEstadoUsuario, exportarUsuarios } from '../../services/userService'
import type { UserFilterParams, UserListItem } from '../../types/user'

/** Mensaje del backend ({ mensaje }) o uno genérico si no hay respuesta. */
function mensajeDeError(error: unknown): string {
  const err = error as { response?: { data?: { mensaje?: string } } }
  if (!err.response) return 'No se pudo conectar con el servidor. Intenta más tarde.'
  return err.response.data?.mensaje || 'No se pudo cambiar el estado del usuario.'
}

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [userToToggle, setUserToToggle] = useState<UserListItem | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)

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

  const handleExport = (filters: UserFilterParams) => exportarUsuarios(filters)

  const handleConfirmToggle = async (activo: boolean) => {
    if (!userToToggle) return
    try {
      await cambiarEstadoUsuario(userToToggle.id, activo)
    } catch (error) {
      throw new Error(mensajeDeError(error))
    }
    setUserToToggle(null)
    refreshUsers()
  }

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
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
          onToggleBlockClick={setUserToToggle}
          onExportClick={handleExport}
          onImportClick={() => setIsImportOpen(true)}
        />
        <MobileBottomNav />
        <RegisterUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refreshUsers}
        />
        {isImportOpen && (
          <ImportarUsuariosModal
            open
            onClose={() => setIsImportOpen(false)}
            onImported={(result) => {
              if (result.insertados > 0) refreshUsers()
            }}
          />
        )}
        {userToToggle && (
          <ConfirmarEstadoUsuarioModal
            key={userToToggle.id}
            user={userToToggle}
            onCancel={() => setUserToToggle(null)}
            onConfirm={handleConfirmToggle}
          />
        )}
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
