import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileSpreadsheet, FileText, LoaderCircle, Printer, X } from 'lucide-react'
import { guardarArchivo, leerCsv, type Archivo } from '../../services/descargas'

export type FormatoDescarga = 'pdf' | 'xlsx' | 'csv'

const ETIQUETA: Record<FormatoDescarga, string> = { pdf: 'PDF', xlsx: 'Excel', csv: 'CSV' }
const FILAS_PREVIA = 15

interface Props {
  open: boolean
  titulo: string
  /** Formatos que se pueden descargar, el primero se muestra al abrir (o {@code inicial}). */
  formatos: FormatoDescarga[]
  inicial?: FormatoDescarga
  /** Pide el archivo al servidor en ese formato. */
  obtener: (formato: FormatoDescarga) => Promise<Archivo>
  /** Para la vista previa de Excel: el mismo contenido en CSV (el navegador no muestra un .xlsx). */
  obtenerCsv?: () => Promise<Archivo>
  onClose: () => void
  /** Mensaje para un error del servidor (p. ej. 409 si el examen no empezó). */
  mensajeError?: (err: unknown) => Promise<string> | string
}

/**
 * Vista previa antes de descargar: el PDF se ve tal cual (con Imprimir) y el Excel o CSV como tabla con sus
 * primeras filas. «Descargar» guarda el archivo del formato elegido con el nombre que manda el servidor.
 */
export default function VistaPreviaDescarga(props: Props) {
  // Se monta de nuevo al abrir: así empieza con el formato inicial y sin restos de la vez anterior.
  if (!props.open) return null
  return <Contenido {...props} />
}

/** Lo preparado para un formato: el archivo, la URL del PDF o la tabla del Excel/CSV, o el error. */
interface Preparado {
  formato: FormatoDescarga
  archivo?: Archivo
  urlPdf?: string
  tabla?: string[][]
  error?: string
}

function Contenido({ titulo, formatos, inicial, obtener, obtenerCsv, onClose, mensajeError }: Props) {
  const [formato, setFormato] = useState<FormatoDescarga>(inicial ?? formatos[0])
  const [preparado, setPreparado] = useState<Preparado | null>(null)
  const marco = useRef<HTMLIFrameElement>(null)
  const cargando = preparado?.formato !== formato
  const vigente = cargando ? null : preparado
  const archivo = vigente?.archivo ?? null
  const urlPdf = vigente?.urlPdf ?? null
  const tabla = vigente?.tabla ?? null
  const error = vigente?.error ?? ''

  useEffect(() => {
    let activo = true
    let url: string | undefined
    const cargar = async () => {
      try {
        const descargado = await obtener(formato)
        if (!activo) return
        if (formato === 'pdf') {
          url = URL.createObjectURL(new Blob([descargado.blob], { type: 'application/pdf' }))
          setPreparado({ formato, archivo: descargado, urlPdf: url })
        } else {
          const csv = formato === 'csv' ? descargado : obtenerCsv ? await obtenerCsv() : null
          const filas = csv ? leerCsv(await csv.blob.text()) : undefined
          if (activo) setPreparado({ formato, archivo: descargado, tabla: filas })
        }
      } catch (err) {
        const mensaje = mensajeError ? await mensajeError(err) : 'No se pudo preparar el archivo.'
        if (activo) setPreparado({ formato, error: mensaje })
      }
    }
    void cargar()
    return () => {
      activo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [formato, obtener, obtenerCsv, mensajeError])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onClose])

  const [encabezado, ...filas] = tabla ?? []

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#011140]/50 p-3 backdrop-blur-sm sm:p-6"
      role="dialog" aria-modal="true" aria-labelledby="vista-previa-titulo" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF2F7] px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="vista-previa-titulo" className="truncate text-base font-bold text-[#011140]">Vista previa · {titulo}</h2>
            <p className="truncate text-xs text-[#627A9B]">{archivo ? archivo.nombre : 'Revisa el archivo antes de descargarlo.'}</p>
          </div>
          {formatos.length > 1 && (
            <div className="flex rounded-lg bg-[#F2F5FA] p-1" role="tablist" aria-label="Formato">
              {formatos.map((f) => (
                <button key={f} type="button" role="tab" aria-selected={formato === f} onClick={() => setFormato(f)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${formato === f ? 'bg-white text-[#0439D9] shadow-sm' : 'text-[#45628D]'}`}>
                  {f === 'pdf' ? <FileText size={14} aria-hidden="true" /> : <FileSpreadsheet size={14} aria-hidden="true" />}{ETIQUETA[f]}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={onClose} aria-label="Cerrar vista previa" className="rounded-lg p-1.5 text-[#627A9B] hover:bg-[#F2F5FA]"><X size={18} aria-hidden="true" /></button>
        </div>

        <div className="relative min-h-0 flex-1 bg-[#F2F5FA]">
          {cargando && (
            <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-[#45628D]">
              <LoaderCircle size={18} className="animate-spin text-[#0439D9]" aria-hidden="true" /> Preparando la vista previa…
            </div>
          )}
          {error && <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {urlPdf && <iframe ref={marco} title={`Vista previa de ${titulo}`} src={urlPdf} className="h-full w-full border-0" />}
          {!cargando && !error && formato !== 'pdf' && (
            tabla ? (
              <div className="h-full overflow-auto p-3 sm:p-4">
                <p className="mb-2 text-xs text-[#45628D]">
                  {filas.length > FILAS_PREVIA ? `Primeras ${FILAS_PREVIA} de ${filas.length} filas` : `${filas.length} ${filas.length === 1 ? 'fila' : 'filas'}`} · así se verá en {ETIQUETA[formato]}
                </p>
                <table className="w-full min-w-max border-collapse bg-white text-left text-xs">
                  <thead className="sticky top-0 bg-[#EDF2FE] text-[#011140]">
                    <tr>{encabezado?.map((c, i) => <th key={i} scope="col" className="border border-[#D8E3F5] px-2 py-1.5 font-bold">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, FILAS_PREVIA).map((f, r) => (
                      <tr key={r}>{f.map((c, i) => <td key={i} className="border border-[#EEF2F7] px-2 py-1.5 text-[#011140]">{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : archivo && <p className="m-4 text-sm text-[#45628D]">El archivo está listo para descargar.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF2F7] px-4 py-3 sm:px-5">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#45628D] hover:bg-[#F2F5FA]">Cerrar</button>
          {formato === 'pdf' && (
            <button type="button" disabled={!urlPdf} onClick={() => marco.current?.contentWindow?.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7D7F5] px-4 py-2.5 text-sm font-semibold text-[#0439D9] hover:bg-[#EDF2FE] disabled:opacity-50">
              <Printer size={15} aria-hidden="true" />Imprimir
            </button>
          )}
          <button type="button" disabled={!archivo} onClick={() => archivo && guardarArchivo(archivo)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c41e1] disabled:opacity-50">
            <Download size={15} aria-hidden="true" />Descargar {ETIQUETA[formato]}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
