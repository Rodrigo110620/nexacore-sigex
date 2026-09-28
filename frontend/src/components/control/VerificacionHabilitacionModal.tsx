import { useEffect } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  XCircle,
  X,
} from 'lucide-react'
import type { EstudianteIdentificado } from '../../services/identificacionService'
import { formatFechaDisplay } from '../../utils/examFormUtils'

interface Props {
  estudiante: EstudianteIdentificado
  materia?: string
  aula?: string
  fecha?: string
  hora?: string
  onVolver: () => void
  onContinuar: () => void
}

export default function VerificacionHabilitacionModal(p: Props) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') p.onVolver()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [p])

  const hab = p.estudiante.estado === 'HABILITADO'
  const nombre = `${p.estudiante.nombre || ''} ${p.estudiante.apellidos || ''}`.trim()
  const iniciales = `${p.estudiante.nombre?.[0] || ''}${p.estudiante.apellidos?.[0] || ''}`.toUpperCase() || 'ES'

  const f = p.fecha ? formatFechaDisplay(p.fecha) : ''
  const h = p.hora ? p.hora.slice(0, 5) : ''
  const fTxt = [f, h].filter(Boolean).join(' - ')
  const mTxt = [p.materia, p.aula ? `Aula ${p.aula}` : ''].filter(Boolean).join(' - ')

  const rawMotivo = p.estudiante.motivoInhabilitacion?.trim()
  const motivos: string[] = rawMotivo
    ? rawMotivo
        .split(/(?:,|\n|\r|\s+o\s+)/i)
        .map((m) => m.trim())
        .filter(Boolean)
    : [
        'Error de habilitación académica',
        'Bloqueo de registro en sistema',
      ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verif-title"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#D8E3F5] bg-white p-5 sm:p-7 shadow-2xl transition-all">
        {/* Barra tirador para móvil */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        {/* Encabezado */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                hab ? 'bg-[#EBF3FF] text-[#0439D9]' : 'bg-[#FEE2E2] text-[#DC2626]'
              }`}
            >
              {hab ? <BadgeCheck size={20} /> : <ShieldAlert size={20} />}
            </span>
            <h2 id="verif-title" className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#011140]">
              Verificación de Habilitación
            </h2>
          </div>
          <button
            type="button"
            onClick={p.onVolver}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:hidden"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tarjeta del estudiante */}
        <div className="mb-3.5 flex items-center gap-3.5 rounded-2xl bg-[#F8FAFC] p-3.5 sm:p-4 border border-[#E2E8F0]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0439D9] text-sm font-bold text-white shadow-sm">
            {iniciales}
          </span>
          <div className="min-w-0">
            <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">
              Estudiante Regular
            </span>
            <p className="truncate text-sm sm:text-base font-bold text-[#0F172A]">{nombre || 'Estudiante'}</p>
            <p className="truncate text-xs font-medium text-[#64748B]">
              {p.estudiante.carrera || 'Carrera no registrada'}
            </p>
          </div>
        </div>

        {/* Códigos y materia */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 sm:p-3">
            <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">
              Código Universitario
            </span>
            <span className="mt-0.5 block truncate text-xs font-bold text-[#0F172A]">
              {p.estudiante.codigoSis || '—'}
            </span>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 sm:p-3">
            <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">
              Documento CI
            </span>
            <span className="mt-0.5 block truncate text-xs font-bold text-[#0439D9]">
              {p.estudiante.ci || '—'}
            </span>
          </div>
          {(mTxt || fTxt) && (
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[10.5px] font-medium text-[#475569]">
              {mTxt && <span>📖 {mTxt}</span>}
              {fTxt && <span>📅 {fTxt}</span>}
            </div>
          )}
        </div>

        {/* Estado Habilitado / No Habilitado */}
        {hab ? (
          <div className="mb-5 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 sm:p-5 text-center shadow-sm">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
              <CheckCircle2 size={26} />
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#166534]">
              Estudiante Habilitado
            </h3>
            <p className="mt-1 text-[11.5px] sm:text-xs text-[#15803D]">
              Matrícula activa y sin sanciones reglamentarias. Puede continuar con el proceso de ingreso.
            </p>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-[#FECDD3] bg-gradient-to-b from-[#FFF1F2] to-[#FFE4E6]/50 p-4 sm:p-5 text-center shadow-sm">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE4E6] text-[#E11D48]">
              <XCircle size={26} />
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#9F1239]">
              Estudiante No Habilitado
            </h3>

            <div className="mt-3 flex flex-col items-center gap-2">
              {motivos.map((item, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#FECDD3] shadow-sm max-w-full"
                >
                  <AlertTriangle size={13} className="shrink-0 text-[#E11D48]" />
                  <span className="text-[11px] sm:text-[11.5px] font-semibold text-[#9F1239] truncate">
                    Motivo: {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción adaptables a móvil */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
          {hab ? (
            <>
              <button
                type="button"
                onClick={p.onVolver}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-[#F1F5F9]/70 sm:bg-white px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-[#F1F5F9]"
              >
                <ArrowLeft size={15} /> Volver
              </button>
              <button
                type="button"
                autoFocus
                onClick={p.onContinuar}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0439D9] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#032db0]"
              >
                Continuar <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <div className="flex w-full">
              <button
                type="button"
                autoFocus
                onClick={p.onVolver}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#081225] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1E293B]"
              >
                CERRAR <ArrowLeft size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}