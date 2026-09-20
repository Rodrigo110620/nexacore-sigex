import UserCard from './UserCard'
import type { UserListItem } from '../../types/user'

interface UserCardListProps {
  users: UserListItem[]
  onEditClick?: (user: UserListItem) => void
}

export default function UserCardList({ users, onEditClick }: UserCardListProps) {
  const visibleLabel = users.length === 1 ? '1 visible' : `${users.length} visibles`
  const accessibleLabel = users.length === 1 ? '1 usuario visible' : `${users.length} usuarios visibles`

  return (
    <section aria-labelledby="registered-accounts-title" className="lg:rounded-xl lg:bg-[#E9F1FF] lg:p-6">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
        <h2 id="registered-accounts-title" className="text-base font-bold text-[#011140] sm:text-lg">Cuentas registradas</h2>
        <p className="shrink-0 text-xs font-semibold text-[#0439D9] sm:text-sm">{visibleLabel}</p>
      </div>
      <ul aria-label={accessibleLabel} className="grid grid-cols-1 gap-3 sm:gap-4">
        {users.map((user) => (
          <UserCard key={user.id} user={user} onEditClick={onEditClick} />
        ))}
      </ul>
    </section>
  )
}
