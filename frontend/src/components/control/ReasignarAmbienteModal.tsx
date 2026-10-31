import { useEffect, useMemo, useState } from 'react'
import { X, Calendar, MapPin, ShieldAlert, Info, Mail, CheckCircle2 } from 'lucide-react'
import { reasignarAmbiente } from '../../services/controlExamenService'
import type { EstudianteAsignado } from '../../services/controlExamenService'
import { listarAmbientes, type AmbienteDto } from '../../services/ambienteService'
import { ConfirmDiscardDialog } from '../examenes/ExamFormDialogs'

interface Props {
  idExamen: number
  examenNombre?: string
  estudiante: EstudianteAsignado
  aulas?: AmbienteDto[]
  aulaActualId?: number | null
  onClose: () => void
  onSuccess: () => void
}

/** Límites del traslado, iguales a los del servidor (TextoTraslado). */
const MOTIVO_MIN = 10
const TEXTO_MAX = 65

export default function ReasignarAmbienteModal({ idExamen, examenNombre, estudiante, aulas, aulaActualId, onClose, onSuccess }: Props) {
  const [idAmbienteDestino, setIdAmbienteDestino] = useState<number | ''>('')
  const [motivo, setMotivo] = useState('')
  const [observacion, setObservacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [errorObservacion, setErrorObservacion] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [successGeneral, setSuccessGeneral] = useState<string | null>(null)
  const [ambientes, setAmbientes] = useState<AmbienteDto[]>([])
  const [cargandoAmbientes, setCargandoAmbientes] = useState(true)
  const [confirmarDescartar, setConfirmarDescartar] = useState(false)

  /** Hay datos que el usuario aún no ha guardado (aula destino, motivo u observación). */
  const hayCambiosSinGuardar = () =>
    idAmbienteDestino !== '' ||
    motivo.trim() !== '' ||
    observacion.trim() !== ''

  /** Cierre controlado: si hay cambios sin guardar, pide confirmar antes de salir. */
  const manejarCerrar = () => {
    if (hayCambiosSinGuardar()) {
      setConfirmarDescartar(true)
    } else {
      onClose()
    }
  }

  const confirmarDescartarDatos = () => {
    setConfirmarDescartar(false)
    onClose()
  }

  const aulaActualNombre = useMemo(() => {
    if (!aulaActualId) return '—'
    const a = [...(aulas ?? []), ...ambientes].find(
      (a: AmbienteDto) => a.id === aulaActualId
    )
    return a ? a.nombre : '—'
  }, [aulas, ambientes, aulaActualId])

  useEffect(() => {
    let vigente = true

    listarAmbientes()
      .then((data) => {
        if (vigente) setAmbientes(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (vigente) setAmbientes([])
      })
      .finally(() => {
        if (vigente) setCargandoAmbientes(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  const opciones = useMemo(() => {
    const lista = Array.isArray(aulas) ? aulas : ambientes
    return lista
      .map((a: AmbienteDto) => {
        if (aulaActualId && a.id === aulaActualId) return null
        return { id: a.id, nombre: a.nombre, ubicacion: a.ubicacion }
      })
      .filter((a): a is { id: number; nombre: string; ubicacion: string | null } => a !== null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [ambientes, aulas, aulaActualId])

  const esSoloUnaLetraRepetida = (texto: string) => {
    const letras = texto.replace(/\s/g, '').toUpperCase()
    if (letras.length === 0) return false
    const primera = letras[0]
    return letras.split('').every(c => c === primera)
  }

  /** Formato oración: primera letra mayúscula, resto minúsculas; códigos de aula con dígitos en mayúscula (ej. "690B"). */
  const formatoOracion = (texto: string): string => {
    if (!texto) return texto
    const palabras = texto.toLowerCase().split(' ')
    for (let i = 0; i < palabras.length; i++) {
      if (/\d/.test(palabras[i])) {
        palabras[i] = palabras[i].toUpperCase()
      }
    }
    let resultado = palabras.join(' ')
    if (resultado.length === 0) return resultado
    return resultado.charAt(0).toUpperCase() + resultado.slice(1)
  }


  // Mismas reglas que el servidor (TextoTraslado): letras con tildes, ü y ñ.
  const motivoError = (texto: string): string | null => {
    const limpio = texto.trim().replace(/\s+/g, ' ')
    if (!limpio) return 'El motivo es obligatorio'
    // C04: no permitir espacios múltiples ni espacios al inicio/final
    if (texto !== texto.trim() || texto.includes('  ')) return 'No uses espacios al inicio o final, ni múltiples espacios entre palabras'
    if (limpio.length < MOTIVO_MIN) return 'El motivo debe contener al menos 10 caracteres'
    if (limpio.length > TEXTO_MAX) return 'El motivo no puede superar 65 caracteres'
    if (!/^\p{L}/u.test(limpio)) return 'El motivo debe comenzar con una letra'
    if (!/^[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9 ]+$/.test(limpio)) return 'El motivo solo permite letras, números y espacios simples entre palabras'
    // No permitir que el motivo sea solo el mismo carácter repetido (ej: "SSS SSSSS", "AAAAA")
    if (esSoloUnaLetraRepetida(limpio)) return 'El motivo no puede ser solo el mismo carácter repetido'
    return null
  }

  const observacionError = (texto: string): string | null => {
    const limpia = texto.trim().replace(/\s+/g, ' ')
    if (!limpia) return null
    if (texto !== texto.trim() || texto.includes('  ')) return 'No uses espacios al inicio o final, ni múltiples espacios entre palabras'
    if (limpia.length < MOTIVO_MIN) return 'La observación debe contener al menos 10 caracteres'
    if (limpia.length > TEXTO_MAX) return 'La observación no puede superar 65 caracteres'
    if (!/^[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ ]+$/.test(limpia)) return 'La observación solo permite letras y espacios simples entre palabras'
    return null
  }

  const validarMotivo = () => {
    const error = motivoError(motivo)
    setErrorMotivo(error)
    return error
  }

  const validarObservacion = () => {
    const error = observacionError(observacion)
    setErrorObservacion(error)
    return error
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMotivo(null)
    setErrorObservacion(null)
    setErrorGeneral(null)

    if (idAmbienteDestino === '' || Number(idAmbienteDestino) <= 0) {
      setErrorGeneral('Selecciona un aula destino')
      return
    }
    if (aulaActualId && Number(idAmbienteDestino) === aulaActualId) {
      setErrorGeneral('Selecciona un aula distinta a la actual')
      return
    }

    // Se valida con el valor actual: el estado del error todavía no se actualizó en este render.
    if (validarMotivo() || validarObservacion()) return

    try {
      setCargando(true)
      await reasignarAmbiente(idExamen, estudiante.idEstudiante, {
        idAmbienteDestino: Number(idAmbienteDestino),
        // El servidor aplica el formato oración (conserva los códigos de aula, p. ej. 690B).
        motivo: motivo.trim().replace(/\s+/g, ' '),
        observacion: observacion.trim().replace(/\s+/g, ' ') || undefined,
      })
      setSuccessGeneral('El estudiante fue reasignado exitosamente al nuevo ambiente.')
      // Mostrar el mensaje de éxito brevemente antes de cerrar el modal.
      await new Promise(resolve => setTimeout(resolve, 1500))
      onSuccess()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data
      const msg = data?.mensaje || data?.message || data?.error || (typeof data === 'string' ? data : '') || err?.message || 'No se pudo reasignar el ambiente'
      if (msg === 'Not Found') setErrorGeneral('El estudiante no está asociado al examen seleccionado')
      else setErrorGeneral(msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 backdrop-blur-sm">
      <div className="relative w-full max-w-md sm:max-w-lg transform scale-100 transition-all duration-200 bg-white rounded-2xl shadow-2xl border border-[#E2E6EC]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E6EC] px-4 sm:px-6 py-4 bg-[#F8FAFC] rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0439D9]/10 flex items-center justify-center">
              <MapPin size={18} className="text-[#0439D9]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#011140] leading-tight">Reasignar ambiente por contingencia</h3>
              <p className="text-[10px] text-[#758EBF] leading-tight">{estudiante.nombre} {estudiante.apellidos}</p>
            </div>
          </div>
          <button type="button" onClick={manejarCerrar} className="rounded-lg p-2 text-[#758EBF] hover:bg-[#E2E6EC] hover:text-[#011140] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Estudiante info */}
          <div className="flex items-start gap-3 px-1">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center text-[#011140] font-bold text-xs border border-[#E2E6EC]">
              {estudiante.nombre.charAt(0)}{estudiante.apellidos.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#011140]">{estudiante.nombre} {estudiante.apellidos}</p>
              <p className="text-[10px] text-[#758EBF]">{estudiante.codigoSis}</p>
            </div>
            <div className="ml-2 flex items-center gap-1 px-2 py-1 rounded bg-[#F0F7FF] text-[#0439D9] text-[10px] font-medium border border-[#BFE3FF]">
              <Calendar size={10} /> {examenNombre}
            </div>
          </div>

          {/* Aula actual */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-bold text-[#011140] uppercase tracking-wider">
              <Calendar size={10} /> Aula actual
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D8E3F5] bg-[#F2F2F2]">
              <MapPin size={14} className="text-[#758EBF]" />
              <span className="text-sm text-[#011140] font-medium">{aulaActualNombre}</span>
            </div>
          </div>

          {/* Aula destino */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-bold text-[#011140] uppercase tracking-wider">
              <MapPin size={10} /> Aula destino
            </label>
            <select
              value={idAmbienteDestino}
              onChange={(e) => setIdAmbienteDestino(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-lg border border-[#D8E3F5] bg-[#F2F2F2] px-3 py-2.5 text-sm text-[#011140] focus:border-[#0439D9] focus:ring-1 focus:ring-[#0439D9] disabled:bg-[#F2F2F2] disabled:text-[#758EBF] disabled:cursor-not-allowed appearance-none"
              disabled={cargando || cargandoAmbientes}
            >
              <option value="">{cargandoAmbientes ? 'Cargando aulas...' : 'Seleccionar aula'}</option>
              {opciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}{a.ubicacion ? ` · ${a.ubicacion}` : ''}
                </option>
              ))}
            </select>
            {opciones.length === 0 && <p className="text-[10px] text-[#B91C1C] mt-0.5">No hay otro aula disponible para este examen</p>}
          </div>

          {/* Motivo */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-bold text-[#011140] uppercase tracking-wider">
              <ShieldAlert size={10} /> Motivo (obligatorio)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(formatoOracion(e.target.value))}
              onBlur={() => validarMotivo()}
              maxLength={TEXTO_MAX}
              rows={3}
              className={`w-full rounded-lg border border-[#D8E3F5] bg-[#F2F2F2] px-3 py-2.5 text-sm text-[#011140] placeholder-[#758EBF]/40 focus:border-[#0439D9] focus:ring-1 focus:ring-[#0439D9] disabled:bg-[#F2F2F2] disabled:text-[#758EBF] disabled:cursor-not-allowed ${
                errorMotivo ? 'border-[#B91C1C] focus:border-[#B91C1C]' : ''
              }`}
              placeholder="Ej. Computadora dañada, corte de red..."
              disabled={cargando}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[#758EBF]">{motivo.length}/{TEXTO_MAX}</span>
            </div>
            {errorMotivo && (
              <div className="flex items-start mt-1">
                <ShieldAlert size={10} className="mt-0.5 shrink-0" />
                <p className="text-[10px] text-[#B91C1C] leading-tight m-0 pl-3">
                  {errorMotivo}
                </p>
              </div>
            )}
          </div>

          {/* Observación */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-bold text-[#011140] uppercase tracking-wider">
              <Info size={10} /> Observación (opcional)
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(formatoOracion(e.target.value))}
              onBlur={() => validarObservacion()}
              maxLength={TEXTO_MAX}
              rows={2}
              className={`w-full rounded-lg border border-[#D8E3F5] bg-[#F2F2F2] px-3 py-2.5 text-sm text-[#011140] placeholder-[#758EBF]/40 focus:border-[#0439D9] focus:ring-1 focus:ring-[#0439D9] disabled:bg-[#F2F2F2] disabled:text-[#758EBF] disabled:cursor-not-allowed ${
                errorObservacion ? 'border-[#B91C1C] focus:border-[#B91C1C]' : ''
              }`}
              placeholder="Observaciones adicionales del traslado..."
              disabled={cargando}
            />
            <span className="mt-1 text-[10px] text-[#758EBF]">{observacion.length}/{TEXTO_MAX}</span>
            {errorObservacion && (
              <div className="flex items-start mt-1">
                <ShieldAlert size={10} className="mt-0.5 shrink-0" />
                <p className="text-[10px] text-[#B91C1C] leading-tight m-0 pl-3">
                  {errorObservacion}
                </p>
              </div>
            )}
          </div>

          {/* Éxito general */}          {successGeneral && (
            <div className="flex items-start gap-2 rounded-lg border border-[#BBF7D0] bg-[#ECFDF5] px-3 py-2 text-[11px] text-[#065F46] mt-2">
              <CheckCircle2 size={12} className="mt-0.5" />
              <span className="break-words whitespace-normal leading-tight">{successGeneral}</span>
            </div>
          )}
          {/* Error general */}
          {errorGeneral && (
            <div className="flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C] mt-2">
              <ShieldAlert size={12} className="mt-0.5" />
              <span className="break-words whitespace-normal leading-tight">{errorGeneral}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E2E6EC] bg-[#F8FAFC] rounded-b-2xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end sm:justify-end gap-3 sm:gap-3">
          <button
            type="button"
            onClick={manejarCerrar}
            className={`w-full sm:w-auto flex items-center gap-2 rounded-lg border border-[#D8E3F5] bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-[#011140] hover:bg-[#E2E6EC] disabled:opacity-60 disabled:cursor-not-allowed transition-colors`}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            onClick={(e) => { e.preventDefault(); enviar(e); }}
            className={`w-full sm:w-auto flex items-center gap-2 rounded-lg bg-[#0439D9] px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#022FBF] disabled:opacity-60 disabled:bg-[#0439D9]/40 transition-colors shadow-md hover:shadow-lg`}
            disabled={cargando}
          >
            {cargando ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Reasignando...
              </>
            ) : (
              <>
                <Mail size={14} /> Reasignar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advertencia de pérdida de datos al cerrar con X o Cancelar */}
      <ConfirmDiscardDialog
        open={confirmarDescartar}
        onStay={() => setConfirmarDescartar(false)}
        onLeave={confirmarDescartarDatos}
      />
    </div>
  )
}
