import { getUserAvatarPalette, getUserInitials } from './userAvatar.utils'
import type { UserListItem } from '../../types/user'

interface UserAvatarProps {
  user: Pick<UserListItem, 'id' | 'nombre' | 'apellidos'>
  size?: 'compact' | 'card'
}

export default function UserAvatar({ user, size = 'compact' }: UserAvatarProps) {
  const sizeClasses = size === 'card' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-xs'

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg border font-bold ${sizeClasses} ${getUserAvatarPalette(user)}`}
    >
      {getUserInitials(user)}
    </span>
  )
}
