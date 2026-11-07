import { useState } from 'react'
import { MOTIVO_RECHAZO_MAX as MOTIVO_MAX, MOTIVO_RECHAZO_MIN as MOTIVO_MIN, aOracion, validarMotivoRechazo } from '../../utils/textoFotoValidators'
import { Check, Flag, ImageOff, Info, RefreshCw, TriangleAlert, X } from 'lucide-react'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import { textoMotivoReporte, type SolicitudRevisionFoto } from '../../services/fotoRevisionService'
import { fechaCorta } from '../../utils/fechaCorta'
import { fechaSolicitud, inicialesDe, nombreDe } from '../../utils/revisionFoto'

const MOTIVOS_FRECUENTES = ['Foto borrosa', 'Rostro no visible', 'No es la misma persona', 'No es una foto de frente']

export function OrigenBadge({ solicitud }: { solicitud: SolicitudRevisionFoto }) {
  if (solicitud.origen === 'REPORTE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEECEC] px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C]">
        <Flag size={11} aria-hidden="true" /> Reportada por control
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F1FF] px-2 py-0.5 text-[10px] font-semibold text-[#0439D9]">
      <RefreshCw size={11} aria-hidden="true" /> Cambio de foto
    </span>
  )
}

export function RechazarFotoModal({ solicitud, saving, onCancel, onConfirm }: {
  solicitud: SolicitudRevisionFoto
  saving: boolean
  onCancel: () => void
  onConfirm: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const enviar = () => {
    const invalido = validarMotivoRechazo(motivo)
    if (invalido) {
      setError(invalido)
      return
    }
    onConfirm(aOracion(motivo))
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rechazar-foto-titulo"
        onSubmit={(e) => { e.preventDefault(); enviar() }}
        className="w-full max-w-md rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEECEC] text-[#B91C1C]">
            <TriangleAlert size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="rechazar-foto-titulo" className="text-base font-bold text-[#011140]">Rechazar foto</h3>
            <p className="text-xs text-[#627A9B]">
              La foto actual de {nombreDe(solicitud)} no cambia. El estudiante verá este motivo en su perfil y podrá
              enviar otra foto.
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Cerrar" className="shrink-0 rounded-full bg-[#F1F5F9] p-1.5 text-gray-500 hover:bg-gray-200">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="rechazar-foto-motivo" className="mt-4 block text-xs font-semibold text-[#011140]">Motivo del rechazo</label>
        <textarea
          id="rechazar-foto-motivo"
          value={motivo}
          maxLength={MOTIVO_MAX}
          rows={3}
          aria-invalid={Boolean(error)}
          onChange={(e) => { setMotivo(e.target.value); setError('') }}
          placeholder="Ej. La foto está borrosa y no se distingue bien el rostro."
          className={`mt-1 w-full resize-none rounded-lg border px-3 py-2 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${error ? 'border-red-400' : 'border-[#B8CBEF]'}`}
        />
        <div className="mt-0.5 flex justify-between gap-2 text-[10px]">
          <span className={error ? 'text-red-600' : 'text-gray-400'}>{error || `Letras, coma y punto; entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.`}</span>
          <span className="shrink-0 text-gray-400">{motivo.length} / {MOTIVO_MAX}</span>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-[#627A9B]">Motivos frecuentes</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {MOTIVOS_FRECUENTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMotivo(m); setError('') }}
              className="rounded-full border border-[#D8E3F5] bg-[#F8FAFC] px-2.5 py-1 text-[11px] text-[#334155] hover:border-[#0439D9] hover:text-[#0439D9]"
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#D8E3F5] px-4 py-2.5 text-sm font-semibold text-[#011140]">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#B91C1C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#991B1B] disabled:opacity-60">
            <X size={15} aria-hidden="true" />
            {saving ? 'Rechazando…' : 'Rechazar foto'}
          </button>
        </div>
      </form>
    </div>
  )
}

/** La solicitud con la foto actual y la nueva, y las acciones (sin ellas en solo lectura). */
export function DetalleRevisionFoto({ solicitud, saving, onAprobar, onRechazar, onDescartar, soloLectura = false }: {
  solicitud: SolicitudRevisionFoto
  saving: boolean
  onAprobar: () => void
  onRechazar: () => void
  onDescartar: () => void
  /** Quien no es del examen ve la solicitud sin poder resolverla. */
  soloLectura?: boolean
}) {
  const esperando = solicitud.estado === 'ESPERANDO_FOTO'
  const recuadro = 'flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-[#E9F1FF] text-2xl font-bold text-[#7C93B8]'
  return (
    <article className="flex min-h-full flex-col rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#011140]">{nombreDe(solicitud)}</h2>
          <p className="text-xs text-[#627A9B]">
            SIS {solicitud.codigoSis}
            {solicitud.carrera ? ` · ${solicitud.carrera}` : ''} · {fechaSolicitud(solicitud)}
          </p>
        </div>
        <OrigenBadge solicitud={solicitud} />
      </div>

      {solicitud.reporte && (
        <div className="mt-3 rounded-lg border border-[#FBCFD4] bg-[#FFF5F5] px-3 py-2 text-xs text-[#B91C1C]">
          <p className="font-semibold">
            Reporte de control
            {solicitud.reporte.reportadoPor ? ` · ${solicitud.reporte.reportadoPor}` : ''} · {fechaCorta(solicitud.reporte.reportadoEn)}
          </p>
          <p className="mt-0.5 break-words [overflow-wrap:anywhere]">
            {textoMotivoReporte(solicitud.reporte.motivo)}
            {solicitud.reporte.detalle ? `: “${solicitud.reporte.detalle}”` : '.'}
            {' '}Se le pidió al estudiante volver a escanear su rostro.
          </p>
        </div>
      )}

      <div className="mx-auto mt-5 grid w-full max-w-md grid-cols-2 gap-4">
        <figure className="min-w-0">
          <figcaption className="mb-2 text-xs font-semibold text-[#011140]">Foto actual</figcaption>
          <FotoEstudiante fotoUrl={solicitud.fotoActualUrl} nombre={`${nombreDe(solicitud)} (actual)`} iniciales={inicialesDe(solicitud)} className={recuadro} />
          <p className="mt-1.5 text-[10px] text-[#627A9B]">La que ve hoy el personal de control</p>
        </figure>
        <figure className="min-w-0">
          <figcaption className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#011140]">
            Foto enviada
            {!esperando && <span className="rounded-full bg-[#E9F1FF] px-2 py-0.5 text-[10px] text-[#0439D9]">Nueva</span>}
          </figcaption>
          {esperando ? (
            <div className={`${recuadro} flex-col gap-2 border-2 border-dashed border-[#B8CBEF] bg-[#F8FAFC] px-3 text-center`}>
              <ImageOff size={28} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-snug">El estudiante aún no envía su nueva foto</span>
            </div>
          ) : (
            <FotoEstudiante fotoUrl={solicitud.fotoUrl} nombre={`${nombreDe(solicitud)} (enviada)`} iniciales={inicialesDe(solicitud)} className={`${recuadro} ring-2 ring-[#0439D9]`} />
          )}
          <p className="mt-1.5 text-[10px] text-[#627A9B]">Escaneada por el estudiante</p>
        </figure>
      </div>

      <p className="mt-5 flex gap-2 rounded-lg bg-[#EFF6FF] p-3 text-[11px] leading-relaxed text-[#334E7A]">
        <Info size={14} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
        {esperando
          ? 'Si compruebas que la foto actual sí corresponde al estudiante, descarta el reporte: ya no tendrá que reemplazarla.'
          : 'Comprueba que sea la misma persona, con el rostro visible y de frente. Esta foto se usará para identificarla al ingresar a sus exámenes.'}
      </p>

      {!soloLectura && (
      <div className="[&>*]:min-w-0 [&>*]:flex-1 sm:[&>*]:flex-none mt-auto flex flex-row gap-2 border-t border-[#EDF1F7] pt-4 sm:flex-row sm:justify-end">
        {solicitud.reporte && (
          <button type="button" onClick={onDescartar} disabled={saving} className="rounded-lg border border-[#D8E3F5] px-4 py-2.5 text-sm font-semibold text-[#011140] hover:bg-[#F8FAFC] disabled:opacity-60 sm:mr-auto">
            Descartar reporte
          </button>
        )}
        {!esperando && (
          <>
            <button type="button" onClick={onRechazar} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#FBCFD4] bg-white px-4 py-2.5 text-sm font-semibold text-[#B91C1C] hover:bg-[#FFF5F5] disabled:opacity-60">
              <X size={15} aria-hidden="true" /> Rechazar
            </button>
            <button type="button" onClick={onAprobar} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:opacity-60">
              <Check size={15} aria-hidden="true" /> {saving ? 'Guardando…' : 'Aprobar foto'}
            </button>
          </>
        )}
      </div>
      )}
    </article>
  )
}

