import { useEffect, useRef, useState } from 'react'
import { ArrowDownUp, ChevronDown, Download, Upload } from 'lucide-react'

interface Opcion {
  titulo: string
  detalle: string
}

/**
 * Un solo botón «Importar / Exportar» con su menú (Estudiantes y Usuarios). Si solo se puede una de las dos
 * cosas, el botón dice «Importar» o «Exportar».
 */
export default function MenuImportarExportar({ puedeImportar, puedeExportar, importar, exportar, onImportar, onExportar, disabled }: {
  puedeImportar: boolean
  puedeExportar: boolean
  importar: Opcion
  exportar: Opcion
  onImportar: () => void
  onExportar: () => void
  disabled?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !caja.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', cerrar)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', cerrar)
    }
  }, [abierto])
  const etiqueta = puedeImportar && puedeExportar ? 'Importar / Exportar' : puedeImportar ? 'Importar' : 'Exportar'
  const elegir = (accion: () => void) => { setAbierto(false); accion() }
  const item = 'flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-[#F2F6FF] focus-visible:bg-[#F2F6FF] focus-visible:outline-none'
  return (
    <div ref={caja} className="relative order-2 min-[960px]:order-1">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-haspopup="menu" aria-expanded={abierto} disabled={disabled}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#D8E3F5] bg-white px-3 text-sm font-semibold text-[#0439D9] hover:bg-[#E9F1FF] disabled:cursor-not-allowed disabled:opacity-70 min-[960px]:w-auto min-[960px]:px-4">
        <ArrowDownUp size={16} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{etiqueta}</span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div role="menu" aria-label={etiqueta} className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-[#D8E3F5] bg-white py-1 shadow-lg">
          {puedeImportar && (
            <button type="button" role="menuitem" onClick={() => elegir(onImportar)} className={item}>
              <Upload size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-[#0439D9]" />
              <span><span className="block text-sm font-semibold text-[#011140]">{importar.titulo}</span>
                <span className="block text-xs text-[#627A9B]">{importar.detalle}</span></span>
            </button>
          )}
          {puedeExportar && (
            <button type="button" role="menuitem" onClick={() => elegir(onExportar)} className={item}>
              <Download size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-[#0439D9]" />
              <span><span className="block text-sm font-semibold text-[#011140]">{exportar.titulo}</span>
                <span className="block text-xs text-[#627A9B]">{exportar.detalle}</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
