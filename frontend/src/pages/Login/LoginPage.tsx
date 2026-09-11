import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { NexaLogo, PlasmaBackground } from '../../components/PlasmaChrome'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <PlasmaBackground />
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl plasma-glass md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden p-10 md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(80,134,242,0.35),transparent_45%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-3">
              <NexaLogo className="h-12 w-12" />
              <div>
                <p className="font-display text-2xl font-semibold">NexaCore</p>
                <p className="text-xs uppercase tracking-[0.28em] text-plasma-mist">SIGEX · KD Plasma</p>
              </div>
            </div>
            <div className="mt-auto space-y-4">
              <h1 className="font-display text-4xl font-semibold leading-tight">
                Control de ingreso a exámenes, con el pulso de Plasma.
              </h1>
              <p className="max-w-md text-sm leading-6 text-plasma-mist">
                Tema visual inspirado en KDE Plasma: paneles flotantes, azul del Anexo A y un núcleo
                luminoso para operar mesas, QR y reportes sin perder claridad.
              </p>
            </div>
          </div>
        </section>
        <section className="bg-secondary/40 p-8 md:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <NexaLogo />
            <div>
              <p className="font-display text-lg font-semibold">NexaCore SIGEX</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-plasma-mist">Tema KD Plasma</p>
            </div>
          </div>
          <p className="text-sm text-plasma-mist">Acceso de coordinación</p>
          <h2 className="mt-1 font-display text-3xl font-semibold">Iniciar sesión</h2>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm text-plasma-mist">
              Usuario
              <input
                className="plasma-input mt-2"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block text-sm text-plasma-mist">
              Contraseña
              <input
                className="plasma-input mt-2"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? (
              <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            <button className="plasma-btn w-full" type="submit" disabled={loading}>
              {loading ? 'Conectando al núcleo…' : 'Entrar al escritorio'}
            </button>
          </form>
          <p className="mt-6 text-xs leading-5 text-plasma-mist/80">
            Demo local: usuario <span className="text-white">admin</span> o{' '}
            <span className="text-white">rodrigo</span>, contraseña{' '}
            <span className="text-white">nexacore</span>.
          </p>
        </section>
      </div>
    </div>
  )
}
