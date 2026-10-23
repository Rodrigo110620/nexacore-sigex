import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'
import type { EstudianteIdentificado } from '../../services/identificacionService'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import api from '../../services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  estudiante: EstudianteIdentificado | null
  idEstudiante: number // 🆕 Recibimos esto
  idExamen: number
  idAmbiente: number
  onGuardadoExitoso: () => void
}

const inputClass =
  'w-full rounded-md border border-[#C9D7EC] bg-white px-3 py-2.5 text-[13px] font-normal text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF] resize-none'

export default function RegistrarNoHabilitadoModal({
  isOpen, onClose, estudiante, idEstudiante, idExamen, idAmbiente, onGuardadoExitoso,
}: Props) {
  const [accion, setAccion] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !estudiante) return null

  const nombre = `${estudiante.nombre || ''} ${estudiante.apellidos || ''}`.trim()
  const iniciales = `${estudiante.nombre?.[0] || ''}${estudiante.apellidos?.[0] || ''}`.toUpperCase() || 'ES'

  const handleGuardar = async () => {
    if (!accion.trim()) {
      setError('La acción tomada es obligatoria.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      await api.post('/control-ingresos/excepcion-no-habilitado', {
        idEstudiante: idEstudiante, // 🆕 Usamos el prop directo
        idExamen: idExamen,
        idAmbiente: idAmbiente,
        motivoInhabilitacion: estudiante.motivoInhabilitacion || 'No especificado',
        accionTomada: accion.trim(),
        observaciones: observaciones.trim() || null,
      })
      onGuardadoExitoso()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.mensaje || 'Ocurrió un error al guardar el registro.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/25 p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#D8E3F5] bg-white p-5 sm:p-7 shadow-[0_20px_50px_-15px_rgba(1,17,64,.25)] transition-all">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#DC2626]">
              <AlertTriangle size={20} />
            </span>
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#011140]">
              Registrar Excepción
            </h2>
          </div>
        </div>

        <div>
          <div className="mb-3.5 flex items-center gap-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 sm:p-4">
            <FotoEstudiante fotoUrl={estudiante.fotoUrl} nombre={nombre} iniciales={iniciales} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0439D9] text-sm font-bold text-white" />
            <div className="min-w-0">
              <p className="truncate text-sm sm:text-base font-bold text-[#0F172A]">{nombre}</p>
              <p className="truncate text-xs font-medium text-[#64748B]">{estudiante.carrera || 'Carrera no registrada'}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 sm:p-3">
              <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">Código Universitario</span>
              <span className="mt-0.5 block truncate text-xs font-bold text-[#0F172A]">{estudiante.codigoSis || '—'}</span>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 sm:p-3">
              <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">Documento CI</span>
              <span className="mt-0.5 block truncate text-xs font-bold text-[#0439D9]">{estudiante.ci || '—'}</span>
            </div>
          </div>

          <div className="space-y-4 mb-5">
            <div>
              <label className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-[#011140]">Acción Tomada <span className="text-red-500">*</span></span>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase">Texto libre</span>
              </label>
              <textarea
                value={accion}
                onChange={(e) => { setAccion(e.target.value); if (error) setError(''); }}
                placeholder="Ej: Se negó el ingreso y se derivó a coordinación académica."
                rows={2}
                maxLength={100} // Límite de la BD
                className={inputClass}
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-[#94A3B8]">{accion.length}/100</span>
                {error && <span className="text-[10px] font-semibold text-red-600">{error}</span>}
              </div>
            </div>

            <div>
              <label className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-[#011140]">Observaciones Adicionales</span>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase">(Opcional)</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="El estudiante se retiró sin oponer resistencia."
                rows={3}
                maxLength={500} // Límite de la BD
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
            <button onClick={onClose} disabled={isSaving} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-[#C9D7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#45628D] hover:bg-[#F1F5F9] disabled:opacity-50">
              <ArrowLeft size={15} /> Cancelar
            </button>
            <button onClick={handleGuardar} disabled={isSaving || !accion.trim()} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#BA1A1A] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B91C1C] disabled:opacity-50 ml-auto">
              <CheckCircle2 size={18} />
              {isSaving ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}