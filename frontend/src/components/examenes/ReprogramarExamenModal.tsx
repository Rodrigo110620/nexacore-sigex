import { useState } from 'react'
import { CalendarClock, X } from 'lucide-react'
import axios from 'axios'
import { reprogramarExamen, type ExamenDto } from '../../services/examenService'
import { formatFecha, horaCorta } from '../../utils/examenFormat'

interface Props {
  examen: ExamenDto
  onClose: () => void
  onReprogramado: (examen: ExamenDto) => void
}

const MOTIVO_MAX = 200
const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Reprogramar un examen que ya finalizó, para repetirlo: la sesión anterior queda en el historial y
 * todos los estudiantes vuelven a "no ingresado".
 */
export default function ReprogramarExamenModal({ examen, onClose, onReprogramado }: Props) {
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState(horaCorta(examen.horaInicio))
  const [duracion, setDuracion] = useState(String(examen.duracionMinutos))
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const enviar = async () => {
    const minutos = Number(duracion)
    if (!fecha || !hora) return setError('Indica la nueva fecha y la hora de inicio.')
    if (!Number.isInteger(minutos) || minutos < 1) return setError('La duración debe ser de al menos 1 minuto.')
    if (motivo.trim().length < 5) return setError('Indica el motivo de la reprogramación (al menos 5 caracteres).')
    setGuardando(true)
    setError('')
    try {
      const actualizado = await reprogramarExamen(examen.idExamen, examen.idParalelo, {
        fecha, horaInicio: hora, duracionMinutos: minutos, motivo: motivo.trim(),
      })
      onReprogramado(actualizado)
    } catch (err) {
      const datos = axios.isAxiosError(err) ? (err.response?.data as { mensaje?: string; errores?: Record<string, string> } | undefined) : undefined
      setError(datos?.mensaje ?? Object.values(datos?.errores ?? {})[0] ?? 'No se pudo reprogramar el examen. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#011140] focus:border-[#0439D9] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="reprogramar-titulo">
      <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
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
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-[#627A9B] hover:bg-[#F1F6FF]">
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="rounded-lg bg-[#F1F6FF] p-3 text-xs text-[#344158]">
            La sesión anterior se guarda en el historial con el resultado de cada estudiante. Todos vuelven a
            <strong> no ingresado</strong> y se mantienen la lista y su habilitación. Quienes fueron denegados por el
            control quedan <strong>pendientes</strong> de revisión.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[#011140]">
              Nueva fecha
              <input type="date" min={hoy()} value={fecha} onChange={(e) => { setFecha(e.target.value); setError('') }} className={campo} />
            </label>
            <label className="text-xs font-semibold text-[#011140]">
              Hora de inicio
              <input type="time" value={hora} onChange={(e) => { setHora(e.target.value); setError('') }} className={campo} />
            </label>
          </div>
          <label className="text-xs font-semibold text-[#011140]">
            Duración (minutos)
            <input type="text" inputMode="numeric" maxLength={4} value={duracion}
              onChange={(e) => { setDuracion(e.target.value.replace(/\D/g, '')); setError('') }} className={campo} />
          </label>
          <label className="text-xs font-semibold text-[#011140]">
            Motivo
            <textarea rows={3} maxLength={MOTIVO_MAX} value={motivo} placeholder="Ej.: se repite por un corte de luz"
              onChange={(e) => { setMotivo(e.target.value); setError('') }} className={campo} />
            <span className="mt-0.5 block text-right text-[11px] font-normal text-[#627A9B]">{motivo.length}/{MOTIVO_MAX}</span>
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#EDF1F7] px-5 py-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-[#D8E3F5] px-4 text-sm font-semibold text-[#011140] hover:bg-[#F1F6FF]">
            Cancelar
          </button>
          <button type="button" onClick={() => void enviar()} disabled={guardando}
            className="h-11 rounded-lg bg-[#0439D9] px-5 text-sm font-bold text-white hover:bg-[#0027a2] disabled:opacity-60">
            {guardando ? 'Reprogramando...' : 'Reprogramar'}
          </button>
        </footer>
      </div>
    </div>
  )
}
