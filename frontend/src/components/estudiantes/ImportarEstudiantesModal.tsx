import axios from 'axios'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AlertCircle, Check, CheckCircle2, Download, FileSpreadsheet, FileUp, Info, LoaderCircle, X } from 'lucide-react'
import { guardarArchivo, obtenerArchivo } from '../../services/descargas'
import {
  getCarreras,
  iniciarImportacion,
  progresoImportacion,
  revisarImportacion,
  type ImportarEstudiantesResponse,
  type ProgresoImportacion,
  type RevisionImportacion,
} from '../../services/estudianteService'
import type { CarreraOption } from '../../types/estudiante'

interface ImportarEstudiantesModalProps {
  open: boolean
  onClose: () => void
  onImported: (result: ImportarEstudiantesResponse) => void
}

const MAX_BYTES = 5 * 1024 * 1024
const MAX_FILAS = 10_000
const numero = new Intl.NumberFormat('es-BO')
type Paso = 'subir' | 'revisar' | 'importando' | 'listo'

/**
 * Sección 22 (IMP-13 e IMP-16): importar estudiantes desde CSV o Excel en tres pasos. Subir el archivo,
 * revisarlo sin guardar (listas, con errores y ya registradas, con fila y columna de cada error) e importar
 * con el avance real por bloques de 500. Las filas con errores o ya registradas no se importan.
 */
export default function ImportarEstudiantesModal({ open, onClose, onImported }: ImportarEstudiantesModalProps) {
  const [paso, setPaso] = useState<Paso>('subir')
  const [file, setFile] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState<RevisionImportacion | null>(null)
  const [progreso, setProgreso] = useState<ProgresoImportacion | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [carreras, setCarreras] = useState<CarreraOption[]>([])
  const [verCarreras, setVerCarreras] = useState(false)
  const [descargando, setDescargando] = useState<'csv' | 'xlsx' | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !verCarreras || carreras.length > 0) return
    getCarreras().then(setCarreras).catch(() => setCarreras([]))
  }, [open, verCarreras, carreras.length])

  // Paso «Importando»: consulta el avance cada medio segundo hasta que termina.
  useEffect(() => {
    if (paso !== 'importando' || !progreso || progreso.estado !== 'EN_CURSO') return
    const espera = window.setTimeout(() => {
      progresoImportacion(progreso.id)
        .then((p) => {
          setProgreso(p)
          if (p.estado === 'LISTA' && p.resultado) {
            setPaso('listo')
            onImported(p.resultado)
          } else if (p.estado === 'FALLIDA') {
            setError(p.error ?? 'No se pudo completar la importación.')
            setPaso('revisar')
          }
        })
        .catch(() => setProgreso({ ...progreso }))
    }, 500)
    return () => window.clearTimeout(espera)
  }, [paso, progreso, onImported])

  if (!open) return null

  const reiniciar = () => {
    setPaso('subir')
    setFile(null)
    setError('')
    setRevision(null)
    setProgreso(null)
  }

  const cerrar = () => {
    if (cargando || paso === 'importando') return
    reiniciar()
    setVerCarreras(false)
    onClose()
  }

  const elegir = (seleccionado: File | null | undefined) => {
    setError('')
    if (!seleccionado) return
    // IMP-13: también Excel (.xlsx); se lee su primera hoja con las mismas columnas que el CSV.
    if (!/\.(csv|xlsx)$/i.test(seleccionado.name)) {
      setError('El archivo debe ser CSV (.csv) o Excel (.xlsx).')
      return
    }
    if (seleccionado.size > MAX_BYTES) {
      setError('El archivo supera el tamaño máximo de 5 MB.')
      return
    }
    setFile(seleccionado)
  }

  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegir(e.dataTransfer.files?.[0])
  }

  const mensajeError = (err: unknown, porDefecto: string) =>
    axios.isAxiosError<{ message?: string }>(err) && err.response?.data?.message ? err.response.data.message : porDefecto

  const revisar = async () => {
    if (!file) {
      setError('Selecciona un archivo CSV o Excel.')
      return
    }
    setCargando(true)
    setError('')
    try {
      setRevision(await revisarImportacion(file))
      setPaso('revisar')
    } catch (err) {
      setError(mensajeError(err, 'No se pudo revisar el archivo.'))
    } finally {
      setCargando(false)
    }
  }

  const importar = async () => {
    if (!file) return
    setCargando(true)
    setError('')
    try {
      setProgreso(await iniciarImportacion(file))
      setPaso('importando')
    } catch (err) {
      setError(mensajeError(err, 'No se pudo iniciar la importación.'))
    } finally {
      setCargando(false)
    }
  }

  const descargarPlanilla = async (formato: 'csv' | 'xlsx') => {
    setDescargando(formato)
    setError('')
    try {
      // Sección 22: plantilla con los encabezados y una fila de ejemplo.
      guardarArchivo(await obtenerArchivo(`/estudiantes/plantilla.${formato}`, undefined, `plantilla_estudiantes.${formato}`))
    } catch {
      setError('No se pudo descargar la plantilla.')
    } finally {
      setDescargando(null)
    }
  }

  // «Descargar errores»: un CSV con fila, columna y error (de la revisión o del resultado final).
  const descargarErrores = () => {
    const filas = paso === 'listo' && progreso?.resultado
      ? progreso.resultado.errores.map((linea) => {
          const [fila, ...resto] = linea.replace(/^Fila /, '').split(':')
          return [fila, '', resto.join(':').trim()]
        })
      : (revision?.errores ?? []).map((e) => [String(e.fila), e.columna ?? '', e.mensaje])
    const csv = '﻿' + [['Fila', 'Columna', 'Error'], ...filas]
      .map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'errores_importacion.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const pct = progreso && progreso.total ? Math.min(100, Math.round((progreso.procesadas * 100) / progreso.total)) : 0
  const resultado = progreso?.resultado
  const indicePaso = paso === 'subir' ? 0 : paso === 'revisar' ? 1 : 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#011140]/40 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="importar-estudiantes-title" onClick={(e) => { if (e.target === e.currentTarget) cerrar() }}>
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-[#D8E3F5]">
        <div className="flex items-start gap-3 border-b border-[#EEF2F7] px-5 py-4 sm:px-6">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF2FE] text-[#0439D9]"><FileUp size={20} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="importar-estudiantes-title" className="text-lg font-bold text-[#011140]">Importar estudiantes</h2>
            <p className="text-xs text-[#627A9B]">Desde un archivo CSV o Excel (.xlsx) con las columnas de la plantilla.</p>
          </div>
          <button type="button" onClick={cerrar} disabled={paso === 'importando'} aria-label="Cerrar" className="rounded-lg p-1.5 text-[#627A9B] hover:bg-[#F2F5FA] disabled:opacity-40">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {/* Pasos: 1 Subir archivo · 2 Revisar · 3 Importar */}
          <ol className="mb-4 flex items-center gap-2 text-xs" aria-label="Pasos de la importación">
            {['Subir archivo', 'Revisar', 'Importar'].map((nombre, i) => {
              const hecho = i < indicePaso || paso === 'listo'
              const actual = i === indicePaso && paso !== 'listo'
              return (
                <li key={nombre} className="flex items-center gap-2" aria-current={actual ? 'step' : undefined}>
                  {i > 0 && <span className="h-px w-6 bg-[#D8E3F5] sm:w-10" aria-hidden="true" />}
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${hecho ? 'bg-[#16A34A] text-white' : actual ? 'bg-[#0439D9] text-white' : 'bg-[#EEF2F7] text-[#627A9B]'}`}>
                    {hecho ? <Check size={13} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={actual ? 'font-semibold text-[#011140]' : 'text-[#627A9B]'}>{nombre}</span>
                </li>
              )
            })}
          </ol>

          {paso === 'subir' && (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => entrada.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }} onDragLeave={() => setArrastrando(false)} onDrop={soltar}
                className={`flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors ${arrastrando ? 'border-[#0439D9] bg-[#EDF2FE]' : 'border-[#B8CBEF] bg-[#F8FAFF] hover:bg-[#F2F6FF]'}`}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0439D9] shadow-sm"><FileSpreadsheet size={24} aria-hidden="true" /></span>
                <span className="text-sm font-semibold text-[#011140]">{file ? file.name : 'Arrastra el archivo aquí o haz clic para elegirlo'}</span>
                <span className="text-xs text-[#627A9B]">CSV o Excel (.xlsx) · hasta {numero.format(MAX_FILAS)} estudiantes y 5 MB</span>
              </button>
              <input ref={entrada} type="file" name="file" className="sr-only" aria-label="Archivo de estudiantes"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = '' }} />

              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-xs text-[#45628D]">¿No tienes el formato? Descarga la plantilla.</p>
                {(['csv', 'xlsx'] as const).map((formato) => (
                  <button key={formato} type="button" onClick={() => void descargarPlanilla(formato)} disabled={descargando !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7D7F5] bg-white px-3 py-2 text-xs font-semibold text-[#0439D9] hover:bg-[#EDF2FE] disabled:opacity-60">
                    {descargando === formato ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
                    {formato === 'csv' ? 'Plantilla CSV' : 'Plantilla Excel'}
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-[#F2F5FA] p-3 text-xs leading-relaxed text-[#45628D]">
                <p className="flex items-start gap-2"><Info size={15} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
                  <span>Columnas: codigoSis, nombre, apellidos, ci, email, idFacultad, idCarrera; opcionales: telefono y estadoMatricula (MATRICULADO o NO_MATRICULADO).</span>
                </p>
                <button type="button" onClick={() => setVerCarreras((v) => !v)} className="ml-6 mt-1 font-semibold text-[#0439D9] hover:underline">
                  {verCarreras ? 'Ocultar IDs de carreras' : 'Ver IDs de facultades y carreras'}
                </button>
                {verCarreras && (
                  <ul className="ml-6 mt-1 max-h-32 overflow-y-auto">
                    {carreras.map((c) => <li key={`${c.idFacultad}-${c.idCarrera}`}>Facultad {c.idFacultad} ({c.nombreFacultad}) · Carrera {c.idCarrera}: {c.nombre}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          {paso === 'revisar' && revision && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-[#D8E3F5] px-3 py-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]"><FileSpreadsheet size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#011140]">{revision.archivo}</p>
                  <p className="text-[11px] text-[#627A9B]">{revision.tipo} · {numero.format(revision.filas)} filas · {tamano(file!.size)}</p>
                </div>
                <button type="button" onClick={reiniciar} className="text-xs font-semibold text-[#0439D9] hover:underline">Cambiar</button>
              </div>

              <dl className="grid grid-cols-3 gap-2">
                {([['Listas para importar', revision.listas, 'text-[#059669] bg-[#ECFDF5]'], ['Con errores', revision.conErrores, 'text-[#B91C1C] bg-[#FEF2F2]'], ['Ya registradas', revision.yaRegistradas, 'text-[#B45309] bg-[#FFFBEB]']] as const).map(([titulo, valor, color]) => (
                  <div key={titulo} className={`rounded-xl px-3 py-2.5 ${color}`}>
                    <dd className="text-2xl font-bold tabular-nums">{numero.format(valor)}</dd>
                    <dt className="text-[11px] font-medium text-[#45628D]">{titulo}</dt>
                  </div>
                ))}
              </dl>

              {revision.errores.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-xl border border-[#D8E3F5]">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Filas con errores</caption>
                    <thead className="sticky top-0 bg-[#F8FAFC] text-[10px] uppercase tracking-wide text-[#627A9B]">
                      <tr><th scope="col" className="px-3 py-2">Fila</th><th scope="col" className="px-3 py-2">Columna</th><th scope="col" className="px-3 py-2">Error</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F7] text-[#011140]">
                      {revision.errores.map((e) => (
                        <tr key={`${e.fila}-${e.columna}`}>
                          <td className="px-3 py-2 tabular-nums">{e.fila}</td>
                          <td className="px-3 py-2 font-medium">{e.columna ?? '—'}</td>
                          <td className="px-3 py-2 text-[#45628D]">{e.mensaje}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="flex items-start gap-2 rounded-lg bg-[#F2F5FA] p-3 text-xs text-[#45628D]">
                <Info size={15} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
                Las filas con errores no se importan y los estudiantes ya registrados se omiten. Puedes corregirlos y volver a importar el archivo.
              </p>
            </div>
          )}

          {paso === 'importando' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center" role="status" aria-live="polite">
              <p className="text-4xl font-bold tabular-nums text-[#0439D9]">{pct} %</p>
              <p className="text-sm text-[#011140]">Importando {numero.format(progreso?.procesadas ?? 0)} de {numero.format(progreso?.total ?? 0)} estudiantes</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#EEF2F7]" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-[#0439D9] to-[#0EA5E9] transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-[#627A9B]">Se guardan por bloques de 500. No cierres esta ventana.</p>
            </div>
          )}

          {paso === 'listo' && resultado && (
            <div className="flex flex-col items-center gap-2 py-6 text-center" role="status">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] text-[#16A34A]"><CheckCircle2 size={30} aria-hidden="true" /></span>
              <p className="text-lg font-bold text-[#011140]">{numero.format(resultado.insertados)} {resultado.insertados === 1 ? 'estudiante importado' : 'estudiantes importados'}</p>
              <p className="text-xs text-[#627A9B]">
                En {progreso?.segundos ?? 1} s{resultado.ignorados > 0 ? ` · ${numero.format(resultado.ignorados)} ${resultado.ignorados === 1 ? 'fila con errores o ya registrada no se importó' : 'filas con errores o ya registradas no se importaron'}` : ''}
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF2F7] px-5 py-3 sm:px-6">
          {paso === 'subir' && (<>
            <button type="button" onClick={cerrar} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#45628D] hover:bg-[#F2F5FA]">Cancelar</button>
            <button type="button" onClick={() => void revisar()} disabled={!file || cargando}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c41e1] disabled:opacity-50">
              {cargando && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}Continuar
            </button>
          </>)}
          {paso === 'revisar' && revision && (<>
            {revision.errores.length > 0 && (
              <button type="button" onClick={descargarErrores} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7D7F5] px-4 py-2.5 text-sm font-semibold text-[#0439D9] hover:bg-[#EDF2FE]">
                <Download size={15} aria-hidden="true" />Descargar errores
              </button>
            )}
            <button type="button" onClick={() => void importar()} disabled={revision.listas === 0 || cargando}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c41e1] disabled:opacity-50">
              {cargando && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
              {revision.listas === 0 ? 'No hay estudiantes para importar' : `Importar ${numero.format(revision.listas)} ${revision.listas === 1 ? 'estudiante' : 'estudiantes'}`}
            </button>
          </>)}
          {paso === 'importando' && (
            <button type="button" disabled className="inline-flex items-center gap-2 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white opacity-70">
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />Importando…
            </button>
          )}
          {paso === 'listo' && (<>
            {(resultado?.errores.length ?? 0) > 0 && (
              <button type="button" onClick={descargarErrores} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7D7F5] px-4 py-2.5 text-sm font-semibold text-[#0439D9] hover:bg-[#EDF2FE]">
                <Download size={15} aria-hidden="true" />Descargar errores
              </button>
            )}
            <button type="button" onClick={cerrar} className="rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c41e1]">Ver estudiantes</button>
          </>)}
        </div>
      </div>
    </div>
  )
}

/** «850 KB» o «1,8 MB». */
function tamano(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toLocaleString('es-BO', { maximumFractionDigits: 1 })} MB`
}

