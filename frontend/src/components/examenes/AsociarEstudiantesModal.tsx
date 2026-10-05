import { useEffect, useState } from 'react'
import { ListChecks, LoaderCircle, RotateCw, X } from 'lucide-react'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { getEstudiantes } from '../../services/estudianteService'
import {
  asociarEstudiantesLote,
  asociarInscritos,
  type AsociacionLoteDto,
  type EstudianteHabilitacionDto,
} from '../../services/habilitacionService'
import type { EstudianteFilterParams, EstudianteListItem } from '../../types/estudiante'
import { isNetworkError, isOffline } from '../../utils/examFormUtils'
import EstudianteFilters from '../estudiantes/EstudianteFilters'
import ResultadoModal, { type Resultado } from '../ui/ResultadoModal'
import { ConfirmDiscardDialog } from './ExamFormDialogs'

type Modo = 'codigos' | 'registro' | 'inscritos'

const MODOS: { id: Modo; label: string }[] = [
  { id: 'registro', label: 'Del registro' },
  { id: 'codigos', label: 'Códigos / CI' },
  { id: 'inscritos', label: 'Inscritos' },
]
const RESULTADOS_REGISTRO = 50
/** A partir de cuántos seleccionados el resumen se recorta y ofrece "Ver todo". */
const RESUMEN_VISIBLE = 10
const SIN_CONEXION = 'No hay conexión a Internet. No se asoció a ningún estudiante; tu selección se conserva para reintentar.'

/** Mensaje del backend (ErrorResponse.mensaje) o, si no hay respuesta, uno de conexión. */
const mensajeDeError = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: { mensaje?: string } } }
  if (!e.response) return 'No se pudo conectar con el servidor. Intenta más tarde.'
  return e.response.data?.mensaje || fallback
}

/** Códigos o CI separados por saltos de línea, comas, punto y coma o espacios. */
const separarIdentificadores = (texto: string) => texto.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)

const carrerasDe = (e: EstudianteListItem) => e.carreras?.map((c) => c.nombreCarrera).join(', ') || 'Sin carrera'

interface AsociarEstudiantesModalProps {
  idExamen: number
  idParalelo: number
  /** "Materia · fecha · ambiente": se muestra bajo el título, con la materia resaltada. */
  examenResumen?: string
  /** Ids ya asociados al examen: en "Del registro" aparecen marcados y bloqueados. */
  asociados: Set<number>
  onAsociados: (lista: EstudianteHabilitacionDto[]) => void
  onClose: () => void
}

export default function AsociarEstudiantesModal({
  idExamen,
  idParalelo,
  examenResumen,
  asociados,
  onAsociados,
  onClose,
}: AsociarEstudiantesModalProps) {
  const [modo, setModo] = useState<Modo>('registro')
  const [texto, setTexto] = useState('')
  const [filtros, setFiltros] = useState<EstudianteFilterParams>({ search: '', idFacultad: '', idCarrera: '' })
  const busquedaDebounced = useDebouncedValue(filtros.search, 300)
  const [resultados, setResultados] = useState<EstudianteListItem[]>([])
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [buscando, setBuscando] = useState(false)
  /** Hasta que responde la primera consulta no se afirma que no hay resultados. */
  const [consultado, setConsultado] = useState(false)
  const [sinConexion, setSinConexion] = useState(false)
  const [reintento, setReintento] = useState(0)
  const [seleccion, setSeleccion] = useState<Map<number, EstudianteListItem>>(new Map())
  const [verTodos, setVerTodos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState<AsociacionLoteDto | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [cerrarAlTerminar, setCerrarAlTerminar] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)

  useEffect(() => {
    if (modo !== 'registro') return
    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      // Sin conexión no se consulta: se conservan el criterio y los filtros para reintentar.
      if (isOffline()) {
        setSinConexion(true)
        return
      }
      setSinConexion(false)
      setBuscando(true)
      setError('')
      getEstudiantes(
        {
          page: 0,
          size: RESULTADOS_REGISTRO,
          search: busquedaDebounced.trim(),
          idFacultad: filtros.idFacultad,
          idCarrera: filtros.idCarrera,
        },
        controller.signal,
      )
        .then((page) => {
          setResultados(page.contenido)
          setTotalRegistros(page.totalRegistros)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          if (isNetworkError(err)) setSinConexion(true)
          else setError(mensajeDeError(err, 'No se pudo buscar estudiantes.'))
        })
        .finally(() => {
          if (controller.signal.aborted) return
          setBuscando(false)
          setConsultado(true)
        })
    }, 0)
    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [modo, busquedaDebounced, filtros.idFacultad, filtros.idCarrera, reintento])

  const cambiarModo = (siguiente: Modo) => {
    setModo(siguiente)
    setError('')
    setResumen(null)
  }

  const alternar = (estudiante: EstudianteListItem) => {
    setSeleccion((actual) => {
      const siguiente = new Map(actual)
      if (siguiente.has(estudiante.id)) siguiente.delete(estudiante.id)
      else siguiente.set(estudiante.id, estudiante)
      return siguiente
    })
    setError('')
  }

  const seleccionables = resultados.filter((e) => !asociados.has(e.id))
  const todosSeleccionados = seleccionables.length > 0 && seleccionables.every((e) => seleccion.has(e.id))
  const alternarTodos = (marcar: boolean) => {
    setSeleccion((actual) => {
      const siguiente = new Map(actual)
      seleccionables.forEach((e) => (marcar ? siguiente.set(e.id, e) : siguiente.delete(e.id)))
      return siguiente
    })
    setError('')
  }

  const seleccionados = [...seleccion.values()]
  const identificadores =
    modo === 'codigos' ? separarIdentificadores(texto) : seleccionados.map((e) => e.codigoSis)
  const hayCambiosSinGuardar = texto.trim().length > 0 || seleccion.size > 0

  const solicitarCierre = () => {
    if (saving) return
    if (hayCambiosSinGuardar) {
      setConfirmarCierre(true)
      return
    }
    onClose()
  }

  const enviar = async () => {
    if (modo !== 'inscritos' && identificadores.length === 0) {
      setError(modo === 'codigos'
        ? 'Ingresa al menos un código universitario o CI para asociar.'
        : 'Selecciona al menos un estudiante para asociar.')
      return
    }
    if (isOffline()) {
      setResultado({ tipo: 'offline', mensaje: SIN_CONEXION })
      return
    }
    setSaving(true)
    setError('')
    setResumen(null)
    try {
      const respuesta =
        modo === 'inscritos'
          ? await asociarInscritos(idExamen, idParalelo)
          : await asociarEstudiantesLote(idExamen, idParalelo, identificadores)
      onAsociados(respuesta.estudiantes)
      const sinPendientes = respuesta.yaAsociados.length === 0 && respuesta.noEncontrados.length === 0
      if (respuesta.asociados > 0 && sinPendientes) {
        setTexto('')
        setSeleccion(new Map())
        setCerrarAlTerminar(true)
        setResultado({
          tipo: 'exito',
          mensaje: respuesta.asociados === 1
            ? 'Se asoció 1 estudiante al examen, pendiente de habilitación.'
            : `Se asociaron ${respuesta.asociados} estudiantes al examen, pendientes de habilitación.`,
        })
        return
      }
      setResumen(respuesta)
      if (modo === 'codigos') setTexto([...respuesta.yaAsociados, ...respuesta.noEncontrados].join('\n'))
      if (modo === 'registro') setSeleccion(new Map())
    } catch (err) {
      // El lote es transaccional: si falla no queda nadie asociado y la selección se conserva.
      if (isNetworkError(err)) setResultado({ tipo: 'offline', mensaje: SIN_CONEXION })
      else setError(mensajeDeError(err, 'No se pudo asociar a los estudiantes.'))
    } finally {
      setSaving(false)
    }
  }

  const [materia, ...detallesExamen] = examenResumen?.split(' · ') ?? []

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="asociar-titulo"
        className="relative flex h-[70dvh] max-h-[680px] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(92dvh,900px)] sm:rounded-3xl sm:shadow-xl"
        onSubmit={(event) => {
          event.preventDefault()
          void enviar()
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E9EEF6] px-4 pb-3 pt-2 sm:gap-4 sm:px-10 sm:pb-5 sm:pt-7">
          <div className="min-w-0 flex-1">
            <div aria-hidden="true" className="mx-auto mb-3 h-1 w-11 rounded-full bg-[#C4D2E7] sm:hidden" />
            <h3 id="asociar-titulo" className="text-base font-bold tracking-tight text-[#011140] sm:text-2xl">
              Asociar Estudiantes al Examen
            </h3>
            {materia ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-[#475467]">
                <span className="font-semibold text-[#0439D9]">{materia}</span>
                {detallesExamen.map((detalle, i) => (
                  <span key={i} className="contents">
                    <span aria-hidden="true" className="text-[#98A2B3]">·</span>
                    <span>{detalle}</span>
                  </span>
                ))}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-[#475467]">
                Quedan pendientes de habilitación y, si no lo estaban, inscritos en el paralelo de este examen.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={solicitarCierre}
            disabled={saving}
            aria-label="Cerrar"
            className="mt-4 shrink-0 rounded-full bg-[#F1F6FF] p-2 text-[#627A9B] transition-colors hover:bg-[#F2F4F7] hover:text-[#011140] disabled:opacity-50 sm:mt-0 sm:rounded-lg sm:bg-transparent sm:p-1.5 sm:text-[#667085]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-10 sm:py-6">
          <div role="tablist" className="mb-5 inline-flex w-full gap-1 rounded-xl bg-[#EEF3FC] p-1 sm:w-auto">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={modo === m.id}
                onClick={() => cambiarModo(m.id)}
                className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:flex-none sm:text-sm ${
                  modo === m.id ? 'bg-white text-[#0439D9] shadow-sm' : 'text-[#627A9B] hover:text-[#011140]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {modo === 'codigos' && (
            <>
              <label htmlFor="identificadores" className="text-sm font-semibold text-[#011140]">
                Códigos universitarios o CI
              </label>
              <textarea
                id="identificadores"
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setError('') }}
                rows={8}
                className="mt-2 w-full rounded-xl border border-[#B8CBEF] bg-[#F8FAFD] px-4 py-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
                placeholder={'Uno por línea o separados por coma\n201904725\n6512340'}
              />
              <p className="mt-1 text-xs text-[#627A9B]">
                {identificadores.length === 1 ? '1 identificador' : `${identificadores.length} identificadores`}
              </p>
            </>
          )}

          {modo === 'registro' && (
            <>
              <EstudianteFilters compact value={filtros} onChange={(v) => { setFiltros(v); setError('') }} />

              <div className="my-5 flex items-center gap-4">
                <span className="h-px flex-1 bg-[#E4E9F2]" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Estudiantes registrados</span>
                <span className="h-px flex-1 bg-[#E4E9F2]" />
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E4E9F2]">
                <div
                  aria-busy={buscando}
                  className={`max-h-[22rem] overflow-y-auto transition-opacity ${buscando && resultados.length > 0 ? 'opacity-60' : ''}`}
                >
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#F8FAFD] text-xs font-semibold uppercase tracking-wider text-[#344054]">
                      <tr className="border-b border-[#E4E9F2]">
                        <th scope="col" className="w-12 py-4 pl-5 pr-2 sm:w-16 sm:pl-6">
                          <input
                            type="checkbox"
                            aria-label="Seleccionar todos"
                            checked={todosSeleccionados}
                            disabled={seleccionables.length === 0 || sinConexion}
                            onChange={(e) => alternarTodos(e.target.checked)}
                            className="h-[18px] w-[18px] cursor-pointer accent-[#0439D9] disabled:cursor-not-allowed"
                          />
                        </th>
                        <th scope="col" className="py-4 pr-4">Estudiante</th>
                        <th scope="col" className="hidden w-40 py-4 pr-4 sm:table-cell">Documento (CI)</th>
                        <th scope="col" className="hidden w-48 py-4 pr-5 md:table-cell">Carrera</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF1F6]">
                      {sinConexion ? (
                        <tr>
                          <td colSpan={4} role="alert" className="px-4 py-8 text-center text-sm text-amber-700">
                            Sin conexión a Internet. No se pudo consultar el registro de estudiantes.
                            <button
                              type="button"
                              onClick={() => setReintento((n) => n + 1)}
                              className="mx-auto mt-2 flex items-center gap-1 text-xs font-semibold text-[#0439D9]"
                            >
                              <RotateCw size={12} aria-hidden="true" /> Reintentar
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {(buscando || !consultado) && resultados.length === 0 && (
                            <tr>
                              <td colSpan={4} role="status" className="px-4 py-10 text-center text-sm text-[#627A9B]">
                                <LoaderCircle size={26} className="mx-auto mb-2 animate-spin text-[#0439D9]" aria-hidden="true" />
                                Buscando estudiantes…
                              </td>
                            </tr>
                          )}
                          {!buscando && consultado && resultados.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#627A9B]">
                                No se encontraron estudiantes con ese criterio.
                              </td>
                            </tr>
                          )}
                          {resultados.map((e) => {
                            const yaAsociado = asociados.has(e.id)
                            const marcado = yaAsociado || seleccion.has(e.id)
                            return (
                              <tr
                                key={e.id}
                                onClick={() => !yaAsociado && alternar(e)}
                                className={`transition-colors ${
                                  yaAsociado
                                    ? 'cursor-not-allowed opacity-60'
                                    : `cursor-pointer ${marcado ? 'bg-[#F5F8FF]' : 'hover:bg-[#F8FAFD]'}`
                                }`}
                              >
                                <td className="py-4 pl-5 pr-2 sm:pl-6">
                                  <input
                                    type="checkbox"
                                    checked={marcado}
                                    disabled={yaAsociado}
                                    onClick={(ev) => ev.stopPropagation()}
                                    onChange={() => alternar(e)}
                                    aria-label={`Seleccionar a ${e.nombre} ${e.apellidos}`}
                                    className="h-[18px] w-[18px] cursor-pointer accent-[#0439D9] disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="min-w-0 py-4 pr-4">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-[15px] font-semibold text-[#101828]">
                                      {e.nombre} {e.apellidos}
                                    </span>
                                    {yaAsociado && (
                                      <span className="shrink-0 rounded-full bg-[#EEF3FC] px-2 py-0.5 text-[11px] font-medium text-[#627A9B]">
                                        Ya asociado
                                      </span>
                                    )}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-[#98A2B3]">Cód: {e.codigoSis}</span>
                                  <span className="mt-0.5 block truncate text-xs text-[#667085] sm:hidden">
                                    CI {e.ci} · {carrerasDe(e)}
                                  </span>
                                </td>
                                <td className="hidden py-4 pr-4 font-medium text-[#101828] sm:table-cell">{e.ci}</td>
                                <td className="hidden truncate py-4 pr-5 text-[#344054] md:table-cell" title={carrerasDe(e)}>
                                  {carrerasDe(e)}
                                </td>
                              </tr>
                            )
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
                {resultados.length > 0 && !sinConexion && (
                  <div className="flex items-center justify-between gap-2 border-t border-[#E4E9F2] bg-[#F8FAFD] px-5 py-3.5 text-sm text-[#475467] sm:px-6">
                    <span>
                      Mostrando <span className="font-semibold text-[#101828]">1-{resultados.length}</span> de{' '}
                      <span className="font-semibold text-[#101828]">{Math.max(totalRegistros, resultados.length).toLocaleString('es')}</span>{' '}
                      estudiantes
                    </span>
                    {buscando && (
                      <span role="status" className="inline-flex items-center gap-1.5 text-xs text-[#627A9B]">
                        <LoaderCircle size={14} className="animate-spin text-[#0439D9]" aria-hidden="true" />
                        Actualizando…
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-[#C9D8F5] bg-[#F7F9FE] px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#0439D9]">
                    <ListChecks size={16} aria-hidden="true" />
                    Seleccionados: {seleccion.size}
                  </p>
                  {seleccion.size > 0 && (
                    <button type="button" onClick={() => setSeleccion(new Map())} className="text-xs font-medium text-[#0439D9] hover:underline">
                      Quitar selección
                    </button>
                  )}
                </div>
                {seleccion.size === 0 ? (
                  <p className="mt-1.5 text-sm text-[#667085]">Marca estudiantes en la tabla para asociarlos al examen.</p>
                ) : (
                  <ul aria-label="Estudiantes seleccionados" className="mt-2 space-y-1">
                    {(verTodos ? seleccionados : seleccionados.slice(0, RESUMEN_VISIBLE)).map((e) => (
                      <li key={e.id} className="flex items-center gap-2.5 text-sm text-[#344054]">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" />
                        <span className="truncate">{e.nombre} {e.apellidos} ({e.codigoSis})</span>
                      </li>
                    ))}
                  </ul>
                )}
                {seleccion.size > RESUMEN_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setVerTodos((v) => !v)}
                    className="mt-2 text-xs font-semibold text-[#0439D9] hover:underline"
                  >
                    {verTodos ? 'Ver menos' : `Ver todo (${seleccion.size})`}
                  </button>
                )}
              </div>
            </>
          )}

          {modo === 'inscritos' && (
            <p className="rounded-2xl border border-[#C9D8F5] bg-[#F7F9FE] px-5 py-4 text-sm text-[#011140]">
              Se asociarán, pendientes de habilitación, todos los estudiantes inscritos en el paralelo de este examen
              (misma materia y docente) que todavía no estén asociados.
            </p>
          )}

          {resumen && (
            <div role="status" className="mt-4 space-y-1 rounded-xl border border-[#D8E3F5] bg-[#F7F9FE] px-4 py-3 text-xs text-[#011140]">
              <p className="font-semibold">
                {resumen.asociados === 0
                  ? modo === 'inscritos'
                    ? 'No hay inscritos pendientes de asociar en este paralelo.'
                    : 'No se asoció ningún estudiante.'
                  : resumen.asociados === 1
                    ? 'Se asoció 1 estudiante.'
                    : `Se asociaron ${resumen.asociados} estudiantes.`}
              </p>
              {resumen.yaAsociados.length > 0 && <p>Ya estaban asociados: {resumen.yaAsociados.join(', ')}</p>}
              {resumen.noEncontrados.length > 0 && (
                <p className="text-red-700">No se encontraron: {resumen.noEncontrados.join(', ')}</p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#E9EEF6] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:bg-[#F8FAFD] sm:px-10 sm:py-5">
          <button
            type="button"
            onClick={solicitarCierre}
            disabled={saving}
            className="w-full rounded-lg border border-[#C9D7EC] bg-white px-4 py-2 text-sm font-semibold text-[#45628D] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50 sm:w-auto sm:rounded-xl sm:border-[#D0D5DD] sm:px-6 sm:py-2.5 sm:text-[#101828]"
          >
            {resumen ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 w-full rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#0439D9]/20 transition-colors hover:bg-[#0331BD] disabled:opacity-60 sm:w-auto sm:rounded-xl sm:px-7 sm:py-2.5 sm:font-semibold sm:shadow-[0_6px_16px_-4px_rgba(4,57,217,0.5)]"
          >
            {saving
              ? 'Asociando…'
              : modo === 'inscritos'
                ? 'Asociar inscritos'
                : identificadores.length > 0
                  ? `Asociar (${identificadores.length})`
                  : 'Asociar'}
          </button>
        </footer>

        <ConfirmDiscardDialog
          open={confirmarCierre}
          onStay={() => setConfirmarCierre(false)}
          onLeave={onClose}
        />
      </form>
      <ResultadoModal
        resultado={resultado}
        onClose={() => {
          setResultado(null)
          if (cerrarAlTerminar) onClose()
        }}
      />
    </div>
  )
}
