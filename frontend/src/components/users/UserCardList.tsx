import UserCard from './UserCard'
import type { UserListItem } from '../../types/user'

interface UserCardListProps {
  users: UserListItem[]
}

export default function UserCardList({ users }: UserCardListProps) {
  const visibleLabel = users.length === 1 ? '1 visible' : `${users.length} visibles`
  const accessibleLabel = users.length === 1 ? '1 usuario visible' : `${users.length} usuarios visibles`

  return (
    <section aria-labelledby="registered-accounts-title" className="rounded-xl bg-[#E9F1FF] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="registered-accounts-title" className="text-lg font-bold text-[#011140]">Cuentas registradas</h2>
        <p className="shrink-0 text-sm font-semibold text-[#0439D9]">{visibleLabel}</p>
      </div>
      <ul aria-label={accessibleLabel} className="grid grid-cols-1 gap-4">
        {users.map((user) => <UserCard key={user.id} user={user} />)}
      </ul>
    </section>
  )
}