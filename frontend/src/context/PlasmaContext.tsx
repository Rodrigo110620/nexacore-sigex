import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ACCENT_COLORS,
  DEFAULT_APPEARANCE,
  DEMO_USER,
  type Appearance,
  type SessionUser,
} from '../types/plasma'

const SESSION_KEY = 'sigex.plasma.session'
const APPEARANCE_KEY = 'sigex.plasma.appearance'

interface PlasmaContextValue {
  user: SessionUser | null
  appearance: Appearance
  login: (usuario: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  updateAppearance: (patch: Partial<Appearance>) => void
}

const PlasmaContext = createContext<PlasmaContextValue | null>(null)

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function applyAppearance(appearance: Appearance) {
  const root = document.documentElement
  root.dataset.theme = appearance.lookAndFeel
  root.style.setProperty('--plasma-accent', ACCENT_COLORS[appearance.accent])
}

export function PlasmaProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readJson<SessionUser>(SESSION_KEY))
  const [appearance, setAppearance] = useState<Appearance>(() => ({
    ...DEFAULT_APPEARANCE,
    ...readJson<Partial<Appearance>>(APPEARANCE_KEY),
  }))

  useEffect(() => {
    applyAppearance(appearance)
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance))
  }, [appearance])

  const login = useCallback((usuario: string, password: string) => {
    const u = usuario.trim().toLowerCase()
    const p = password.trim()
    const acceptedUser = u === 'rodrigo' || u === DEMO_USER.email || u === 'admin'
    const acceptedPass = p === 'plasma' || p === 'nexacore'

    if (!u || !p) {
      return { ok: false, error: 'Escribe tu usuario y contraseña.' }
    }
    if (!acceptedUser || !acceptedPass) {
      return { ok: false, error: 'Credenciales incorrectas. Prueba rodrigo / plasma.' }
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_USER))
    localStorage.setItem('token', 'demo-plasma-token')
    setUser(DEMO_USER)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  const updateAppearance = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => ({ ...current, ...patch }))
  }, [])

  const value = useMemo(
    () => ({ user, appearance, login, logout, updateAppearance }),
    [user, appearance, login, logout, updateAppearance],
  )

  return <PlasmaContext.Provider value={value}>{children}</PlasmaContext.Provider>
}

export function usePlasma() {
  const ctx = useContext(PlasmaContext)
  if (!ctx) {
    throw new Error('usePlasma debe usarse dentro de PlasmaProvider')
  }
  return ctx
}
