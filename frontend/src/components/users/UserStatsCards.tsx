import { Users, Shield, BookOpen, Eye } from 'lucide-react'
import type { UserStats } from '../../types/totalUser'

interface UserStatsCardsProps {
  stats: UserStats
}

export default function UserStatsCards({ stats }: UserStatsCardsProps) {
  const porcentajeActivos = stats.totalUsuarios > 0
    ? Math.round((stats.activos / stats.totalUsuarios) * 100)
    : 0

  const cards = [
    {
      label: 'TOTAL USUARIOS',
      value: stats.totalUsuarios,
      sublabel: `${porcentajeActivos}%`,
      sublabelColor: 'text-green-600',
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-[#0439D9]',
    },
    {
      label: 'ADMINISTRADORES',
      value: stats.administradores,
      sublabel: 'Super Root',
      sublabelColor: 'text-[#0439D9]',
      icon: Shield,
      iconBg: 'bg-blue-100',
      iconColor: 'text-[#0439D9]',
    },
    {
      label: 'DOCENTES',
      value: stats.docentes,
      sublabel: `${stats.docentes} activos`,
      sublabelColor: 'text-green-600',
      icon: BookOpen,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'PERSONAL CONTROL',
      value: stats.personalControl,
      sublabel: 'Vigilancia',
      sublabelColor: 'text-orange-500',
      icon: Eye,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
    },
  ]

  return (
    <section
      aria-label="Estadísticas de usuarios"
      className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <article
            key={card.label}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-[#D8E3F5] bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
          >
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${card.iconBg}`}>
              <Icon className={card.iconColor} size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-gray-500 sm:text-xs">
                {card.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#011140] sm:text-2xl">
                  {card.value}
                </span>
                <span className={`text-xs font-semibold ${card.sublabelColor}`}>
                  {card.sublabel}
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
