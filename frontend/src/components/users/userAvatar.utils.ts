import type { UserListItem } from '../../types/user'

const avatarPalettes = [
  'border-[#BFDBFE] bg-[#EAF2FF] text-[#2563EB]',
  'border-[#99F6E4] bg-[#ECFDF5] text-[#0F766E]',
  'border-[#FDE68A] bg-[#FFF8E7] text-[#D97706]',
  'border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]',
] as const

export function getUserInitials(user: Pick<UserListItem, 'nombre' | 'apellidos'>) {
  return `${user.nombre.charAt(0)}${user.apellidos.charAt(0)}`.toUpperCase()
}

export function getUserAvatarPalette(user: Pick<UserListItem, 'id'>) {
  return avatarPalettes[Math.abs(user.id) % avatarPalettes.length]
}
