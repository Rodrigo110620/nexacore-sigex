import axios from 'axios'
import { Check, ChevronDown, Mail, UserPlus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getCarreras, getFacultades, registrarEstudiante } from '../../services/estudianteService'
import type { CarreraOption, FacultadOption, RegistrarEstudiantePayload } from '../../types/estudiante'
import {
  FIELD_LIMITS,
  sanitizeNombreInput,
  validateApellidos,
  validateDocumento,
  validateEmail,
  validateNombre,
} from '../../utils/validators'

interface Props {
  open: boolean
  onClose: () => void
  onRegistered: (nombre: string) => void
}

type FormState = Omit<RegistrarEstudiantePayload, 'idFacultad' | 'idCarrera'> & {
  idFacultad: string
  idCarrera: string
}

const initialForm: FormState = {
  nombre: '', apellidos: '', ci: '', email: '', codigoSis: '', idFacultad: '', idCarrera: '',
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs font-medium text-red-600">{children}</p> : null
}

export default function RegistrarEstudianteModal({ open, onClose, onRegistered }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FormState>(initialForm)
  const [facultades, setFacultades] = useState<FacultadOption[]>([])
  const [carreras, setCarreras] = useState<CarreraOption[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    getFacultades().then(setFacultades).catch(() => setApiError('No se pudieron cargar las facultades.'))
  }, [open])

  useEffect(() => {
    if (!open || !form.idFacultad) return
    getCarreras(form.idFacultad).then(setCarreras).catch(() => setApiError('No se pudieron cargar las carreras.'))
  }, [form.idFacultad, open])

  const selectedCareer = useMemo(
    () => carreras.find((item) => String(item.idCarrera) === form.idCarrera),
    [carreras, form.idCarrera],
  )

  if (!open) return null

  const close = () => {
    if (saving) return
    setStep(1); setForm(initialForm); setErrors({}); setApiError(''); onClose()
  }

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setApiError('')
  }

  const validateStep1 = () => {
    const next: Record<string, string> = {}
    const nombreError = validateNombre(form.nombre)
    const apellidosError = validateApellidos(form.apellidos)
    const ciError = validateDocumento(form.ci)
    const emailError = validateEmail(form.email)
    if (nombreError) next.nombre = nombreError
    if (apellidosError) next.apellidos = apellidosError
    if (ciError) next.ci = ciError
    if (emailError) next.email = emailError
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!form.codigoSis.trim()) next.codigoSis = 'Ingresa el código SIS.'
    else if (!/^\d{9}$/.test(form.codigoSis)) next.codigoSis = 'El código SIS debe tener 9 dígitos.'
    if (!form.idFacultad) next.idFacultad = 'Selecciona una facultad.'
    if (!form.idCarrera) next.idCarrera = 'Selecciona una carrera.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true); setApiError('')
    try {
      const created = await registrarEstudiante({
        nombre: form.nombre.trim(), apellidos: form.apellidos.trim(), ci: form.ci.trim(),
        email: form.email.trim(), codigoSis: form.codigoSis.trim(),
        idFacultad: Number(form.idFacultad), idCarrera: Number(form.idCarrera),
      })
      setStep(1); setForm(initialForm); setErrors({})
      onRegistered(`${created.nombre} ${created.apellidos}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const fieldErrors = error.response?.data?.errores
        if (fieldErrors && typeof fieldErrors === 'object') setErrors(fieldErrors)
        setApiError(error.response?.data?.mensaje || 'No se pudo registrar al estudiante.')
      } else setApiError('No se pudo registrar al estudiante.')
    } finally { setSaving(false) }
  }

  const inputClass = 'mt-1 h-10 w-full rounded-md border border-[#C9D7EC] bg-white px-3 text-[13px] text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF]'

  return (
    <div className="relative z-20 mt-3 flex w-full justify-center sm:fixed sm:inset-0 sm:mt-0 sm:items-center sm:bg-[#EAF2FF]/85 sm:p-4 sm:backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="register-student-title">
      <div className="w-full overflow-hidden rounded-xl border border-[#D8E3F5] bg-white shadow-xl sm:max-h-[92vh] sm:max-w-[540px] sm:overflow-y-auto sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#D8E3F5] px-4 py-3 sm:px-5">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><UserPlus size={19} /></span>
            <div><div className="flex flex-wrap items-center gap-2"><h2 id="register-student-title" className="font-bold text-[#011140]">Registrar Nuevo Estudiante</h2><span className="rounded bg-[#E9F1FF] px-2 py-0.5 text-[10px] font-bold text-[#0439D9]">Paso {step} de 2</span></div><p className="mt-1 text-xs text-[#627A9B]">{step === 1 ? 'Complete los datos obligatorios con asterisco (*) para autorizar el acceso.' : 'Asigne el código institucional, facultad y carrera académica oficial.'}</p></div>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar" className="rounded p-1 text-[#627A9B] hover:bg-gray-100"><X size={18} /></button>
        </header>

        <div className="grid grid-cols-2 border-b border-[#D8E3F5] px-4 pt-2 text-[10px] font-semibold sm:px-5">
          <div className={`flex gap-2 border-b-2 pb-3 ${step === 1 ? 'border-[#0439D9] text-[#011140]' : 'border-emerald-400 bg-emerald-50 text-emerald-700'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0439D9] text-white">{step === 2 ? <Check size={13}/> : '1'}</span><span>Información Personal del Estudiante<br/><small>{step === 1 ? 'EN CURSO' : 'PASO 1 COMPLETADO'}</small></span></div>
          <div className={`flex gap-2 border-b-2 pb-3 pl-3 ${step === 2 ? 'border-[#0439D9] text-[#011140]' : 'border-gray-200 text-gray-400'}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full ${step === 2 ? 'bg-[#0439D9] text-white' : 'bg-gray-200'}`}>2</span><span>Información Académica<br/><small>{step === 2 ? 'EN CURSO' : 'Pendiente'}</small></span></div>
        </div>

        <div className="space-y-2.5 px-4 py-3 sm:px-5">
          {apiError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{apiError}</div>}
          {step === 1 ? <>
            <label className="block text-xs font-semibold text-[#011140]">Nombre completo <b className="text-red-500">*</b><input autoFocus value={form.nombre} maxLength={FIELD_LIMITS.nombre.max} onChange={(e) => update('nombre', sanitizeNombreInput(e.target.value))} onBlur={() => update('nombre', sanitizeNombreInput(form.nombre, { trimEnds: true }))} placeholder="Ej: María José" className={inputClass}/><FieldError>{errors.nombre}</FieldError></label>
            <label className="block text-xs font-semibold text-[#011140]">Apellidos completos <b className="text-red-500">*</b><input value={form.apellidos} maxLength={FIELD_LIMITS.apellidos.max} onChange={(e) => update('apellidos', sanitizeNombreInput(e.target.value))} onBlur={() => update('apellidos', sanitizeNombreInput(form.apellidos, { trimEnds: true }))} placeholder="Ej: González Flores" className={inputClass}/><FieldError>{errors.apellidos}</FieldError></label>
            <label className="block text-xs font-semibold text-[#011140]">CI <b className="text-red-500">*</b><input inputMode="numeric" value={form.ci} maxLength={FIELD_LIMITS.documento.max} onChange={(e) => update('ci', e.target.value.replace(/\D/g, ''))} placeholder="Ej: 74892104" className={inputClass}/><FieldError>{errors.ci}</FieldError></label>
            <label className="block text-xs font-semibold text-[#011140]">Correo electrónico <b className="text-red-500">*</b><div className="relative"><input type="email" value={form.email} maxLength={FIELD_LIMITS.email.max} onChange={(e) => update('email', e.target.value)} placeholder="Ej: maria.gonzalez@umss.edu" className={`${inputClass} pr-10`}/><Mail className="absolute right-3 top-4 text-[#627A9B]" size={16}/></div><FieldError>{errors.email}</FieldError></label>
          </> : <>
            <label className="block text-xs font-semibold text-[#011140]">Código SIS <b className="text-red-500">*</b><div className="relative"><input autoFocus inputMode="numeric" maxLength={9} value={form.codigoSis} onChange={(e) => update('codigoSis', e.target.value.replace(/\D/g, ''))} placeholder="Ej: 202404012" className={`${inputClass} bg-[#F8FAFC] pr-16 font-mono`}/><span className="pointer-events-none absolute right-2 top-3 rounded bg-[#E1ECFF] px-1.5 py-0.5 text-[9px] font-bold text-[#0439D9]">ÚNICO</span></div><FieldError>{errors.codigoSis}</FieldError></label>
            <label className="block text-xs font-semibold text-[#011140]">Facultad académica <b className="text-red-500">*</b><div className="relative"><select value={form.idFacultad} onChange={(e) => { setCarreras([]); update('idFacultad', e.target.value); update('idCarrera', '') }} className={`${inputClass} appearance-none pr-10`}><option value="">Seleccione facultad...</option>{facultades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-4" size={16}/></div><FieldError>{errors.idFacultad}</FieldError></label>
            <label className="block text-xs font-semibold text-[#011140]">Carrera profesional <b className="text-red-500">*</b><div className="relative"><select value={form.idCarrera} disabled={!form.idFacultad} onChange={(e) => update('idCarrera', e.target.value)} className={`${inputClass} appearance-none pr-10 disabled:bg-gray-100`}><option value="">Seleccione carrera...</option>{carreras.map((c) => <option key={`${c.idFacultad}-${c.idCarrera}`} value={c.idCarrera}>{c.nombre}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-4" size={16}/></div><FieldError>{errors.idCarrera}</FieldError>{selectedCareer && <p className="mt-1 text-xs text-[#627A9B]">{selectedCareer.nombreFacultad}</p>}</label>
          </>}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#D8E3F5] px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
          <button type="button" onClick={step === 1 ? close : () => setStep(1)} className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D]">{step === 1 ? 'Cancelar' : '← Atrás'}</button>
          {step === 1 ? <button type="button" onClick={() => validateStep1() && setStep(2)} className="h-10 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md">Siguiente paso →</button> : <button type="button" disabled={saving} onClick={submit} className="h-10 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md disabled:opacity-60">{saving ? 'Registrando...' : 'Guardar y Registrar Estudiante'}</button>}
        </footer>
      </div>
    </div>
  )
}
