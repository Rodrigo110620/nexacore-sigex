import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { usePlasma } from '../../context/PlasmaContext'
import { useClock } from '../../hooks/useClock'
import { IconNexa, IconUser } from '../../components/PlasmaIcons'

export default function LoginPage() {
  const { user, appearance, login } = usePlasma()
  const { time, date } = useClock()
  const [usuario, setUsuario] = useState('rodrigo')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (user) {
    return <Navigate to="/" replace />
  }

  const wallpaperClass =
    appearance.wallpaper === 'nexacore'
      ? 'wallpaper-nexacore'
      : appearance.wallpaper === 'night'
        ? 'wallpaper-night'
        : 'wallpaper-aurora'

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const result = login(usuario, password)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo iniciar sesión')
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className={`wallpaper ${wallpaperClass}`}>
        <div className="aurora-shift" />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <div className="absolute left-6 top-6 flex items-center gap-2 text-white/90">
          <IconNexa className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold">NexaCore Plasma</p>
            <p className="text-xs text-white/70">SIGEX · Control de ingreso</p>
          </div>
        </div>

        <div className="mb-8 text-center text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          <p className="text-6xl font-semibold tracking-tight sm:text-7xl">{time}</p>
          <p className="mt-2 text-lg capitalize text-white/90">{date}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="glass-panel w-full max-w-sm rounded-[22px] px-6 py-7 text-center"
        >
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl font-semibold text-white"
            style={{ borderColor: 'var(--plasma-accent)', background: 'var(--plasma-accent-soft)' }}
          >
            <IconUser className="h-10 w-10" />
          </div>
          <h1 className="text-xl font-semibold">Rodrigo Figueroa</h1>
          <p className="mb-5 text-sm text-[var(--plasma-muted)]">Sesión Plasma · ROLE_ADMIN</p>

          <label className="mb-2 block text-left text-xs text-[var(--plasma-muted)]" htmlFor="usuario">
            Usuario
          </label>
          <input
            id="usuario"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            className="focus-ring mb-3 w-full rounded-xl bg-[var(--plasma-card)] px-3 py-2.5 text-sm outline-none"
            autoComplete="username"
          />

          <label className="mb-2 block text-left text-xs text-[var(--plasma-muted)]" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="plasma"
            className="focus-ring mb-4 w-full rounded-xl bg-[var(--plasma-card)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--plasma-muted)]"
            autoComplete="current-password"
          />

          {error && (
            <p className="mb-3 rounded-lg bg-[color-mix(in_srgb,var(--plasma-negative)_18%,transparent)] px-3 py-2 text-sm text-[var(--plasma-negative)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="focus-ring w-full rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--plasma-accent)' }}
          >
            Iniciar sesión
          </button>
          <p className="mt-4 text-xs text-[var(--plasma-muted)]">
            Demo: usuario <span className="font-medium text-[var(--plasma-text)]">rodrigo</span> ·
            contraseña <span className="font-medium text-[var(--plasma-text)]">plasma</span>
          </p>
        </form>
      </div>
    </div>
  )
}
