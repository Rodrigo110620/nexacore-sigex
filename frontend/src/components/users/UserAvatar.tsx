import { getUserAvatarPalette, getUserInitials } from './userAvatar.utils'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import type { UserListItem } from '../../types/user'

interface UserAvatarProps {
  user: Pick<UserListItem, 'id' | 'nombre' | 'apellidos' | 'fotoUrl'>
  size?: 'compact' | 'card'
}

/** La foto de perfil del usuario si tiene; si no, sus iniciales (FotoEstudiante cae a las iniciales). */
export default function UserAvatar({ user, size = 'compact' }: UserAvatarProps) {
  const sizeClasses = size === 'card' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-xs'
  return (
    <FotoEstudiante
      fotoUrl={user.fotoUrl ?? null}
      nombre={`${user.nombre} ${user.apellidos}`}
      iniciales={getUserInitials(user)}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border font-bold ${sizeClasses} ${getUserAvatarPalette(user)}`}
    />
  )
}
