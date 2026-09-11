import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

const TOKEN_KEY = 'token'
const USER_KEY = 'sigex-user'

export type SessionUser = {
  name: string
  username: string
  role: string
}

type AuthContextValue = {
  user: SessionUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): SessionUser | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const raw = localStorage.getItem(USER_KEY)
  if (!token || !raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readStoredUser())

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async (username, password) => {
        const normalized = username.trim().toLowerCase()
        const validUser = normalized === 'admin' || normalized === 'rodrigo'
        const validPass = password === 'nexacore'

        if (!validUser || !validPass) {
          throw new Error('Usuario o contraseña incorrectos. Usa admin / nexacore.')
        }

        const session: SessionUser = {
          username: normalized,
          name: normalized === 'rodrigo' ? 'Rodrigo Figueroa' : 'Operador SIGEX',
          role: 'Coordinación de mesas',
        }

        localStorage.setItem(TOKEN_KEY, 'plasma-local-session')
        localStorage.setItem(USER_KEY, JSON.stringify(session))
        setUser(session)
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
