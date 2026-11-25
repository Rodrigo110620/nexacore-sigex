import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { eventoControlOffline, operacionesControlPendientes, sincronizarOperacionesControl } from '../../services/controlOfflineService'

const DURACION_CONFIRMACION_MS = 5_000
/** Si se cayó el servidor (no el internet del celular) no llega el evento «online»: se reintenta cada tanto. */
export const REINTENTO_SINCRONIZACION_MS = 30_000

export default function ControlOfflineSync() {
  const [operaciones, setOperaciones] = useState(operacionesControlPendientes)
  const [sincronizacionCompleta, setSincronizacionCompleta] = useState(false)
  const cantidadAnterior = useRef(operaciones.length)
  const temporizadorConfirmacion = useRef<ReturnType<typeof setTimeout> | null>(null)
  const actualizar = () => {
    const siguientes = operacionesControlPendientes()
    if (cantidadAnterior.current > 0 && siguientes.length === 0) {
      setSincronizacionCompleta(true)
      if (temporizadorConfirmacion.current) clearTimeout(temporizadorConfirmacion.current)
      temporizadorConfirmacion.current = setTimeout(() => setSincronizacionCompleta(false), DURACION_CONFIRMACION_MS)
    } else if (siguientes.length > 0) {
      setSincronizacionCompleta(false)
    }
    cantidadAnterior.current = siguientes.length
    setOperaciones(siguientes)
  }
  useEffect(() => {
    const online = () => { void sincronizarOperacionesControl().finally(actualizar) }
    window.addEventListener(eventoControlOffline, actualizar)
    window.addEventListener('online', online)
    // Al volver a la app (otra pestaña o el celular bloqueado) también se intenta.
    const visible = () => { if (document.visibilityState === 'visible') online() }
    document.addEventListener('visibilitychange', visible)
    // Solo si hay pendientes: sin marcaciones guardadas no hace ninguna petición.
    const reintento = setInterval(() => { if (operacionesControlPendientes().length > 0) online() }, REINTENTO_SINCRONIZACION_MS)
    void sincronizarOperacionesControl().finally(actualizar)
    return () => {
      clearInterval(reintento)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener(eventoControlOffline, actualizar)
      window.removeEventListener('online', online)
      if (temporizadorConfirmacion.current) clearTimeout(temporizadorConfirmacion.current)
    }
  }, [])
  if (!operaciones.length) {
    if (!sincronizacionCompleta) return null
    return <div role="status" className="fixed bottom-20 right-3 z-[70] flex max-w-xs items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 shadow-lg sm:bottom-4">
      <CheckCircle2 size={17} aria-hidden="true" />
      <span>Todas las marcaciones fueron sincronizadas correctamente.</span>
    </div>
  }
  const errores = operaciones.filter((o) => o.error).length
  return <div role="status" className={`fixed bottom-20 right-3 z-[70] flex max-w-xs items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg sm:bottom-4 ${errores ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
    {errores ? <TriangleAlert size={17} aria-hidden="true" /> : navigator.onLine ? <RefreshCw size={17} className="animate-spin" aria-hidden="true" /> : <CloudOff size={17} aria-hidden="true" />}
    <span>{errores ? `${errores} marcación${errores === 1 ? '' : 'es'} requiere${errores === 1 ? '' : 'n'} revisión` : `${operaciones.length} marcación${operaciones.length === 1 ? '' : 'es'} pendiente${operaciones.length === 1 ? '' : 's'} de sincronizar`}</span>
  </div>
}
