import { Link } from 'react-router-dom'
import { attendanceFeed, upcomingExams } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'

const stats = [
  { label: 'Mesas activas', value: '12', hint: '4 en curso ahora' },
  { label: 'Ingresos hoy', value: '1.284', hint: '94% de asistencia' },
  { label: 'Incidencias', value: '7', hint: '2 pendientes de revisión' },
  { label: 'QR validados', value: '1.109', hint: 'Último hace 12s' },
]

function statusClass(estado: string) {
  if (estado === 'En curso') return 'bg-emerald-400/15 text-emerald-200'
  if (estado === 'Cerrado') return 'bg-white/10 text-plasma-mist'
  return 'bg-accent/15 text-accent'
}

function resultClass(resultado: string) {
  if (resultado === 'Admitido') return 'text-emerald-300'
  if (resultado === 'Tarde') return 'text-amber-300'
  return 'text-rose-300'
}

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <section className="plasma-glass rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-plasma-mist">Escritorio Plasma</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
          Hola, {user?.name.split(' ')[0]}. El núcleo está listo.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-plasma-mist">
          Personalización KD Plasma para SIGEX: el mismo azul institucional del Anexo A, con paneles
          luminosos para coordinar ingreso, incidencias y reportes en un vistazo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="plasma-btn" to="/scanner">
            Abrir escáner QR
          </Link>
          <Link className="plasma-btn-ghost" to="/reportes">
            Ver reportes
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="plasma-glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-plasma-mist">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-sm text-plasma-mist">{stat.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="plasma-glass rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Mesas de examen</h2>
            <span className="text-xs text-plasma-mist">Hoy</span>
          </div>
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{exam.materia}</p>
                  <p className="text-xs text-plasma-mist">
                    {exam.id} · {exam.aula} · {exam.inscritos} inscritos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-sm text-plasma-mist">{exam.hora}</span>
                  <span className={`rounded-full px-3 py-1 text-xs ${statusClass(exam.estado)}`}>
                    {exam.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="plasma-glass rounded-3xl p-5">
          <h2 className="mb-4 font-display text-xl font-semibold">Flujo de ingreso</h2>
          <ul className="space-y-3">
            {attendanceFeed.map((row) => (
              <li key={row.codigo} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0">
                <div>
                  <p className="font-medium">{row.estudiante}</p>
                  <p className="text-xs text-plasma-mist">
                    {row.codigo} · {row.materia}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${resultClass(row.resultado)}`}>{row.resultado}</p>
                  <p className="text-xs text-plasma-mist">{row.hora}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}
