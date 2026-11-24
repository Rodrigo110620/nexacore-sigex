import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { eventoControlOffline, operacionesControlPendientes, sincronizarOperacionesControl } from '../../services/controlOfflineService'

export default function ControlOfflineSync() {
  const [operaciones, setOperaciones] = useState(operacionesControlPendientes)
  const actualizar = () => setOperaciones(operacionesControlPendientes())
  useEffect(() => {
    const online = () => { void sincronizarOperacionesControl().finally(actualizar) }
    window.addEventListener(eventoControlOffline, actualizar)
    window.addEventListener('online', online)
    void sincronizarOperacionesControl().finally(actualizar)
    return () => { window.removeEventListener(eventoControlOffline, actualizar); window.removeEventListener('online', online) }
  }, [])
  if (!operaciones.length) return null
  const errores = operaciones.filter((o) => o.error).length
  return <div role="status" className={`fixed bottom-20 right-3 z-[70] flex max-w-xs items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg sm:bottom-4 ${errores ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
    {errores ? <TriangleAlert size={17} aria-hidden="true" /> : navigator.onLine ? <RefreshCw size={17} className="animate-spin" aria-hidden="true" /> : <CloudOff size={17} aria-hidden="true" />}
    <span>{errores ? `${errores} marcación${errores === 1 ? '' : 'es'} requiere${errores === 1 ? '' : 'n'} revisión` : `${operaciones.length} marcación${operaciones.length === 1 ? '' : 'es'} pendiente${operaciones.length === 1 ? '' : 's'} de sincronizar`}</span>
  </div>
}
