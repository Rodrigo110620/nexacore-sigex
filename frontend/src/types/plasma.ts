export type LookAndFeel = 'breeze-dark' | 'breeze-light'
export type WallpaperId = 'aurora' | 'nexacore' | 'night'
export type AccentId = 'plasma' | 'nexacore' | 'teal' | 'violet' | 'orange'
export type Role = 'ROLE_ADMIN' | 'ROLE_DOCENTE' | 'ROLE_CONTROL'

export interface SessionUser {
  nombre: string
  email: string
  rol: Role
}

export interface Appearance {
  lookAndFeel: LookAndFeel
  wallpaper: WallpaperId
  accent: AccentId
}

export const ACCENT_COLORS: Record<AccentId, string> = {
  plasma: '#3daee9',
  nexacore: '#0439D9',
  teal: '#1abc9c',
  violet: '#9b59b6',
  orange: '#f67400',
}

export const ACCENT_LABELS: Record<AccentId, string> = {
  plasma: 'Plasma',
  nexacore: 'NexaCore',
  teal: 'Verde Breeze',
  violet: 'Violeta',
  orange: 'Naranja',
}

export const WALLPAPER_LABELS: Record<WallpaperId, string> = {
  aurora: 'Aurora',
  nexacore: 'NexaCore',
  night: 'Noche Breeze',
}

export const DEFAULT_APPEARANCE: Appearance = {
  lookAndFeel: 'breeze-dark',
  wallpaper: 'aurora',
  accent: 'plasma',
}

export const DEMO_USER: SessionUser = {
  nombre: 'Rodrigo Figueroa',
  email: 'rodrigo@nexacore.com',
  rol: 'ROLE_ADMIN',
}
