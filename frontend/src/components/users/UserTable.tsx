import { Ban, MoreHorizontal, Pencil } from 'lucide-react'
import RoleBadge from './RoleBadge'
import StatusBadge from './StatusBadge'
import UserAvatar from './UserAvatar'
import type { UserListItem } from '../../types/user'

interface UserTableProps {
  users: UserListItem[]

  onEditClick?: (user: UserListItem) => void

}

export default function UserTable({ users,onEditClick}: UserTableProps) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-[#D8E3F5] bg-white">
      <table className="w-full min-w-[760px] text-left">
        <caption className="sr-only">Lista de usuarios del sistema</caption>
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
          <tr>
            <th scope="col" className="px-5 py-3 font-bold">Usuario</th>
            <th scope="col" className="px-5 py-3 font-bold">Email</th>
            <th scope="col" className="px-5 py-3 text-center font-bold">Rol</th>
            <th scope="col" className="px-5 py-3 text-center font-bold">Estado</th>
            <th scope="col" className="px-5 py-3 text-center font-bold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDF1F7] bg-white text-sm text-[#011140]">
          {users.map((user) => (
            <tr key={user.id}>
              <th scope="row" className="px-5 py-3 font-normal">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} />
                  <span>
                    <span className="block font-semibold">{user.nombre} {user.apellidos}</span>
                    <span className="mt-1 block text-xs text-gray-500">ID: {user.id}</span>
                  </span>
                </div>
              </th>
              <td className="whitespace-nowrap px-5 py-3 text-gray-600">{user.email}</td>
              <td className="px-5 py-3 text-center"><RoleBadge role={user.rol} /></td>
              <td className="px-5 py-3 text-center"><StatusBadge status={user.estado} /></td>
              <td className="px-5 py-3">
                <div className="flex justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditClick && onEditClick(user)}
                    aria-label={`Editar a ${user.nombre} ${user.apellidos}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#3D70C9] hover:bg-[#F1F6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-label={`Bloquear a ${user.nombre} ${user.apellidos}, no disponible`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#159570] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    <Ban size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-label={`Más acciones para ${user.nombre} ${user.apellidos}, no disponible`}
                    className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md text-[#627A9B]"
                  >
                    <MoreHorizontal size={17} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
