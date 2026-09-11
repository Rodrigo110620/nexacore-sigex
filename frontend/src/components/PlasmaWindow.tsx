import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconClose, IconMax, IconMin } from './PlasmaIcons'

interface PlasmaWindowProps {
  title: string
  children: ReactNode
}

export default function PlasmaWindow({ title, children }: PlasmaWindowProps) {
  const [maximized, setMaximized] = useState(true)

  return (
    <section
      className={`plasma-window flex min-h-0 flex-col overflow-hidden rounded-[12px] ${
        maximized ? 'h-full w-full' : 'mx-auto mt-8 h-[78%] w-[min(1100px,92%)]'
      }`}
    >
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--plasma-border)] px-3">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--plasma-accent)]" />
          {title}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="focus-ring rounded-md p-1 text-[var(--plasma-muted)] hover:bg-[var(--plasma-card-hover)]"
            aria-label="Minimizar"
          >
            <IconMin className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="focus-ring rounded-md p-1 text-[var(--plasma-muted)] hover:bg-[var(--plasma-card-hover)]"
            aria-label={maximized ? 'Restaurar' : 'Maximizar'}
            onClick={() => setMaximized((value) => !value)}
          >
            <IconMax className="h-4 w-4" />
          </button>
          <Link
            to="/"
            className="focus-ring rounded-md p-1 text-[var(--plasma-muted)] hover:bg-[var(--plasma-negative)] hover:text-white"
            aria-label="Cerrar"
          >
            <IconClose className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--plasma-view)]">{children}</div>
    </section>
  )
}
