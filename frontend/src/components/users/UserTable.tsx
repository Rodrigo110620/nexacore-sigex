import { Ban, Pencil } from 'lucide-react'
import RoleBadge from './RoleBadge'
import StatusBadge from './StatusBadge'
import type { UserListItem } from '../../types/user'

interface UserTableProps {
  users: UserListItem[]
}

function initials(user: UserListItem) {
  return `${user.nombre.charAt(0)}${user.apellidos.charAt(0)}`.toUpperCase()
}

export default function UserTable({ users }: UserTableProps) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-[#D8E3F5] bg-white">
      <table className="w-full min-w-[760px] text-left">
        <caption className="sr-only">Lista de usuarios del sistema</caption>
        <thead className="bg-[#E9F1FF] text-xs uppercase tracking-wide text-[#011140]">
          <tr>
            <th scope="col" className="px-5 py-3 font-bold">Usuario</th>
            <th scope="col" className="px-5 py-3 font-bold">Email</th>
            <th scope="col" className="px-5 py-3 font-bold">Rol</th>
            <th scope="col" className="px-5 py-3 font-bold">Estado</th>
            <th scope="col" className="px-5 py-3 text-right font-bold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7EDF7] text-sm text-[#011140]">
          {users.map((user) => (
            <tr key={user.id}>
              <th scope="row" className="px-5 py-4 font-normal">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0439D9] text-xs font-bold text-white">
                    {initials(user)}
                  </span>
                  <span>
                    <span className="block font-semibold">{user.nombre} {user.apellidos}</span>
                    <span className="mt-1 block text-xs text-gray-500">ID: {user.id}</span>
                  </span>
                </div>
              </th>
              <td className="whitespace-nowrap px-5 py-4 text-gray-600">{user.email}</td>
              <td className="px-5 py-4"><RoleBadge role={user.rol} /></td>
              <td className="px-5 py-4"><StatusBadge status={user.estado} /></td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled
                    aria-label={`Editar a ${user.nombre} ${user.apellidos}, no disponible`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-gray-100 p-0 text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-label={`Bloquear a ${user.nombre} ${user.apellidos}, no disponible`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-gray-100 p-0 text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Ban size={16} aria-hidden="true" />
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