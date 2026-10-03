import { Info, CircleAlert, CheckCircle2, X } from 'lucide-react'

type TooltipType = 'info' | 'error' | 'success'

interface Props {
  open: boolean
  message: string
  type: TooltipType
  onClose: () => void
}

const STYLES = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    iconColor: 'text-blue-600',
    Icon: Info,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    iconColor: 'text-red-600',
    Icon: CircleAlert,
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    iconColor: 'text-green-600',
    Icon: CheckCircle2,
  },
} as const

export default function ErrorTooltip({ open, message, type, onClose }: Props) {
  if (!open) return null

  const styles = STYLES[type]
  const Icon = styles.Icon

  return (
    <div className="fixed bottom-4 left-1/2 z-[80] w-[min(90%,400px)] -translate-x-1/2">
      <div
        role="status"
        className={`flex items-start gap-2 rounded-xl border p-3 shadow-lg ${styles.bg} ${styles.border}`}
      >
        <Icon className={`mt-0.5 shrink-0 ${styles.iconColor}`} size={18} />
        <p className={`flex-1 text-xs font-medium ${styles.text}`}>{message}</p>
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 rounded p-0.5 ${styles.iconColor} hover:bg-white/50`}
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}