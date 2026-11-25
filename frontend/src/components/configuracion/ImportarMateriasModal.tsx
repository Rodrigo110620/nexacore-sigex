import { useState } from 'react'
import { Download, FileSpreadsheet, FileUp, LoaderCircle, X } from 'lucide-react'
import { importarMaterias, type ImportacionMaterias } from '../../services/materiaCarreraService'
import { guardarArchivo, obtenerArchivo } from '../../services/descargas'

const TAMANO_MAXIMO = 5 * 1024 * 1024
const EXTENSION = /\.(csv|xlsx)$/i

function mensajeDe(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string> } } }).response?.data
  return data?.errores ? Object.values(data.errores)[0] : data?.mensaje ?? porDefecto
}

/**
 * Importar materias desde CSV o Excel, con el formato de los otros registros. Ofrece la plantilla vacía y el catálogo
 * actual para editarlo y volver a subirlo: las siglas nuevas se crean y las existentes se actualizan.
 */
export default function ImportarMateriasModal({ onClose, onImportado }: { onClose: () => void; onImportado: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [importando, setImportando] = useState(false)
  const [descargando, setDescargando] = useState('')
  const [resultado, setResultado] = useState<ImportacionMaterias | null>(null)

  const elegir = (f: File | undefined) => {
    setResultado(null)
    setError('')
    if (!f) return
    if (!EXTENSION.test(f.name)) { setArchivo(null); setError('El archivo debe ser CSV (.csv) o Excel (.xlsx).'); return }
    if (f.size === 0) { setArchivo(null); setError('El archivo está vacío.'); return }
    if (f.size > TAMANO_MAXIMO) { setArchivo(null); setError('El archivo pesa más de 5 MB.'); return }
    setArchivo(f)
  }

  const descargar = async (que: 'plantilla' | 'catalogo', formato: 'csv' | 'xlsx') => {
    setDescargando(`${que}-${formato}`)
    setError('')
    try {
      guardarArchivo(await obtenerArchivo(`/materias/${que}.${formato}`, undefined, `plantilla_materias.${formato}`))
    } catch {
      setError('No se pudo descargar el archivo. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setDescargando('')
    }
  }

  const importar = async () => {
    if (!archivo || importando) return
    setImportando(true)
    setError('')
    try {
      const r = await importarMaterias(archivo)
      setResultado(r)
      setArchivo(null)
      onImportado()
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo importar el archivo. Revisa tu conexión e intenta de nuevo.'))
    } finally {
      setImportando(false)
    }
  }

  const botonDescarga = (que: 'plantilla' | 'catalogo', formato: 'csv' | 'xlsx', texto: string) => (
    <button type="button" onClick={() => void descargar(que, formato)} disabled={descargando !== ''}
      className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md border border-[#C9D7EC] bg-white px-4 text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF] disabled:opacity-60">
      {descargando === `${que}-${formato}` ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
      <span className="truncate">{texto}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="importar-materias-titulo">
      <div className="flex max-h-[calc(100dvh-4.5rem)] w-full min-w-0 flex-col overflow-hidden rounded-t-xl border border-[#D8E3F5] bg-white shadow-xl sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#D8E3F5] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><FileSpreadsheet size={19} /></span>
            <div className="min-w-0">
              <h2 id="importar-materias-titulo" className="font-bold text-[#011140]">Importar Materias</h2>
              <p className="mt-1 text-xs text-[#627A9B]">Desde un archivo CSV o Excel (.xlsx) con las columnas de la plantilla.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-[#627A9B] hover:bg-gray-100"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5">
          <section className="rounded-md border border-[#D8E3F5] bg-[#F8FAFC] px-3 py-2.5 text-[11px] text-[#45628D]">
            <p className="text-xs font-semibold text-[#011140]">Columnas</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li><b>sigla</b>: la del plan de estudios (2 a 15 letras, números o guiones). Si ya existe, la fila actualiza esa materia.</li>
              <li><b>nombre</b>: de 3 a 100 caracteres.</li>
              <li><b>carreras</b> (opcional): por nombre o código, separadas por «|». Vacía: no cambia sus carreras.</li>
            </ul>
          </section>

          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#45628D]">La plantilla trae las materias actuales: edítalas, agrega filas y vuelve a subirla.</p>
            <div className="flex w-full shrink-0 flex-col items-stretch gap-1 sm:w-auto sm:items-end">
              {botonDescarga('catalogo', 'xlsx', 'Descargar plantilla')}
              <button type="button" onClick={() => void descargar('catalogo', 'csv')} disabled={descargando !== ''}
                className="text-center text-[11px] font-semibold text-[#0439D9] underline-offset-2 hover:underline disabled:opacity-60 sm:text-right">
                o descárgala en CSV
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#B8CBEF] p-5 text-center hover:bg-[#F8FAFF]">
            <FileUp size={22} className="text-[#0439D9]" aria-hidden="true" />
            <span className="max-w-full truncate text-sm font-semibold text-[#0439D9]">{archivo ? archivo.name : 'Elegir archivo CSV o Excel'}</span>
            <span className="text-[11px] text-[#627A9B]">{archivo ? `${(archivo.size / 1024).toFixed(1)} KB · toca para cambiarlo` : 'Hasta 2000 materias y 5 MB'}</span>
            <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
              disabled={importando} onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = '' }} />
          </label>

          {error && <p role="alert" className="rounded-md bg-[#FEF3F2] px-3 py-2 text-xs font-semibold text-[#B42318]">{error}</p>}

          {resultado && (
            <section role="status" className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <p className="rounded-md bg-[#ECFDF3] px-2 py-2 text-[#05603A]"><b className="block text-lg tabular-nums">{resultado.creadas}</b>creadas</p>
                <p className="rounded-md bg-[#EFF6FF] px-2 py-2 text-[#1E3A8A]"><b className="block text-lg tabular-nums">{resultado.actualizadas.length}</b>actualizadas</p>
                <p className="rounded-md bg-[#FEF3F2] px-2 py-2 text-[#B42318]"><b className="block text-lg tabular-nums">{resultado.errores.length}</b>con errores</p>
              </div>
              {resultado.sinCambios.length > 0 && <p className="text-[#627A9B]">Sin cambios: {resultado.sinCambios.length} {resultado.sinCambios.length === 1 ? 'materia' : 'materias'}.</p>}
              {resultado.errores.length > 0 && (
                <ul className="max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto rounded-md bg-[#FEF3F2] p-2 text-[#B42318]">
                  {resultado.errores.map((e) => <li key={e} className="break-words">{e}</li>)}
                </ul>
              )}
            </section>
          )}
        </div>

        <footer className="[&>*]:min-w-0 [&>*]:flex-1 sm:[&>*]:flex-none flex flex-row gap-2 border-t border-[#D8E3F5] px-4 py-3 sm:justify-between sm:px-5">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D]">{resultado ? 'Cerrar' : 'Cancelar'}</button>
          <button type="button" disabled={!archivo || importando} onClick={() => void importar()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md disabled:opacity-60">
            {importando && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{importando ? 'Importando...' : 'Importar'}
          </button>
        </footer>
      </div>
    </div>
  )
}
