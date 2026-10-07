import axios from 'axios'
import { Check, ChevronDown, Mail, UserPlus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getCarreras, getFacultades, registrarEstudiante } from '../../services/estudianteService'
import type { CarreraOption, FacultadOption, RegistrarEstudiantePayload } from '../../types/estudiante'
import { FIELD_LIMITS, sanitizeNombreInput, validateApellidos, validateCodigoSis, validateDocumento, validateEmail, validateNombre } from '../../utils/validators'
import FieldErrorModal from '../ui/FieldErrorModal'
import ResultadoModal, { type Resultado } from '../ui/ResultadoModal'

interface Props { open: boolean; onClose: () => void; onRegistered: (nombre: string) => void }

type FormState = Omit<RegistrarEstudiantePayload, 'idFacultad' | 'idCarrera'> & { idFacultad: string; idCarrera: string }

const initialForm: FormState = { nombre: '', apellidos: '', ci: '', email: '', codigoSis: '', idFacultad: '', idCarrera: '' }

const FIELD_LABELS: Record<string, string> = {
  nombre: 'el Nombre', apellidos: 'los Apellidos', ci: 'el CI', email: 'el Correo',
  codigoSis: 'el Código SIS', idFacultad: 'la Facultad', idCarrera: 'la Carrera',
}

export default function RegistrarEstudianteModal({ open, onClose, onRegistered }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FormState>(initialForm)
  const [facultades, setFacultades] = useState<FacultadOption[]>([])
  const [carreras, setCarreras] = useState<CarreraOption[]>([])
  const [saving, setSaving] = useState(false)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorField, setErrorField] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    if (!open) return
    getFacultades().then(setFacultades).catch(() => setResultado({ tipo: 'error', mensaje: 'No se pudieron cargar las facultades.' }))
  }, [open])

  useEffect(() => {
    if (!open || !form.idFacultad) return
    // Cancela la petición anterior para que una respuesta vieja no pise la de la facultad actual.
    const controller = new AbortController()
    getCarreras(form.idFacultad, controller.signal)
      .then(setCarreras)
      .catch((error) => {
        if (axios.isCancel(error)) return
        setResultado({ tipo: 'error', mensaje: 'No se pudieron cargar las carreras.' })
      })
    return () => controller.abort()
  }, [form.idFacultad, open])

  const selectedCareer = useMemo(() => carreras.find((item) => String(item.idCarrera) === form.idCarrera), [carreras, form.idCarrera])

  if (!open) return null

  const close = () => {
    if (saving) return
    setStep(1); setForm(initialForm); setResultado(null); setErrorModalOpen(false); onClose()
  }

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (resultado) setResultado(null)
  }

  const showFirstError = (errs: Record<string, string>) => {
    const firstField = Object.keys(errs).find((key) => errs[key])
    if (!firstField) return
    setErrorField(firstField); setErrorMessage(errs[firstField]); setErrorModalOpen(true)
  }

  const handleContinue = () => {
    setErrorModalOpen(false)
    setTimeout(() => {
      const el = document.querySelector(`[name="${errorField}"]`) as HTMLInputElement | HTMLSelectElement | null
      if (el) { el.focus(); if (el instanceof HTMLInputElement) el.select(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
    }, 150)
  }

  const validateField = (field: keyof FormState): string => {
    const value = form[field]
    if (typeof value !== 'string' || !value.trim()) return ''
    if (field === 'nombre') return validateNombre(value)
    if (field === 'apellidos') return validateApellidos(value)
    if (field === 'ci') return validateDocumento(value)
    if (field === 'email') return validateEmail(value)
    if (field === 'codigoSis') return validateCodigoSis(value)
    return ''
  }

  const handleBlur = (field: keyof FormState) => {
    const err = validateField(field)
    if (err) { setErrorField(field); setErrorMessage(err); setErrorModalOpen(true) }
  }

  const validateStep1 = () => {
    const next: Record<string, string> = {}
    const n = validateNombre(form.nombre); const a = validateApellidos(form.apellidos)
    const c = validateDocumento(form.ci); const e = validateEmail(form.email)
    if (n) next.nombre = n; if (a) next.apellidos = a; if (c) next.ci = c; if (e) next.email = e
    if (Object.keys(next).length > 0) { showFirstError(next); return false }
    return true
  }

  const submit = async () => {
    const next: Record<string, string> = {}
    const sisErr = validateCodigoSis(form.codigoSis)
    if (sisErr) next.codigoSis = sisErr
    if (!form.idFacultad) next.idFacultad = 'Selecciona una facultad.'
    if (!form.idCarrera) next.idCarrera = 'Selecciona una carrera.'
    if (Object.keys(next).length) { showFirstError(next); return }

    setSaving(true); setResultado(null)
    try {
      const created = await registrarEstudiante({
        nombre: form.nombre.trim(), apellidos: form.apellidos.trim(), ci: form.ci.trim(),
        email: form.email.trim(), codigoSis: form.codigoSis.trim(),
        idFacultad: Number(form.idFacultad), idCarrera: Number(form.idCarrera),
      })
      setStep(1); setForm(initialForm)
      onRegistered(`${created.nombre} ${created.apellidos}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const fieldErrors = error.response?.data?.errores
        const mensaje = error.response?.data?.mensaje
        if (fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) {
          showFirstError(fieldErrors as Record<string, string>)
        } else {
          setResultado({ tipo: !error.response ? 'offline' : 'error', mensaje: mensaje || 'No se pudo registrar al estudiante.' })
        }
      } else setResultado({ tipo: 'error', mensaje: 'No se pudo registrar al estudiante.' })
    } finally { setSaving(false) }
  }

  const inputClass = 'mt-1 h-10 w-full rounded-md border border-[#C9D7EC] bg-white px-3 text-[13px] text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF]'

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="register-student-title">
      <div className="w-full overflow-hidden rounded-xl border border-[#D8E3F5] bg-white shadow-xl sm:max-h-[92vh] sm:max-w-2xl sm:overflow-y-auto sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#D8E3F5] px-4 py-3 sm:px-5">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><UserPlus size={19} /></span>
            <div><div className="flex flex-wrap items-center gap-2"><h2 id="register-student-title" className="font-bold text-[#011140]">Registrar Estudiante</h2><span className="rounded bg-[#E9F1FF] px-2 py-0.5 text-[10px] font-bold text-[#0439D9]">Paso {step} de 2</span></div><p className="mt-1 text-xs text-[#627A9B]">{step === 1 ? 'Complete los datos obligatorios con asterisco (*) para autorizar el acceso.' : 'Asigne el código institucional, facultad y carrera académica oficial.'}</p></div>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar" className="rounded p-1 text-[#627A9B] hover:bg-gray-100"><X size={18} /></button>
        </header>

        <div className="grid grid-cols-2 border-b border-[#D8E3F5] px-4 pt-2 text-[12px] font-semibold sm:px-5">
          <div className={`flex gap-2 border-b-2 pb-3 ${step === 1 ? 'border-[#0439D9] text-[#011140]' : 'border-emerald-400 bg-emerald-50 text-emerald-700'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0439D9] text-white">{step === 2 ? <Check size={13}/> : '1'}</span><span>Información Personal del Estudiante<br/><small>{step === 1 ? 'EN CURSO' : 'PASO 1 COMPLETADO'}</small></span></div>
          <div className={`flex gap-2 border-b-2 pb-3 pl-3 ${step === 2 ? 'border-[#0439D9] text-[#011140]' : 'border-gray-200 text-gray-400'}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full ${step === 2 ? 'bg-[#0439D9] text-white' : 'bg-gray-200'}`}>2</span><span>Información Académica<br/><small>{step === 2 ? 'EN CURSO' : 'Pendiente'}</small></span></div>
        </div>

        <div className="space-y-4 px-4 py-3 sm:px-5">
          {step === 1 ? <>
            <label className="block text-xs font-semibold text-[#011140]">Nombre completo <b className="text-red-500">*</b><input name="nombre" autoFocus value={form.nombre} maxLength={FIELD_LIMITS.nombre.max} onChange={(e) => update('nombre', sanitizeNombreInput(e.target.value))} onBlur={() => { update('nombre', sanitizeNombreInput(form.nombre, { trimEnds: true })); handleBlur('nombre') }} placeholder="Ej: María José" className={inputClass}/></label>
            <label className="block text-xs font-semibold text-[#011140]">Apellidos completos <b className="text-red-500">*</b><input name="apellidos" value={form.apellidos} maxLength={FIELD_LIMITS.apellidos.max} onChange={(e) => update('apellidos', sanitizeNombreInput(e.target.value))} onBlur={() => { update('apellidos', sanitizeNombreInput(form.apellidos, { trimEnds: true })); handleBlur('apellidos') }} placeholder="Ej: González Flores" className={inputClass}/></label>
            <label className="block text-xs font-semibold text-[#011140]">CI <b className="text-red-500">*</b><input name="ci" inputMode="numeric" value={form.ci} maxLength={FIELD_LIMITS.documento.max} onChange={(e) => update('ci', e.target.value.replace(/\D/g, ''))} onBlur={() => handleBlur('ci')} placeholder="Ej: 74892104" className={inputClass}/></label>
            <label className="block text-xs font-semibold text-[#011140]">Correo electrónico <b className="text-red-500">*</b><div className="relative"><input name="email" type="email" value={form.email} maxLength={FIELD_LIMITS.email.max} onChange={(e) => update('email', e.target.value)} onBlur={() => handleBlur('email')} placeholder="Ej: maria.gonzalez@umss.edu" className={`${inputClass} pr-10`}/><Mail className="absolute right-3 top-4 text-[#627A9B]" size={16}/></div></label>
          </> : <>
            <label className="block text-xs font-semibold text-[#011140]">Código SIS <b className="text-red-500">*</b><div className="relative"><input name="codigoSis" autoFocus inputMode="numeric" maxLength={9} value={form.codigoSis} onChange={(e) => update('codigoSis', e.target.value.replace(/\D/g, ''))} onBlur={() => handleBlur('codigoSis')} placeholder="Ej: 202404012" className={`${inputClass} bg-[#F8FAFC] pr-16 font-mono`}/><span className="pointer-events-none absolute right-2 top-3 rounded bg-[#E1ECFF] px-1.5 py-0.5 text-[9px] font-bold text-[#0439D9]">ÚNICO</span></div></label>
            <label className="block text-xs font-semibold text-[#011140]">Facultad académica <b className="text-red-500">*</b><div className="relative"><select name="idFacultad" value={form.idFacultad} onChange={(e) => { setCarreras([]); update('idFacultad', e.target.value); update('idCarrera', '') }} className={`${inputClass} appearance-none pr-10`}><option value="">Seleccione facultad...</option>{facultades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-4" size={16}/></div></label>
            <label className="block text-xs font-semibold text-[#011140]">Carrera profesional <b className="text-red-500">*</b><div className="relative"><select name="idCarrera" value={form.idCarrera} disabled={!form.idFacultad} onChange={(e) => update('idCarrera', e.target.value)} className={`${inputClass} appearance-none pr-10 disabled:bg-gray-100`}><option value="">Seleccione carrera...</option>{carreras.map((c) => <option key={`${c.idFacultad}-${c.idCarrera}`} value={c.idCarrera}>{c.nombre}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-4" size={16}/></div>{selectedCareer && <p className="mt-1 text-xs text-[#627A9B]">{selectedCareer.nombreFacultad}</p>}</label>
          </>}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#D8E3F5] px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
          <button type="button" onClick={step === 1 ? close : () => setStep(1)} className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D]">{step === 1 ? 'Cancelar' : '← Atrás'}</button>
          {step === 1 ? <button type="button" onClick={() => validateStep1() && setStep(2)} className="h-10 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md">Siguiente paso →</button> : <button type="button" disabled={saving} onClick={submit} className="h-10 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md disabled:opacity-60">{saving ? 'Registrando...' : 'Registrar Estudiante'}</button>}
        </footer>
      </div>

      <FieldErrorModal open={errorModalOpen} fieldLabel={FIELD_LABELS[errorField] ?? errorField} message={errorMessage} onContinue={handleContinue} onClose={() => setErrorModalOpen(false)} />
      <ResultadoModal resultado={resultado} onClose={() => setResultado(null)} />
    </div>
  )
}