import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { getEstudiantes } from '../../services/estudianteService'
import {
  asociarEstudiantesLote,
  asociarInscritos,
  type AsociacionLoteDto,
  type EstudianteHabilitacionDto,
} from '../../services/habilitacionService'
import type { EstudianteListItem } from '../../types/estudiante'

type Modo = 'codigos' | 'registro' | 'inscritos'

const MODOS: { id: Modo; label: string }[] = [
  { id: 'codigos', label: 'Códigos / CI' },
  { id: 'registro', label: 'Del registro' },
  { id: 'inscritos', label: 'Inscritos' },
]
const RESULTADOS_REGISTRO = 8

/** Mensaje del backend (ErrorResponse.mensaje) o, si no hay respuesta, uno de conexión. */
const mensajeDeError = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: { mensaje?: string } } }
  if (!e.response) return 'No se pudo conectar con el servidor. Intenta más tarde.'
  return e.response.data?.mensaje || fallback
}

/** Códigos o CI separados por saltos de línea, comas, punto y coma o espacios. */
const separarIdentificadores = (texto: string) => texto.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)

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
  const [busqueda, setBusqueda] = useState('')
  const busquedaDebounced = useDebouncedValue(busqueda, 300)
  const [resultados, setResultados] = useState<EstudianteListItem[]>([])
  const [buscando, setBuscando] = useState(false)
  const [seleccion, setSeleccion] = useState<Map<number, EstudianteListItem>>(new Map())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState<AsociacionLoteDto | null>(null)

  useEffect(() => {
    if (modo !== 'registro') return
    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      setBuscando(true)
      getEstudiantes(
        { page: 0, size: RESULTADOS_REGISTRO, search: busquedaDebounced.trim(), idFacultad: '', idCarrera: '' },
        controller.signal,
      )
        .then((page) => setResultados(page.contenido))
        .catch((err: unknown) => {
          if (!controller.signal.aborted) setError(mensajeDeError(err, 'No se pudo buscar estudiantes.'))
        })
        .finally(() => {
          if (!controller.signal.aborted) setBuscando(false)
        })
    }, 0)
    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [modo, busquedaDebounced])

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
  }

  const identificadores =
    modo === 'codigos' ? separarIdentificadores(texto) : [...seleccion.values()].map((e) => e.codigoSis)
  const puedeEnviar = modo === 'inscritos' || identificadores.length > 0

  const enviar = async () => {
    setSaving(true)
    setError('')
    setResumen(null)
    try {
      const resultado =
        modo === 'inscritos'
          ? await asociarInscritos(idExamen, idParalelo)
          : await asociarEstudiantesLote(idExamen, idParalelo, identificadores)
      onAsociados(resultado.estudiantes)
      const sinPendientes = resultado.yaAsociados.length === 0 && resultado.noEncontrados.length === 0
      if (resultado.asociados > 0 && sinPendientes) {
        onClose()
        return
      }
      setResumen(resultado)
      if (modo === 'codigos') setTexto([...resultado.yaAsociados, ...resultado.noEncontrados].join('\n'))
      if (modo === 'registro') setSeleccion(new Map())
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo asociar a los estudiantes.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#D8E3F5] bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault()
          void enviar()
        }}
      >
        <h3 className="text-base font-bold text-[#011140]">Asociar estudiantes</h3>
        <p className="mt-1 text-sm text-gray-500">
          Quedan habilitados y, si no lo estaban, inscritos en el paralelo de este examen.
        </p>

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

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {modo === 'codigos' && (
            <>
              <label htmlFor="identificadores" className="text-sm font-medium text-[#011140]">
                Códigos universitarios o CI
              </label>
              <textarea
                id="identificadores"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
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
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#011140]" aria-hidden="true" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, CI, código SIS"
                  autoComplete="off"
                  aria-label="Buscar en el registro de estudiantes"
                  className="h-11 w-full rounded-md border border-[#B8CBEF] bg-white pl-10 pr-3 text-sm text-[#011140]"
                />
              </div>
              <ul className="mt-3 divide-y divide-[#EEF3FC] rounded-md border border-[#D8E3F5]">
                {buscando && resultados.length === 0 && (
                  <li className="px-3 py-4 text-center text-sm text-[#627A9B]">Buscando…</li>
                )}
                {!buscando && resultados.length === 0 && (
                  <li className="px-3 py-4 text-center text-sm text-[#627A9B]">Sin resultados.</li>
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
                          className="h-4 w-4 accent-[#0439D9]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-[#011140]">{e.nombre} {e.apellidos}</span>
                          <span className="block truncate text-xs text-[#627A9B]">SIS {e.codigoSis} · CI {e.ci}</span>
                        </span>
                        {yaAsociado && <span className="text-xs font-medium text-[#627A9B]">Ya asociado</span>}
                      </label>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-[#627A9B]">
                {seleccion.size === 1 ? '1 seleccionado' : `${seleccion.size} seleccionados`}
                {seleccion.size > 0 && (
                  <button type="button" onClick={() => setSeleccion(new Map())} className="ml-2 font-medium text-[#0439D9]">
                    Quitar selección
                  </button>
                )}
              </p>
            </>
          )}

          {modo === 'inscritos' && (
            <p className="rounded-lg border border-[#D8E3F5] bg-[#F7F9FE] px-3 py-3 text-sm text-[#011140]">
              Se asociarán, habilitados, todos los estudiantes inscritos en el paralelo de este examen
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
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border py-2.5 text-sm font-medium">
            {resumen ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            type="submit"
            disabled={saving || !puedeEnviar}
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
      </form>
    </div>
  )
}
