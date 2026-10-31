import { useState, useRef, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, ArrowLeft, ChevronDown } from 'lucide-react'
import type { EstudianteIdentificado } from '../../services/identificacionService'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import api from '../../services/api'
import FieldErrorModal from '../ui/FieldErrorModal'
import ResultadoModal, { type Resultado } from '../ui/ResultadoModal'

interface Props {
  isOpen: boolean
  onClose: () => void
  estudiante: EstudianteIdentificado | null
  idEstudiante: number 
  idExamen: number
  idAmbiente: number
  onGuardadoExitoso: () => void
}

const inputClass =
  'w-full rounded-md border border-[#C9D7EC] bg-white px-3 py-2.5 text-[13px] font-normal text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF] resize-none'

const FIELD_LABELS: Record<string, string> = {
  accion: 'la Acción Tomada',
  observaciones: 'las Observaciones',
}

const OPCIONES_ACCION = [
  { value: 'Se negó el ingreso y se derivó a coordinación académica.', label: 'Se negó el ingreso y se derivó a coordinación académica.' },
  { value: 'Se permitió el ingreso bajo supervisión.', label: 'Se permitió el ingreso bajo supervisión.' },
  { value: 'Se solicitó al estudiante retirarse del ambiente.', label: 'Se solicitó al estudiante retirarse del ambiente.' },
]

const toSentenceCase = (text: string) => {
  if (!text) return text
  const lower = text.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export default function RegistrarNoHabilitadoModal({
  isOpen, onClose, estudiante, idEstudiante, idExamen, idAmbiente, onGuardadoExitoso,
}: Props) {
  const [accion, setAccion] = useState('') 
  const [observaciones, setObservaciones] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorField, setErrorField] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isOpen || !estudiante) return null

  const nombre = `${estudiante.nombre || ''} ${estudiante.apellidos || ''}`.trim()
  const iniciales = `${estudiante.nombre?.[0] || ''}${estudiante.apellidos?.[0] || ''}`.toUpperCase() || 'ES'

  const showError = (field: string, message: string) => {
    setErrorField(field)
    setErrorMessage(message)
    setErrorModalOpen(true)
  }

  const handleContinue = () => {
    setErrorModalOpen(false)
    setTimeout(() => {
      const el = document.getElementById(errorField) as HTMLElement | null
      if (el) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 150)
  }

  const handleGuardar = async () => {
    const textoAccion = accion.trim();
    const textoObs = observaciones.trim();

    if (!textoAccion) {
      showError('accion', 'Debes seleccionar una acción tomada.')
      return
    }

    if (textoObs) {
      if (textoObs.length < 10) {
        showError('observaciones', 'Las observaciones deben tener al menos 10 caracteres.')
        return
      }
      if (textoObs.length > 200) {
        showError('observaciones', 'Las observaciones no pueden superar los 200 caracteres.')
        return
      }

      const regexSoloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;
      if (!regexSoloLetras.test(textoObs)) {
        showError('observaciones', 'Solo se permiten letras y espacios. No se admiten números ni símbolos.')
        return
      }

      const soloLetras = textoObs.replace(/\s/g, '')
      if (/^(.)\1+$/.test(soloLetras)) {
        showError('observaciones', 'Las observaciones no pueden ser una sola letra repetida.')
        return
      }
      // 2. Si hay una misma letra repetida más de 3 veces seguidas (ej: "holaaaa", "reeeetiró")
      if (/([a-zA-ZáéíóúÁÉÍÓÚüÜñÑ])\1{3,}/.test(textoObs)) {
        showError('observaciones', 'Las observaciones tienen letras repetidas de forma inconsistente.')
        return
      }
    }

    setIsSaving(true)
    try {
      await api.post('/control-ingresos/excepcion-no-habilitado', {
        idEstudiante: idEstudiante,
        idExamen: idExamen,
        idAmbiente: idAmbiente,
        motivoInhabilitacion: estudiante.motivoInhabilitacion || 'No especificado',
        accionTomada: textoAccion, 
        observaciones: textoObs || null,
      })
      onGuardadoExitoso()
      onClose()
    } catch (err: any) {
      console.error(err)
      if (!err.response) {
        setResultado({ tipo: 'offline', mensaje: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' })
      } else {
        setResultado({ tipo: 'error', mensaje: err.response?.data?.mensaje || 'Ocurrió un error al guardar el registro.' })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
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
                </label>
                
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="accion"
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`${inputClass} flex items-center justify-between text-left ${!accion ? 'text-[#64748B]' : 'text-[#011140]'}`}
                  >
                    <span className="truncate">{accion || 'Seleccione una acción...'}</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-[#64748B] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-10 mt-0.5 w-full rounded-lg border border-[#D8E3F5] bg-white py-1 shadow-xl">
                      {OPCIONES_ACCION.map((opcion) => (
                        <button
                          key={opcion.value}
                          type="button"
                          onClick={() => {
                            setAccion(opcion.value)
                            setDropdownOpen(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[#E9F1FF] hover:text-[#0439D9] ${
                            accion === opcion.value ? 'bg-[#F4F7FB] font-semibold text-[#0439D9]' : 'text-[#011140]'
                          }`}
                        >
                          {opcion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-[#011140]">Observaciones Adicionales</span>
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase">(Opcional)</span>
                </label>
                <textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => {
                    const valorLimpio = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '')
                    setObservaciones(toSentenceCase(valorLimpio))
                  }}
                  placeholder="El estudiante se retiró sin oponer resistencia."
                  rows={3}
                  className={inputClass}
                />
              
                <div className="mt-1 flex justify-end">
                  <span className={`text-[10px] ${observaciones.length > 200 ? 'text-red-500 font-bold' : 'text-[#94A3B8]'}`}>
                    {observaciones.length}/200 caracteres
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
              <button onClick={onClose} disabled={isSaving} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-[#C9D7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#45628D] hover:bg-[#F1F5F9] disabled:opacity-50">
                <ArrowLeft size={15} /> Cancelar
              </button>
              <button onClick={handleGuardar} disabled={isSaving || !accion} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#BA1A1A] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B91C1C] disabled:opacity-50 ml-auto">
                <CheckCircle2 size={18} />
                {isSaving ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <FieldErrorModal 
        open={errorModalOpen} 
        fieldLabel={FIELD_LABELS[errorField] ?? errorField} 
        message={errorMessage} 
        onContinue={handleContinue} 
        onClose={() => setErrorModalOpen(false)} 
      />
      <ResultadoModal 
        resultado={resultado} 
        onClose={() => setResultado(null)} 
      />
    </>
  )
}