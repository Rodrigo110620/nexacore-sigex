import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, WifiOff } from 'lucide-react'

export type TipoResultado = 'exito' | 'error' | 'offline'

export interface Resultado {
  tipo: TipoResultado
  mensaje: string
}

const TITULOS: Record<TipoResultado, string> = {
  exito: 'Operación exitosa',
  error: 'No se pudo completar la operación',
  offline: 'Sin conexión a Internet',
}

const ICONOS: Record<TipoResultado, ReactNode> = {
  exito: <CircleCheck size={22} className="text-emerald-600" aria-hidden="true" />,
  error: <CircleAlert size={22} className="text-red-600" aria-hidden="true" />,
  offline: <WifiOff size={22} className="text-amber-600" aria-hidden="true" />,
}

/** Modal de resultado de una operación: éxito, error del servidor o falta de conexión. */
export default function ResultadoModal({ resultado, onClose }: { resultado: Resultado | null; onClose: () => void }) {
  if (!resultado) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="resultado-titulo"
        aria-describedby="resultado-mensaje"
        className="w-full max-w-sm rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl"
      >
        <div className="flex items-center gap-2">
          {ICONOS[resultado.tipo]}
          <h3 id="resultado-titulo" className="text-sm font-bold text-[#011140]">{TITULOS[resultado.tipo]}</h3>
        </div>
        <p id="resultado-mensaje" className="mt-2 text-xs leading-relaxed text-gray-600">{resultado.mensaje}</p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-4 w-full rounded-lg bg-[#0439D9] py-2 text-sm font-semibold text-white hover:bg-[#032db0]"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
