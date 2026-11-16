import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FilasVivasContexto } from '../../hooks/useFilaViva'
import type { EstadoFilaViva } from '../../hooks/useFilasNuevas'

export function FilasVivas({ marcadas, children }: { marcadas: ReadonlyMap<number, EstadoFilaViva>; children: ReactNode }) {
  return <FilasVivasContexto.Provider value={marcadas}>{children}</FilasVivasContexto.Provider>
}

/** Marca «Nuevo» o «Actualizado» junto al nombre. */
export function MarcaFilaViva({ estado }: { estado: EstadoFilaViva | undefined }) {
  if (!estado) return null
  return (
    <span className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white ${
      estado === 'nuevo' ? 'bg-[#F59E0B]' : 'bg-[#0EA5E9]'}`}>
      {estado === 'nuevo' ? 'Nuevo' : 'Actualizado'}
    </span>
  )
}

/** Número que «late» un instante cuando cambia (llegó algo en vivo). */
export function NumeroVivo({ valor }: { valor: number }) {
  const anterior = useRef(valor)
  const [latido, setLatido] = useState(0)
  useEffect(() => {
    if (anterior.current === valor) return
    anterior.current = valor
    const t = window.setTimeout(() => setLatido((n) => n + 1), 0)
    return () => window.clearTimeout(t)
  }, [valor])
  return <span key={latido} className={latido ? 'sigex-cifra-cambia' : undefined}>{valor}</span>
}
