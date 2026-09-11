import { usePlasma } from '../../context/PlasmaContext'
import {
  ACCENT_COLORS,
  ACCENT_LABELS,
  WALLPAPER_LABELS,
  type AccentId,
  type LookAndFeel,
  type WallpaperId,
} from '../../types/plasma'
import { IconCheck } from '../../components/PlasmaIcons'

const LOOKS: { id: LookAndFeel; title: string; subtitle: string }[] = [
  { id: 'breeze-dark', title: 'Breeze Oscuro', subtitle: 'El clásico Plasma nocturno' },
  { id: 'breeze-light', title: 'Breeze Claro', subtitle: 'Paneles claros al estilo Breeze' },
]

const WALLPAPERS: WallpaperId[] = ['aurora', 'nexacore', 'night']
const ACCENTS = Object.keys(ACCENT_COLORS) as AccentId[]

export default function AparienciaPage() {
  const { appearance, updateAppearance } = usePlasma()

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-xl font-semibold">Personaliza tu Plasma</h2>
      <p className="mt-1 text-sm text-[var(--plasma-muted)]">
        Look and Feel, color de acento y fondo de escritorio. Los cambios se guardan en este navegador.
      </p>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--plasma-muted)]">
          Look and Feel
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {LOOKS.map((look) => {
            const selected = appearance.lookAndFeel === look.id
            return (
              <button
                key={look.id}
                type="button"
                onClick={() => updateAppearance({ lookAndFeel: look.id })}
                className="focus-ring rounded-2xl border p-4 text-left"
                style={{
                  borderColor: selected ? 'var(--plasma-accent)' : 'var(--plasma-border)',
                  background: 'var(--plasma-card)',
                }}
              >
                <div className="mb-3 flex h-16 overflow-hidden rounded-xl">
                  <span className={`w-1/2 ${look.id === 'breeze-dark' ? 'bg-[#1b1e20]' : 'bg-[#fcfcfc]'}`} />
                  <span className={`w-1/2 ${look.id === 'breeze-dark' ? 'bg-[#2a2e32]' : 'bg-[#eff0f1]'}`} />
                </div>
                <p className="font-medium">{look.title}</p>
                <p className="text-xs text-[var(--plasma-muted)]">{look.subtitle}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--plasma-muted)]">
          Color de acento
        </h3>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((accent) => {
            const selected = appearance.accent === accent
            return (
              <button
                key={accent}
                type="button"
                onClick={() => updateAppearance({ accent })}
                className="focus-ring flex items-center gap-2 rounded-full border px-3 py-2 text-sm"
                style={{ borderColor: selected ? ACCENT_COLORS[accent] : 'var(--plasma-border)' }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: ACCENT_COLORS[accent] }}>
                  {selected && <IconCheck className="h-4 w-4 text-white" />}
                </span>
                {ACCENT_LABELS[accent]}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--plasma-muted)]">
          Fondo de escritorio
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {WALLPAPERS.map((wallpaper) => {
            const selected = appearance.wallpaper === wallpaper
            const cls =
              wallpaper === 'nexacore'
                ? 'wallpaper-nexacore'
                : wallpaper === 'night'
                  ? 'wallpaper-night'
                  : 'wallpaper-aurora'
            return (
              <button
                key={wallpaper}
                type="button"
                onClick={() => updateAppearance({ wallpaper })}
                className="focus-ring overflow-hidden rounded-2xl border text-left"
                style={{ borderColor: selected ? 'var(--plasma-accent)' : 'var(--plasma-border)' }}
              >
                <div className={`h-24 ${cls}`} />
                <p className="bg-[var(--plasma-card)] px-3 py-2 text-sm">{WALLPAPER_LABELS[wallpaper]}</p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
