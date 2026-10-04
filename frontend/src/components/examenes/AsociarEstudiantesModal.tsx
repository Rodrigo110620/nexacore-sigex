import { useEffect, useState } from 'react'
import { LoaderCircle, RotateCw, X } from 'lucide-react'
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
  { id: 'codigos', label: 'Códigos / CI' },
  { id: 'registro', label: 'Del registro' },
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
  /** Ids ya asociados al examen: en "Del registro" aparecen marcados y bloqueados. */
  asociados: Set<number>
  onAsociados: (lista: EstudianteHabilitacionDto[]) => void
  onClose: () => void
}

export default function AsociarEstudiantesModal({
  idExamen,
  idParalelo,
  asociados,
  onAsociados,
  onClose,
}: AsociarEstudiantesModalProps) {
  const [modo, setModo] = useState<Modo>('codigos')
  const [texto, setTexto] = useState('')
  const [filtros, setFiltros] = useState<EstudianteFilterParams>({ search: '', idFacultad: '', idCarrera: '' })
  const busquedaDebounced = useDebouncedValue(filtros.search, 300)
  const [resultados, setResultados] = useState<EstudianteListItem[]>([])
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
        .then((page) => setResultados(page.contenido))
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="asociar-titulo"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#D8E3F5] bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault()
          void enviar()
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="asociar-titulo" className="text-base font-bold text-[#011140]">Asociar estudiantes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Quedan pendientes de habilitación y, si no lo estaban, inscritos en el paralelo de este examen.
            </p>
          </div>
          <button
            type="button"
            onClick={solicitarCierre}
            disabled={saving}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div role="tablist" className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-[#EEF3FC] p-1">
          {MODOS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={modo === m.id}
              onClick={() => cambiarModo(m.id)}
              className={`rounded-md px-2 py-2 text-xs font-semibold sm:text-sm ${
                modo === m.id ? 'bg-white text-[#0439D9] shadow-sm' : 'text-[#627A9B] hover:text-[#011140]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="-mx-1 mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-1 pt-0.5">
          {modo === 'codigos' && (
            <>
              <label htmlFor="identificadores" className="text-sm font-medium text-[#011140]">
                Códigos universitarios o CI
              </label>
              <textarea
                id="identificadores"
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setError('') }}
                rows={6}
                className="mt-2 w-full rounded-md border border-[#B8CBEF] px-3 py-2 text-sm text-[#011140]"
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
              {resultados.length > 0 && !sinConexion && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-[#011140]">
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      disabled={seleccionables.length === 0}
                      onChange={(e) => alternarTodos(e.target.checked)}
                      className="h-4 w-4 accent-[#0439D9]"
                    />
                    Seleccionar todos
                  </label>
                  {buscando && (
                    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-[#627A9B]">
                      <LoaderCircle size={14} className="animate-spin text-[#0439D9]" aria-hidden="true" />
                      Actualizando…
                    </span>
                  )}
                </div>
              )}
              <ul
                aria-busy={buscando}
                className={`mt-2 divide-y transition-opacity ${buscando && resultados.length > 0 ? 'opacity-60' : ''} divide-[#EEF3FC] rounded-md border border-[#D8E3F5]`}>
                {sinConexion ? (
                  <li role="alert" className="flex flex-col items-center gap-2 px-3 py-4 text-center text-sm text-amber-700">
                    Sin conexión a Internet. No se pudo consultar el registro de estudiantes.
                    <button
                      type="button"
                      onClick={() => setReintento((n) => n + 1)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0439D9]"
                    >
                      <RotateCw size={12} aria-hidden="true" /> Reintentar
                    </button>
                  </li>
                ) : (
                  <>
                    {(buscando || !consultado) && resultados.length === 0 && (
                      <li role="status" className="flex flex-col items-center gap-2 px-3 py-6 text-center text-sm text-[#627A9B]">
                        <LoaderCircle size={26} className="animate-spin text-[#0439D9]" aria-hidden="true" />
                        Buscando estudiantes…
                      </li>
                    )}
                    {!buscando && consultado && resultados.length === 0 && (
                      <li className="px-3 py-4 text-center text-sm text-[#627A9B]">
                        No se encontraron estudiantes con ese criterio.
                      </li>
                    )}
                    {resultados.map((e) => {
                      const yaAsociado = asociados.has(e.id)
                      return (
                        <li key={e.id}>
                          <label
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                              yaAsociado ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#F7F9FE]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={yaAsociado || seleccion.has(e.id)}
                              disabled={yaAsociado}
                              onChange={() => alternar(e)}
                              aria-label={`Seleccionar a ${e.nombre} ${e.apellidos}`}
                              className="h-4 w-4 accent-[#0439D9]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-[#011140]">{e.nombre} {e.apellidos}</span>
                              <span className="block truncate text-xs text-[#627A9B]">
                                CI {e.ci} · Cód. {e.codigoSis} · {carrerasDe(e)}
                              </span>
                            </span>
                            {yaAsociado && <span className="text-xs font-medium text-[#627A9B]">Ya asociado</span>}
                          </label>
                        </li>
                      )
                    })}
                  </>
                )}
              </ul>

              <div className="mt-3 rounded-lg border border-[#D8E3F5] bg-[#F7F9FE] px-3 py-2 text-xs text-[#011140]">
                <p className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-bold">{seleccion.size}</span>{' '}
                    {seleccion.size === 1 ? 'seleccionado' : 'seleccionados'}
                  </span>
                  {seleccion.size > 0 && (
                    <button type="button" onClick={() => setSeleccion(new Map())} className="font-medium text-[#0439D9]">
                      Quitar selección
                    </button>
                  )}
                </p>
                {seleccion.size > 0 && (
                  <ul aria-label="Estudiantes seleccionados" className="mt-1.5 space-y-0.5">
                    {(verTodos ? seleccionados : seleccionados.slice(0, RESUMEN_VISIBLE)).map((e) => (
                      <li key={e.id} className="truncate">{e.nombre} {e.apellidos} · {e.codigoSis}</li>
                    ))}
                  </ul>
                )}
                {seleccion.size > RESUMEN_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setVerTodos((v) => !v)}
                    className="mt-1 font-semibold text-[#0439D9] hover:underline"
                  >
                    {verTodos ? 'Ver menos' : `Ver todo (${seleccion.size})`}
                  </button>
                )}
              </div>
            </>
          )}

          {modo === 'inscritos' && (
            <p className="rounded-lg border border-[#D8E3F5] bg-[#F7F9FE] px-3 py-3 text-sm text-[#011140]">
              Se asociarán, pendientes de habilitación, todos los estudiantes inscritos en el paralelo de este examen
              (misma materia y docente) que todavía no estén asociados.
            </p>
          )}

          {resumen && (
            <div role="status" className="mt-3 space-y-1 rounded-lg border border-[#D8E3F5] bg-[#F7F9FE] px-3 py-2 text-xs text-[#011140]">
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
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={solicitarCierre} disabled={saving} className="flex-1 rounded-lg border py-2.5 text-sm font-medium">
            {resumen ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-[#0439D9] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving
              ? 'Asociando…'
              : modo === 'inscritos'
                ? 'Asociar inscritos'
                : identificadores.length > 1
                  ? `Asociar ${identificadores.length}`
                  : 'Asociar'}
          </button>
        </div>

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
