import { Hash, IdCard, QrCode, type LucideIcon } from 'lucide-react'
import type { TipoIdentificacion } from '../../services/identificacionService'

/** El QR trae el código universitario: se busca con tipo "codigo". */
export type Mecanismo = TipoIdentificacion | 'qr'

interface Opcion {
  valor: Mecanismo
  label: string
  icon: LucideIcon
}

const OPCIONES: Opcion[] = [
  { valor: 'qr', label: 'QR', icon: QrCode },
  { valor: 'codigo', label: 'Cód. Univ', icon: Hash },
  { valor: 'ci', label: 'Carnet / CI', icon: IdCard },
]

interface MecanismoSelectorProps {
  value: Mecanismo
  onChange: (mecanismo: Mecanismo) => void
}

export default function MecanismoSelector({ value, onChange }: MecanismoSelectorProps) {
  return (
    <div>
      <p
        id="mecanismo-identificacion"
        className="mb-2.5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-[#627A9B] before:h-px before:flex-1 before:bg-[#E1E6EF] after:h-px after:flex-1 after:bg-[#E1E6EF] sm:mb-3 sm:text-[10px]"
      >
        Mecanismo de identificación
      </p>
      <div role="group" aria-labelledby="mecanismo-identificacion" className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {OPCIONES.map(({ valor, label, icon: Icon }) => {
          const activo = valor === value
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange(valor)}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-semibold transition-colors sm:h-20 sm:py-0 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:opacity-50 ${
                activo
                  ? 'border-[#0439D9] bg-[#E9F1FF] text-[#0439D9]'
                  : 'border-[#D8E3F5] bg-white text-[#011140] enabled:hover:bg-[#F1F6FF]'
              }`}
            >
              {activo && (
                <span aria-hidden="true" className="text-[8px] font-bold text-[#087F59] sm:absolute sm:right-2 sm:top-1.5">
                  ● ACTIVO
                </span>
              )}
              <Icon size={19} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
