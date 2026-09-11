import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { usePlasma } from '../../context/PlasmaContext'
import { useClock } from '../../hooks/useClock'
import { IconChart, IconQr, IconTrash } from '../../components/PlasmaIcons'

const EXAMS = [
  { materia: 'Cálculo II', aula: 'A-204', hora: '08:00', estado: 'En curso' },
  { materia: 'Base de Datos', aula: 'Lab 3', hora: '10:30', estado: 'Próximo' },
  { materia: 'Redes I', aula: 'B-110', hora: '14:00', estado: 'Programado' },
]

export default function DashboardPage() {
  const { user } = usePlasma()
  const { timeWithSeconds, date } = useClock()
  const navigate = useNavigate()
  const [apiStatus, setApiStatus] = useState<'checking' | 'up' | 'down'>('checking')

  useEffect(() => {
    let cancelled = false
    api
      .get('/health')
      .then(() => {
        if (!cancelled) setApiStatus('up')
      })
      .catch(() => {
        if (!cancelled) setApiStatus('down')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative h-full">
      <div className="absolute left-2 top-2 flex flex-col gap-4">
        <button
          type="button"
          className="focus-ring flex w-20 flex-col items-center gap-1 rounded-xl p-2 text-white hover:bg-white/10"
          onClick={() => navigate('/scanner')}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--plasma-accent)] shadow-lg">
            <IconQr className="h-6 w-6 text-white" />
          </span>
          <span className="text-center text-xs drop-shadow">Escáner QR</span>
        </button>
        <button
          type="button"
          className="focus-ring flex w-20 flex-col items-center gap-1 rounded-xl p-2 text-white hover:bg-white/10"
          onClick={() => navigate('/reportes')}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#27ae60] shadow-lg">
            <IconChart className="h-6 w-6 text-white" />
          </span>
          <span className="text-center text-xs drop-shadow">Reportes</span>
        </button>
        <div className="flex w-20 flex-col items-center gap-1 p-2 text-white/80">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <IconTrash className="h-6 w-6" />
          </span>
          <span className="text-center text-xs drop-shadow">Papelera</span>
        </div>
      </div>

      <div className="ml-24 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="glass-panel rounded-[20px] p-5 md:col-span-1">
          <p className="text-sm text-[var(--plasma-muted)]">Bienvenido</p>
          <h2 className="mt-1 text-2xl font-semibold">{user?.nombre}</h2>
          <p className="mt-3 text-5xl font-semibold tracking-tight">{timeWithSeconds}</p>
          <p className="mt-1 capitalize text-[var(--plasma-muted)]">{date}</p>
        </article>

        <article className="glass-panel rounded-[20px] p-5">
          <p className="text-sm text-[var(--plasma-muted)]">Estado SIGEX</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                background:
                  apiStatus === 'up'
                    ? 'var(--plasma-positive)'
                    : apiStatus === 'down'
                      ? 'var(--plasma-negative)'
                      : 'var(--plasma-neutral)',
              }}
            />
            <p className="text-lg font-medium">
              {apiStatus === 'up' && 'API en línea'}
              {apiStatus === 'down' && 'API no disponible'}
              {apiStatus === 'checking' && 'Comprobando backend...'}
            </p>
          </div>
          <p className="mt-2 text-sm text-[var(--plasma-muted)]">
            Escritorio personalizado con Look and Feel Breeze.
          </p>
        </article>

        <article className="glass-panel rounded-[20px] p-5">
          <p className="text-sm text-[var(--plasma-muted)]">Ingreso de hoy</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-semibold">128</p>
              <p className="text-xs text-[var(--plasma-muted)]">Ingresaron</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">14</p>
              <p className="text-xs text-[var(--plasma-muted)]">En fila</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--plasma-neutral)]">3</p>
              <p className="text-xs text-[var(--plasma-muted)]">Incidencias</p>
            </div>
          </div>
        </article>

        <article className="glass-panel rounded-[20px] p-5 md:col-span-2">
          <p className="mb-3 text-sm text-[var(--plasma-muted)]">Exámenes de hoy</p>
          <ul className="space-y-2">
            {EXAMS.map((exam) => (
              <li
                key={exam.materia}
                className="flex items-center justify-between rounded-xl bg-[var(--plasma-card)] px-3 py-2.5"
              >
                <div>
                  <p className="font-medium">{exam.materia}</p>
                  <p className="text-xs text-[var(--plasma-muted)]">
                    {exam.aula} · {exam.hora}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--plasma-accent-soft)] px-3 py-1 text-xs text-[var(--plasma-accent)]">
                  {exam.estado}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  )
}
