import { Hash, IdCard, QrCode, type LucideIcon } from 'lucide-react'
import type { TipoIdentificacion } from '../../services/identificacionService'

interface Opcion {
  valor: TipoIdentificacion | 'qr'
  label: string
  icon: LucideIcon
}

// QR queda visible pero deshabilitado: está pospuesto.
const OPCIONES: Opcion[] = [
  { valor: 'qr', label: 'QR', icon: QrCode },
  { valor: 'codigo', label: 'Cód. Univ', icon: Hash },
  { valor: 'ci', label: 'Carnet / CI', icon: IdCard },
]

interface MecanismoSelectorProps {
  value: TipoIdentificacion
  onChange: (tipo: TipoIdentificacion) => void
}

export default function MecanismoSelector({ value, onChange }: MecanismoSelectorProps) {
  return (
    <div>
      <p
        id="mecanismo-identificacion"
        className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[#627A9B] before:h-px before:flex-1 before:bg-[#D8E3F5] after:h-px after:flex-1 after:bg-[#D8E3F5]"
      >
        Mecanismo de identificación
      </p>
      <div role="group" aria-labelledby="mecanismo-identificacion" className="grid grid-cols-3 gap-3">
        {OPCIONES.map(({ valor, label, icon: Icon }) => {
          const activo = valor === value
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              disabled={valor === 'qr'}
              onClick={() => valor !== 'qr' && onChange(valor)}
              className={`relative flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:opacity-50 ${
                activo
                  ? 'border-[#0439D9] bg-[#E9F1FF] text-[#0439D9]'
                  : 'border-[#D8E3F5] bg-white text-[#011140] enabled:hover:bg-[#F1F6FF]'
              }`}
            >
              {activo && (
                <span aria-hidden="true" className="absolute right-2 top-2 text-[10px] font-bold text-[#166534]">
                  ● ACTIVO
                </span>
              )}
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
