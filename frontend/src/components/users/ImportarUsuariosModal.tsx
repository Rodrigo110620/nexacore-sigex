import axios from 'axios'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileUp, LoaderCircle, X } from 'lucide-react'
import { useRoles } from '../../hooks/useRoles'
import {
  descargarPlantillaUsuarios,
  importarUsuarios,
  type ImportarUsuariosResponse,
} from '../../services/userService'

interface ImportarUsuariosModalProps {
  open: boolean
  onClose: () => void
  onImported: (result: ImportarUsuariosResponse) => void
}

const COLUMNAS = ['nombre', 'apellidos', 'ci', 'email', 'rol']
const MAX_BYTES = 1024 * 1024

export default function ImportarUsuariosModal({ open, onClose, onImported }: ImportarUsuariosModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportarUsuariosResponse | null>(null)
  const { roles } = useRoles()

  if (!open) return null

  const reset = () => {
    setFile(null)
    setError('')
    setResult(null)
  }

  const close = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    e.target.value = ''
    setError('')
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('El archivo debe tener formato CSV (.csv).')
      return
    }
    if (selected.size > MAX_BYTES) {
      setError('El archivo supera el tamaño máximo de 1 MB.')
      return
    }
    setFile(selected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Selecciona un archivo CSV.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await importarUsuarios(file)
      setResult(response)
      onImported(response)
    } catch (err) {
      const mensaje = axios.isAxiosError(err) ? err.response?.data?.mensaje : undefined
      setError(mensaje || 'Ocurrió un error al importar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#011140]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="importar-usuarios-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-[#D8E3F5]">
        <header className="flex items-start justify-between gap-3 border-b border-[#D8E3F5] px-5 py-4">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
              <FileUp size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 id="importar-usuarios-title" className="font-bold text-[#011140]">Importar Usuarios</h2>
              <p className="mt-1 text-xs text-[#627A9B]">
                {result ? 'Resultado de la importación.' : 'Registra varios usuarios a la vez desde un archivo CSV.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={loading}
            aria-label="Cerrar"
            className="rounded p-1 text-[#627A9B] hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        {result ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-2xl font-bold text-emerald-700">{result.insertados}</p>
                <p className="text-xs font-semibold text-emerald-800">Registrados</p>
              </div>
              <div className={`rounded-lg border p-3 ${result.ignorados > 0 ? 'border-amber-200 bg-amber-50' : 'border-[#D8E3F5] bg-[#F8FAFC]'}`}>
                <p className={`text-2xl font-bold ${result.ignorados > 0 ? 'text-amber-700' : 'text-[#627A9B]'}`}>{result.ignorados}</p>
                <p className={`text-xs font-semibold ${result.ignorados > 0 ? 'text-amber-800' : 'text-[#627A9B]'}`}>No importados</p>
              </div>
            </div>
            {result.insertados > 0 && (
              <p className="text-xs text-[#45628D]">Cada usuario registrado recibió su contraseña temporal por correo.</p>
            )}
            {result.errores.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[#011140]">Filas no importadas</p>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-[#D8E3F5] bg-[#F8FAFC] p-2">
                  {result.errores.map((linea) => (
                    <li key={linea} className="flex items-start gap-2 text-xs text-[#45628D]">
                      <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                      <span>{linea}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] text-[#627A9B]">
                  Corrige esas filas en el archivo y vuelve a importarlo: los usuarios ya registrados se detectan por su correo.
                </p>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 size={16} aria-hidden="true" /> Todas las filas se importaron correctamente.
              </p>
            )}
          </div>
        ) : (
          <form id="importar-usuarios-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-xs text-[#011140]">
              <p>Columnas requeridas (separadas por coma o punto y coma):</p>
              <p className="mt-1 break-words font-mono text-[11px] font-semibold text-[#0439D9]">{COLUMNAS.join(', ')}</p>
              <p className="mt-1 text-[11px] text-[#45628D]">
                Opcional: <span className="font-mono font-semibold">estado</span> (activo o inactivo; por defecto activo).
                Roles válidos: <span className="font-semibold">{roles.map((r) => r.value).join(', ')}</span>.
                El CSV exportado del listado también sirve como plantilla.
              </p>
              <button
                type="button"
                onClick={descargarPlantillaUsuarios}
                className="mt-2 inline-flex items-center gap-1 font-semibold text-[#0439D9] hover:underline"
              >
                <Download size={13} aria-hidden="true" />
                Descargar plantilla CSV
              </button>
            </div>

            <label className="flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#B8CBEF] bg-[#F8FAFC] p-6 transition-colors hover:border-[#0439D9] hover:bg-[#E9F1FF]">
              <div className="flex flex-col items-center gap-2 text-center">
                <FileUp className="text-[#627A9B]" size={28} aria-hidden="true" />
                <span className="break-all text-sm font-medium text-[#011140]">
                  {file ? file.name : 'Haz clic para seleccionar el archivo CSV'}
                </span>
                <span className="text-[11px] text-[#627A9B]">{file ? 'Clic para cambiar de archivo' : 'Máximo 1 MB · 500 usuarios'}</span>
              </div>
              <input type="file" name="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} />
            </label>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}
          </form>
        )}

        <footer className="flex flex-col-reverse gap-2 border-t border-[#D8E3F5] px-5 py-3 sm:flex-row sm:justify-end">
          {result ? (
            <>
              <button type="button" onClick={reset} className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D] hover:bg-gray-50">
                Importar otro archivo
              </button>
              <button type="button" onClick={close} className="h-10 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md hover:bg-[#0c41e1]">
                Listo
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={close} disabled={loading} className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D] hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button
                type="submit"
                form="importar-usuarios-form"
                disabled={loading || !file}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#0c41e1] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    Importando...
                  </>
                ) : (
                  'Importar'
                )}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
