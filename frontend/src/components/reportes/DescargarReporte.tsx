import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react'
import { descargarReporte, type FiltrosReporte, type FormatoReporte, type PestanaReporte } from '../../services/exportarReporteService'

/** «Descargar» de la pestaña de Reportes: Excel para trabajar los datos o PDF para presentarlos, con los filtros de la pantalla. */
export default function DescargarReporte({ pestana, filtros, onError }: {
  pestana: PestanaReporte
  filtros: FiltrosReporte
  onError: (mensaje: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [descargando, setDescargando] = useState<FormatoReporte | null>(null)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  const descargar = async (formato: FormatoReporte) => {
    setAbierto(false)
    setDescargando(formato)
    try {
      await descargarReporte(pestana, formato, filtros)
    } catch {
      onError('No se pudo descargar el reporte. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setDescargando(null)
    }
  }

  return (
    <div ref={caja} className="relative">
      <button type="button" onClick={() => setAbierto((v) => !v)} disabled={descargando !== null} aria-haspopup="menu" aria-expanded={abierto}
        title="Descargar en Excel o PDF"
        className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-lg border border-[#B8CBEF] bg-white text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF] disabled:opacity-60 sm:h-9 sm:w-auto sm:px-3">
        {descargando ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
        {/* En el celular solo el ícono: no le quita espacio a las pestañas. */}
        <span className="sr-only sm:not-sr-only">{descargando ? 'Descargando…' : 'Descargar'}</span>
        <ChevronDown size={13} aria-hidden="true" className="hidden sm:block" />
      </button>
      {abierto && (
        <div role="menu" aria-label="Formato de descarga" className="absolute right-0 z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-[#D8E3F5] bg-white py-1 shadow-lg">
          <button type="button" role="menuitem" onClick={() => void descargar('xlsx')} className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-[#F8FAFF]">
            <FileSpreadsheet size={17} className="mt-0.5 shrink-0 text-[#15803D]" aria-hidden="true" />
            <span><span className="block text-sm font-semibold text-[#011140]">Excel</span><span className="block text-[11px] text-[#627A9B]">Para filtrar, contar y analizar</span></span>
          </button>
          <button type="button" role="menuitem" onClick={() => void descargar('pdf')} className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-[#F8FAFF]">
            <FileText size={17} className="mt-0.5 shrink-0 text-[#B42318]" aria-hidden="true" />
            <span><span className="block text-sm font-semibold text-[#011140]">PDF</span><span className="block text-[11px] text-[#627A9B]">Para presentar o imprimir</span></span>
          </button>
        </div>
      )}
    </div>
  )
}
