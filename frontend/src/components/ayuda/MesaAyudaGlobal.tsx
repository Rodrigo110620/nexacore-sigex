import { useEffect, useState } from 'react'
import MesaAyudaModal from './MesaAyudaModal'
import { EVENTO_MESA_AYUDA } from '../../utils/mesaAyuda'

/**
 * La única mesa de ayuda de la app. Los botones («Mesa de Ayuda» del encabezado, «¿Necesitas ayuda?» del login, el
 * menú de la cuenta…) la abren con abrirMesaAyuda(): así nunca quedan dos abiertas a la vez (2.º test run).
 */
export default function MesaAyudaGlobal() {
  const [abierta, setAbierta] = useState<{ nombreInicial: string } | null>(null)
  useEffect(() => {
    const abrir = (e: Event) => {
      const nombre = (e as CustomEvent<{ nombreInicial?: string }>).detail?.nombreInicial ?? ''
      setAbierta((actual) => actual ?? { nombreInicial: nombre })
    }
    window.addEventListener(EVENTO_MESA_AYUDA, abrir)
    return () => window.removeEventListener(EVENTO_MESA_AYUDA, abrir)
  }, [])
  if (!abierta) return null
  return <MesaAyudaModal open nombreInicial={abierta.nombreInicial} onClose={() => setAbierta(null)} />
}
