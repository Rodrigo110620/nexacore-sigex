import { Check, CircleAlert, LoaderCircle, UserRoundPen, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    actualizarEstudiante,
    getCarreras,
    getEstudianteById,
    getFacultades,
} from '../../services/estudianteService'
import type {
    CarreraOption,
    EstudianteListItem,
    FacultadOption,
} from '../../types/estudiante'
import {
    FIELD_LIMITS,
    sanitizeNombreInput,
    validateApellidos,
    validateCodigoSis,
    validateDocumento,
    validateEmail,
    validateNombre,
} from '../../utils/validators'

interface Props {
    open: boolean
    estudianteId: number | null
    onClose: () => void
    onSaved: (nombre: string) => void
}

interface FormState {
    nombre: string
    apellidos: string
    ci: string
    codigoSis: string
    email: string
    idFacultad: string
    idCarrera: string
}

const EMPTY_FORM: FormState = {
    nombre: '',
    apellidos: '',
    ci: '',
    codigoSis: '',
    email: '',
    idFacultad: '',
    idCarrera: '',
}

const FIELD_NAMES: Record<keyof FormState, string> = {
    nombre: 'Nombres',
    apellidos: 'Apellidos',
    ci: 'Documento de Identidad',
    codigoSis: 'Código SIS',
    email: 'Correo Electrónico',
    idFacultad: 'Facultad',
    idCarrera: 'Carrera',
}

function FieldError({ children }: { children?: string }) {
    return children ? <p className="mt-1 text-xs font-medium text-red-600">{children}</p> : null
}

export default function EditarEstudianteModal({ open, estudianteId, onClose, onSaved }: Props) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [estudiante, setEstudiante] = useState<EstudianteListItem | null>(null)
    const [facultades, setFacultades] = useState<FacultadOption[]>([])
    const [carreras, setCarreras] = useState<CarreraOption[]>([])
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [originalForm, setOriginalForm] = useState<FormState>(EMPTY_FORM)
    const [changedFields, setChangedFields] = useState<string[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [apiError, setApiError] = useState('')
    const [savedNombre, setSavedNombre] = useState('')

    useEffect(() => {
        if (!open || !estudianteId) return
        let cancelled = false
        Promise.all([getEstudianteById(estudianteId), getFacultades()])
            .then(([est, facs]) => {
                if (cancelled) return
                setEstudiante(est)
                setFacultades(facs)
                const carrera = est.carreras?.[0]
                const loadedForm: FormState = {
                    nombre: est.nombre,
                    apellidos: est.apellidos,
                    ci: est.ci,
                    codigoSis: est.codigoSis,
                    email: est.email ?? '',
                    idFacultad: carrera ? String(carrera.idFacultad) : '',
                    idCarrera: carrera ? String(carrera.idCarrera) : '',
                }
                setForm(loadedForm)
                setOriginalForm(loadedForm)
            })
            .catch(() => {
                if (!cancelled) setApiError('No se pudieron cargar los datos del estudiante.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [open, estudianteId])

    useEffect(() => {
        if (!form.idFacultad) return
        let cancelled = false
        getCarreras(form.idFacultad)
            .then((data) => { if (!cancelled) setCarreras(data) })
            .catch(() => { if (!cancelled) setCarreras([]) })
        return () => { cancelled = true }
    }, [form.idFacultad])

    if (!open) return null

    const close = () => {
        if (saving) return
        setEstudiante(null)
        setForm(EMPTY_FORM)
        setOriginalForm(EMPTY_FORM)
        setChangedFields([])
        setErrors({})
        setApiError('')
        setSuccess(false)
        setSavedNombre('')
        setFacultades([])
        setCarreras([])
        setLoading(true)
        onClose()
    }

    const closeAndNotify = () => {
        const nombre = savedNombre || (estudiante ? `${estudiante.nombre} ${estudiante.apellidos}` : '')
        close()
        onSaved(nombre)
    }

    const update = (field: keyof FormState, value: string) => {
        setForm((c) => ({ ...c, [field]: value }))
        setErrors((c) => ({ ...c, [field]: '' }))
        setApiError('')
    }

    const submit = async () => {
        if (!estudianteId) return
        const next: Record<string, string> = {}
        const nombreError = validateNombre(form.nombre)
        const apellidosError = validateApellidos(form.apellidos)
        const ciError = validateDocumento(form.ci)
        const emailError = validateEmail(form.email)

        if (nombreError) next.nombre = nombreError
        if (apellidosError) next.apellidos = apellidosError
        if (ciError) next.ci = ciError
        if (emailError) next.email = emailError
        const sisErr = validateCodigoSis(form.codigoSis)
        if (sisErr) next.codigoSis = sisErr

        if (!form.idFacultad) next.idFacultad = 'Selecciona una facultad.'
        if (!form.idCarrera) next.idCarrera = 'Selecciona una carrera.'

        setErrors(next)
        if (Object.keys(next).length) return

        setSaving(true)
        setApiError('')
        try {
            const updated = await actualizarEstudiante(estudianteId, {
                nombre: form.nombre.trim(),
                apellidos: form.apellidos.trim(),
                ci: form.ci.trim(),
                email: form.email.trim(),
                codigoSis: form.codigoSis.trim(),
                idFacultad: Number(form.idFacultad),
                idCarrera: Number(form.idCarrera),
            })

            const changed: string[] = []
                ; (Object.keys(form) as Array<keyof FormState>).forEach((key) => {
                    if (form[key] !== originalForm[key]) {
                        changed.push(FIELD_NAMES[key])
                    }
                })
            setChangedFields(changed)

            setSavedNombre(`${updated.nombre} ${updated.apellidos}`)
            setSuccess(true)
        } catch (err: unknown) {
            const error = err as { response?: { data?: { mensaje?: string } } }
            setApiError(error.response?.data?.mensaje ?? 'No se pudo actualizar al estudiante.')
        } finally {
            setSaving(false)
        }
    }

    const inputClass =
        'mt-1 h-10 w-full rounded-md border border-[#C9D7EC] bg-white px-3 text-[13px] text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF]'

    return (
        <div
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/45 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-student-title"
        >
            <div className="relative flex h-[90dvh] max-h-[680px] w-full flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:max-w-[640px] sm:rounded-2xl">

                {/* Header */}
                <header className="flex shrink-0 items-start justify-between border-b border-[#D8E3F5] px-4 py-3 sm:px-5">
                    <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
                            <UserRoundPen size={18} />
                        </span>
                        <div>
                            <h2 id="edit-student-title" className="font-bold text-[#011140]">
                                Editar Estudiante
                            </h2>
                            <p className="mt-1 text-xs text-[#627A9B]">
                                Modifica los datos personales y académicos del estudiante.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Cerrar"
                        className="rounded p-1 text-[#627A9B] hover:bg-gray-100"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Contenido (scroll interno) */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
                    {loading ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <LoaderCircle className="animate-spin text-[#0439D9]" size={28} />
                            <p className="mt-3 text-sm text-gray-500">Cargando datos...</p>
                        </div>
                    ) : (
                        <>
                            {apiError && (
                                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    <CircleAlert size={16} className="mt-0.5 shrink-0" />
                                    {apiError}
                                </div>
                            )}

                            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-[#011140]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#0439D9]" />
                                INFORMACIÓN PERSONAL
                            </h3>
                            <div className="mb-5 space-y-3">
                                <label className="block text-xs font-semibold text-[#011140]">
                                    Nombres <b className="text-red-500">*</b>
                                    <input
                                        type="text"
                                        value={form.nombre}
                                        maxLength={FIELD_LIMITS.nombre.max}
                                        onChange={(e) => update('nombre', sanitizeNombreInput(e.target.value))}
                                        className={inputClass}
                                    />
                                    <FieldError>{errors.nombre}</FieldError>
                                </label>

                                <label className="block text-xs font-semibold text-[#011140]">
                                    Apellidos Completos <b className="text-red-500">*</b>
                                    <input
                                        type="text"
                                        value={form.apellidos}
                                        maxLength={FIELD_LIMITS.apellidos.max}
                                        onChange={(e) => update('apellidos', sanitizeNombreInput(e.target.value))}
                                        className={inputClass}
                                    />
                                    <FieldError>{errors.apellidos}</FieldError>
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-xs font-semibold text-[#011140]">
                                        Documento (CI) <b className="text-red-500">*</b>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={form.ci}
                                            maxLength={FIELD_LIMITS.documento.max}
                                            onChange={(e) => update('ci', e.target.value.replace(/\D/g, ''))}
                                            className={inputClass}
                                        />
                                        <FieldError>{errors.ci}</FieldError>
                                    </label>

                                    <label className="block text-xs font-semibold text-[#011140]">
                                        Código SIS <b className="text-red-500">*</b>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={form.codigoSis}
                                            maxLength={9}
                                            onChange={(e) => update('codigoSis', e.target.value.replace(/\D/g, ''))}
                                            className={`${inputClass} font-mono`}
                                        />
                                        <FieldError>{errors.codigoSis}</FieldError>
                                    </label>
                                </div>

                                <label className="block text-xs font-semibold text-[#011140]">
                                    Correo Electrónico
                                    <input
                                        type="email"
                                        value={form.email}
                                        maxLength={FIELD_LIMITS.email.max}
                                        onChange={(e) => update('email', e.target.value)}
                                        className={inputClass}
                                    />
                                    <FieldError>{errors.email}</FieldError>
                                </label>
                            </div>

                            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-[#011140]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#0439D9]" />
                                INFORMACIÓN ACADÉMICA
                            </h3>
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-[#011140]">
                                    Facultad <b className="text-red-500">*</b>
                                    <select
                                        value={form.idFacultad}
                                        onChange={(e) => {
                                            update('idFacultad', e.target.value)
                                            update('idCarrera', '')
                                            setCarreras([])
                                        }}
                                        className={inputClass}
                                    >
                                        <option value="">Seleccione facultad...</option>
                                        {facultades.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError>{errors.idFacultad}</FieldError>
                                </label>

                                <label className="block text-xs font-semibold text-[#011140]">
                                    Carrera <b className="text-red-500">*</b>
                                    <select
                                        value={form.idCarrera}
                                        disabled={!form.idFacultad}
                                        onChange={(e) => update('idCarrera', e.target.value)}
                                        className={`${inputClass} disabled:bg-gray-100`}
                                    >
                                        <option value="">Seleccione carrera...</option>
                                        {carreras.map((c) => (
                                            <option key={`${c.idFacultad}-${c.idCarrera}`} value={c.idCarrera}>
                                                {c.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError>{errors.idCarrera}</FieldError>
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer (shrink-0 → siempre visible) */}
                <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#D8E3F5] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:pb-3">
                    <button
                        type="button"
                        onClick={close}
                        disabled={saving}
                        className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D] hover:bg-gray-100 disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={saving || loading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md hover:bg-[#0027a2] disabled:opacity-60"
                    >
                        {saving ? (
                            'Guardando...'
                        ) : (
                            <>
                                <Check size={16} strokeWidth={3} aria-hidden="true" />
                                Guardar cambios
                            </>
                        )}
                    </button>
                </footer>

                {success && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
                        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#BFDBFE] bg-[#f0f5ff] shadow-2xl">
                            <div className="flex flex-col items-center px-5 pb-4 pt-8 sm:px-6">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:h-16 sm:w-16">
                                    <Check className="text-green-600" size={34} strokeWidth={5} />
                                </div>
                                <h3 className="mb-1 text-center text-base font-bold text-[#011140] sm:text-lg">
                                    Estudiante actualizado correctamente
                                </h3>
                                <p className="text-center text-xs text-gray-600">
                                    {savedNombre ? `${savedNombre} fue actualizado con éxito.` : 'La información fue actualizada con éxito.'}
                                </p>
                            </div>

                            {changedFields.length > 0 && (
                                <div className="px-5 pb-4 sm:px-6">
                                    <div className="rounded-lg border border-[#BFDBFE] bg-white p-4">
                                        <p className="mb-2 text-[0.70rem] font-semibold text-[#011140]">
                                            {changedFields.length === 1
                                                ? 'Campo modificado:'
                                                : `Campos modificados (${changedFields.length}):`}
                                        </p>
                                        <ul className="space-y-1">
                                            {changedFields.map((field) => (
                                                <li key={field} className="flex items-center gap-2 text-xs text-gray-700">
                                                    <span className="h-1 w-1 rounded-full bg-[#0439D9]" />
                                                    {field}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                                <button
                                    type="button"
                                    onClick={closeAndNotify}
                                    className="w-full rounded-lg bg-[#0439D9] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0027a2]"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}