import { useState } from 'react'
import { Flag, Info, X } from 'lucide-react'
import { MOTIVOS_REPORTE, mensajeDeError, reportarFoto, type MotivoReporteFoto } from '../../services/fotoRevisionService'
import { isOffline } from '../../utils/examFormUtils'
import { DETALLE_REPORTE_MAX, aOracion, validarDetalleReporte } from '../../utils/textoFotoValidators'

const DETALLE_MAX = DETALLE_REPORTE_MAX

interface ReportarFotoModalProps {
  idEstudiante: number
  idExamen?: number
  estudiante: string
  codigoSis: string
  onClose: () => void
  /** Se llama tras reportar, con el mensaje para el modal de éxito. */
  onReportada: (mensaje: string) => void
}

/** CTA-02: el personal de control reporta que la foto no coincide con la persona que se presentó. */
export default function ReportarFotoModal({
  idEstudiante, idExamen, estudiante, codigoSis, onClose, onReportada,
}: ReportarFotoModalProps) {
  const [motivo, setMotivo] = useState<MotivoReporteFoto>('NO_SE_PARECE')
  const [detalle, setDetalle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const enviar = async () => {
    const invalido = validarDetalleReporte(detalle)
    if (invalido) {
      setError(invalido)
      return
    }
    if (isOffline()) {
      setError('No hay conexión a Internet. No se reportó la foto; inténtalo de nuevo.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await reportarFoto(idEstudiante, { motivo, detalle: detalle.trim() ? aOracion(detalle) : undefined, idExamen })
      onReportada(`Se reportó la foto de ${estudiante}. Deberá volver a escanear su rostro y la administración revisará la nueva foto.`)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo reportar la foto. Intenta más tarde.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reportar-foto-titulo"
        onSubmit={(e) => { e.preventDefault(); void enviar() }}
        className="w-full max-w-md rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4E5] text-[#B45309]">
            <Flag size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="reportar-foto-titulo" className="text-base font-bold text-[#011140]">Reportar foto</h3>
            <p className="truncate text-xs text-[#627A9B]">{estudiante} · {codigoSis}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="shrink-0 rounded-full bg-[#F1F5F9] p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-[#011140]">¿Qué pasa con la foto?</legend>
          <div className="mt-2 space-y-2">
            {MOTIVOS_REPORTE.map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                  motivo === m.id ? 'border-[#0439D9] bg-[#F4F8FF] font-medium text-[#011140]' : 'border-[#E2E8F0] text-[#334155]'
                }`}
              >
                <input
                  type="radio"
                  name="motivo-reporte"
                  value={m.id}
                  checked={motivo === m.id}
                  onChange={() => setMotivo(m.id)}
                  className="h-4 w-4 accent-[#0439D9]"
                />
                {m.texto}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="reportar-foto-detalle" className="mt-4 block text-xs font-semibold text-[#011140]">
          Detalle (opcional)
        </label>
        <textarea
          id="reportar-foto-detalle"
          value={detalle}
          maxLength={DETALLE_MAX}
          rows={2}
          onChange={(e) => { setDetalle(e.target.value); setError('') }}
          placeholder="Ej. No se parece a la foto registrada"
          className="mt-1 w-full resize-none rounded-lg border border-[#B8CBEF] px-3 py-2 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25"
        />
        <p className="mt-0.5 flex justify-between gap-2 text-[10px] text-gray-400">
          <span>Solo letras y espacios, de 10 a {DETALLE_MAX} caracteres.</span>
          <span className="shrink-0">{detalle.length}/{DETALLE_MAX}</span>
        </p>

        <p className="mt-2 flex gap-2 rounded-lg bg-[#EFF6FF] p-3 text-[11px] leading-relaxed text-[#334E7A]">
          <Info size={14} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
          Se le pedirá al estudiante volver a escanear su rostro y la administración revisará la nueva foto.
          Reportar no autoriza ni deniega este ingreso: si crees que es otra persona, deniégalo con la razón “Suplantación”.
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-[#D8E3F5] py-2.5 text-sm font-semibold text-[#011140]">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#B45309] py-2.5 text-sm font-semibold text-white hover:bg-[#92400E] disabled:opacity-60"
          >
            <Flag size={15} aria-hidden="true" />
            {saving ? 'Reportando…' : 'Reportar foto'}
          </button>
        </div>
      </form>
    </div>
  )
}
