// src/components/estudiantes/avatarColors.ts

export const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
]

export function getAvatarColorById(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]
}

export function getInitials(nombre: string, apellidos: string): string {
  const n = nombre?.charAt(0)?.toUpperCase() ?? ''
  const a = apellidos?.charAt(0)?.toUpperCase() ?? ''
  return `${n}${a}` || 'E'
}