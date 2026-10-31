import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, X } from 'lucide-react'
import axios from 'axios'
import { reprogramarExamen, type ExamenDto } from '../../services/examenService'
import { addMinutes, formatFecha, horaCorta } from '../../utils/examenFormat'
import { isNetworkError, isOffline, minutesBetween, todayISO } from '../../utils/examFormUtils'
import { MOTIVO_REPROGRAMACION_MAX, validarMotivoReprogramacion } from '../../utils/motivoReprogramacion'
import { ConfirmDiscardDialog } from './ExamFormDialogs'
import FechaInput from './FechaInput'
import HoraSelector from './HoraSelector'

interface Props {
  examen: ExamenDto
  onClose: () => void
  onReprogramado: (examen: ExamenDto) => void
}

type Campo = 'fecha' | 'horaFin' | 'motivo'

const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'

/**
 * Reprogramar un examen que ya finalizó, para repetirlo: la sesión anterior queda en el historial y
 * todos los estudiantes vuelven a "no ingresado".
 */
export default function ReprogramarExamenModal({ examen, onClose, onReprogramado }: Props) {
  const horaInicial = horaCorta(examen.horaInicio)
  const horaFinInicial = horaCorta(addMinutes(examen.horaInicio, examen.duracionMinutos))
  const [fecha, setFecha] = useState('')
  // Mismo formato que crear y editar: hora de inicio y de fin con el selector; la duración se calcula.
  const [hora, setHora] = useState(horaInicial)
  const [horaFin, setHoraFin] = useState(horaFinInicial)
  const duracion = minutesBetween(hora, horaFin)
  const [motivo, setMotivo] = useState('')
  // BUG 8 (2.º test run): cada error va debajo de su campo; el de conexión o del servidor, al final.
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [reprogramado, setReprogramado] = useState<ExamenDto | null>(null)
  const [descartar, setDescartar] = useState(false)

  const hayDatos = fecha !== '' || motivo !== '' || hora !== horaInicial || horaFin !== horaFinInicial
  const cerrar = () => {
    if (guardando) return
    if (hayDatos && !reprogramado) setDescartar(true)
    else onClose()
  }

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || descartar) return
      if (reprogramado) onReprogramado(reprogramado)
      else cerrar()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  })

  const limpiar = (campo: Campo) => {
    setErrores((e) => ({ ...e, [campo]: undefined }))
    setError('')
  }

  const validar = (): Partial<Record<Campo, string>> => {
    const e: Partial<Record<Campo, string>> = {}
    if (!fecha || !hora) e.fecha = 'Indica la nueva fecha (dd/mm/aaaa) y la hora de inicio.'
    else if (fecha < todayISO()) e.fecha = 'La nueva fecha no puede ser anterior a hoy.'
    if (!horaFin || duracion === null) e.horaFin = 'La hora de fin debe ser posterior a la hora de inicio.'
    const motivoError = validarMotivoReprogramacion(motivo)
    if (motivoError) e.motivo = motivoError
    return e
  }

  const enviar = async () => {
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0 || duracion === null) return
    if (isOffline()) return setError(SIN_CONEXION)
    setGuardando(true)
    setError('')
    try {
      const actualizado = await reprogramarExamen(examen.idExamen, examen.idParalelo, {
        fecha, horaInicio: hora, duracionMinutos: duracion, motivo,
      })
      setReprogramado(actualizado)
    } catch (err) {
      if (isNetworkError(err)) {
        setError(SIN_CONEXION)
      } else {
        const datos = axios.isAxiosError(err) ? (err.response?.data as { mensaje?: string; errores?: Record<string, string> } | undefined) : undefined
        setError(datos?.mensaje ?? Object.values(datos?.errores ?? {})[0] ?? 'No se pudo reprogramar el examen. Inténtalo de nuevo.')
      }
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'mt-1 w-full rounded-md border bg-white px-3 py-2.5 text-sm text-[#011140] focus:border-[#0439D9] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]'
  const errorCampo = (c: Campo) => errores[c] && (
    <p id={`reprogramar-${c}-error`} role="alert" className="mt-1 text-xs text-red-700">{errores[c]}</p>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="reprogramar-titulo">
      <div className="relative max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <ConfirmDiscardDialog open={descartar} onStay={() => setDescartar(false)} onLeave={onClose} />
        {reprogramado ? (
          // BUG 8: modal de éxito al reprogramar.
          <div role="status" className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF3] text-[#15803D]">
              <CheckCircle2 size={30} aria-hidden="true" />
            </span>
            <h2 id="reprogramar-titulo" className="text-lg font-bold text-[#011140]">Examen reprogramado</h2>
            <p className="text-sm text-[#45628D]">
              {examen.asignatura} se rendirá el <strong>{formatFecha(reprogramado.fecha)}</strong> a las{' '}
              <strong>{horaCorta(reprogramado.horaInicio)}</strong>. La sesión anterior quedó en el historial.
            </p>
            <button type="button" onClick={() => onReprogramado(reprogramado)}
              className="mt-2 h-11 w-full rounded-lg bg-[#0439D9] px-5 text-sm font-bold text-white hover:bg-[#0027a2] sm:w-auto">
              Aceptar
            </button>
          </div>
        ) : (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-[#EDF1F7] px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
                  <CalendarClock size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="reprogramar-titulo" className="text-base font-bold text-[#011140]">Reprogramar examen</h2>
                  <p className="text-xs text-[#627A9B]">{examen.asignatura} · fue el {formatFecha(examen.fecha)} a las {horaCorta(examen.horaInicio)}</p>
                </div>
              </div>
              <button type="button" onClick={cerrar} disabled={guardando} aria-label="Cerrar" className="rounded-full p-1.5 text-[#627A9B] hover:bg-[#F1F6FF] disabled:opacity-50">
                <X size={16} />
              </button>
            </header>

            <div className="flex flex-col gap-3 px-5 py-4">
              <p className="rounded-lg bg-[#F1F6FF] p-3 text-xs text-[#344158]">
                La sesión anterior se guarda en el historial con el resultado de cada estudiante. Todos vuelven a
                <strong> no ingresado</strong> y se mantienen la lista y su habilitación. Quienes fueron denegados por el
                control quedan <strong>pendientes</strong> de revisión.
              </p>
              <div className="min-w-0">
                <label htmlFor="reprogramar-fecha" className="mb-1 block text-xs font-medium text-[#011140]">
                  Nueva fecha <span className="text-red-500">*</span>
                </label>
                <FechaInput id="reprogramar-fecha" label="Nueva fecha" min={todayISO()} value={fecha} error={errores.fecha}
                  onChange={(v) => { setFecha(v); limpiar('fecha') }} />
                {errorCampo('fecha')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label htmlFor="reprogramar-hora-inicio" className="mb-1 block text-xs font-medium text-[#011140]">
                    Hora de Inicio <span className="text-red-500">*</span>
                  </label>
                  <HoraSelector id="reprogramar-hora-inicio" label="Hora de inicio" value={hora}
                    onChange={(v) => { setHora(v); limpiar('fecha'); limpiar('horaFin') }} />
                </div>
                <div className="min-w-0">
                  <label htmlFor="reprogramar-hora-fin" className="mb-1 block text-xs font-medium text-[#011140]">
                    Hora de Fin / Duración <span className="text-red-500">*</span>
                  </label>
                  <HoraSelector id="reprogramar-hora-fin" label="Hora de fin" value={horaFin}
                    onChange={(v) => { setHoraFin(v); limpiar('horaFin') }} />
                  {duracion !== null && <p className="mt-1 text-[10px] text-gray-500">{duracion} minutos</p>}
                  {errorCampo('horaFin')}
                </div>
              </div>
              <div>
                <label htmlFor="reprogramar-motivo" className="text-xs font-semibold text-[#011140]">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <textarea id="reprogramar-motivo" rows={3} maxLength={MOTIVO_REPROGRAMACION_MAX} value={motivo}
                  placeholder="Ej.: se repite por un corte de luz"
                  aria-invalid={!!errores.motivo}
                  aria-describedby={errores.motivo ? 'reprogramar-motivo-error' : undefined}
                  onChange={(e) => { setMotivo(e.target.value); limpiar('motivo') }}
                  onBlur={() => motivo && setErrores((e) => ({ ...e, motivo: validarMotivoReprogramacion(motivo) ?? undefined }))}
                  className={`${campo} ${errores.motivo ? 'border-red-400' : 'border-gray-300'}`} />
                <span className="mt-0.5 flex justify-between gap-2 text-[11px] text-[#627A9B]">
                  <span>De 10 a {MOTIVO_REPROGRAMACION_MAX} caracteres: letras, números y espacios.</span>
                  <span className="shrink-0">{motivo.length}/{MOTIVO_REPROGRAMACION_MAX}</span>
                </span>
                {errorCampo('motivo')}
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-[#EDF1F7] px-5 py-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={cerrar} disabled={guardando} className="h-11 rounded-lg border border-[#D8E3F5] px-4 text-sm font-semibold text-[#011140] hover:bg-[#F1F6FF] disabled:opacity-60">
                Cancelar
              </button>
              <button type="button" onClick={() => void enviar()} disabled={guardando}
                className="h-11 rounded-lg bg-[#0439D9] px-5 text-sm font-bold text-white hover:bg-[#0027a2] disabled:opacity-60">
                {guardando ? 'Reprogramando...' : 'Reprogramar'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
