import { useEffect, useRef, useState } from 'react'
import {
  X,
  Info,
  Check,
  CircleAlert,
  FilePenLine,
  Pencil,
  Trash2,
  Plus,
  ShieldCheck,
  UserRoundCheck,
  Lock,
  ChevronsDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  INITIAL_EXAMEN_FORM,
  type NormaGeneral,
  type NormaParticular,
  type RegisterExamenFormErrors,
  type RegisterExamenFormState,
} from '../../types/examen.types'
import { crearAmbiente, listarAmbientes, listarAmbientesConDisponibilidad, type AmbienteDto } from '../../services/ambienteService'
import { crearExamen } from '../../services/examenService'
import {
  formatAmPm,
  formatFechaDisplay,
  isNetworkError,
  isOffline,
  minutesBetween,
  parseHora24,
  formatearNorma,
  toTitleCaseTexto,
  NORMA_MAX,
  todayISO,
  validateExamenForm,
  validateNormaTexto,
  formatHora24,
  sanitizeHoraInput,
  filtrarAmbientes,
  examFieldClass,
  EXAM_SECTION_CARD_CLASS,
} from '../../utils/examFormUtils'
import { toTitleCaseNombre } from '../../utils/validators'
import AsignaturaAutocomplete from './AsignaturaAutocomplete'
import DocenteAutocomplete from './DocenteAutocomplete'
import { ConfirmDiscardDialog, NormaTexto, OfflineDialog } from './ExamFormDialogs'
import { useAuth } from '../../context/AuthContext'

interface RegisterExamenModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Step = 1 | 2 | 3

const STEPS: { id: Step; titulo: string; detalle: string; campos: (keyof RegisterExamenFormErrors)[] }[] = [
  { id: 1, titulo: 'Información Básica', detalle: 'Asignatura y docente', campos: ['asignatura', 'docente'] },
  { id: 2, titulo: 'Programación y Ambiente', detalle: 'Fecha, horario y aula', campos: ['fecha', 'horaInicio', 'horaFin', 'idAmbiente'] },
  { id: 3, titulo: 'Normas y Confirmación', detalle: 'Reglamento y resumen', campos: [] },
]

const STEP_DESCRIPCION: Record<Step, string> = {
  1: 'Seleccione la asignatura y el docente responsable de la evaluación.',
  2: 'Defina la fecha, el horario y el ambiente donde se rendirá el examen.',
  3: 'Revise las normas del examen y confirme los datos antes de registrar.',
}

export default function RegisterExamenModal({ isOpen, onClose, onSuccess }: RegisterExamenModalProps) {
  const { nombre, roles } = useAuth()
  const esDocente = roles.includes('DOCENTE') && !roles.includes('ADMIN')
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<RegisterExamenFormState>(INITIAL_EXAMEN_FORM)
  const [errors, setErrors] = useState<RegisterExamenFormErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ambientes, setAmbientes] = useState<AmbienteDto[]>([])
  const [loadingAmbientes, setLoadingAmbientes] = useState(false)
  const [nuevoAmbienteNombre, setNuevoAmbienteNombre] = useState('')
  const [showNuevoAmbiente, setShowNuevoAmbiente] = useState(false)
  const [normasGenerales, setNormasGenerales] = useState<NormaGeneral[]>([
    {
      id: 'ng-1',
      texto: 'No se permite calculadora programable ni celulares.',
    },
  ])
  const [normasParticulares, setNormasParticulares] = useState<NormaParticular[]>([])
  const [nuevaNormaGeneral, setNuevaNormaGeneral] = useState('')
  const [showAddGeneral, setShowAddGeneral] = useState(false)
  const [nuevaParticularEst, setNuevaParticularEst] = useState('')
  const [nuevaParticularTexto, setNuevaParticularTexto] = useState('')
  const [showAddParticular, setShowAddParticular] = useState(false)
  const [editingGeneralId, setEditingGeneralId] = useState<string | null>(null)
  const [ambienteFilter, setAmbienteFilter] = useState('')
  const [ambienteListOpen, setAmbienteListOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ambienteBoxRef = useRef<HTMLDivElement | null>(null)
  const [asignaturaOk, setAsignaturaOk] = useState(false)
  const [docenteOk, setDocenteOk] = useState(false)
  const [idMateria, setIdMateria] = useState<number | null>(null)
  const [idDocente, setIdDocente] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [offlineOpen, setOfflineOpen] = useState(false)
  const [expandedNormas, setExpandedNormas] = useState<Record<string, boolean>>({})
  const [normaGeneralError, setNormaGeneralError] = useState('')
  const [normaParticularError, setNormaParticularError] = useState('')

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !esDocente || !nombre) return
    setForm((prev) => ({ ...prev, docente: nombre }))
    setDocenteOk(true)
    setIdDocente(null)
  }, [isOpen, esDocente, nombre])

  useEffect(() => {
    if (!ambienteListOpen) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (ambienteBoxRef.current && !ambienteBoxRef.current.contains(target)) {
        setAmbienteListOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [ambienteListOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      setLoadingAmbientes(true)
      setGeneralError('')
      listarAmbientes()
        .then((data) => {
          if (!cancelled) setAmbientes(data)
        })
        .catch(() => {
          if (!cancelled) setGeneralError('No se pudo cargar el catálogo de ambientes.')
        })
        .finally(() => {
          if (!cancelled) setLoadingAmbientes(false)
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [isOpen])

  // Refrescar disponibilidad cuando cambian fecha, hora o duración
  useEffect(() => {
    const dur = minutesBetween(form.horaInicio, form.horaFin)
    if (!form.fecha || !form.horaInicio || dur === null) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      listarAmbientesConDisponibilidad({
        fecha: form.fecha,
        horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio,
        duracionMinutos: dur,
      })
        .then((data) => { if (!cancelled) setAmbientes(data) })
        .catch(() => { /* silencioso: ya tenemos la lista base */ })
    }, 400)
    return () => { cancelled = true; window.clearTimeout(handle) }
  }, [form.fecha, form.horaInicio, form.horaFin])

  if (!isOpen) return null

  const duracion = minutesBetween(form.horaInicio, form.horaFin)
  const ambienteSeleccionado = ambientes.find((a) => String(a.id) === form.idAmbiente)
  const sinSolapamientoUi = Boolean(
    form.idAmbiente && form.fecha && form.horaInicio && form.horaFin && duracion !== null,
  )
  const ambientesFiltrados = filtrarAmbientes(ambientes, ambienteFilter)
  const fieldClass = examFieldClass
  const sectionCardClass = EXAM_SECTION_CARD_CLASS

  const handleChange = (field: keyof RegisterExamenFormState, raw: string) => {
    const value = field === 'asignatura' || field === 'docente' ? toTitleCaseTexto(raw) : raw
    setForm((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
    if (field === 'asignatura') { setAsignaturaOk(false); setIdMateria(null) }
    if (field === 'docente') { setDocenteOk(false); setIdDocente(null) }
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (generalError) setGeneralError('')
    if (success) setSuccess(false)
  }

  const resetAll = () => {
    setStep(1)
    setForm(INITIAL_EXAMEN_FORM)
    setErrors({})
    setGeneralError('')
    setSuccess(false)
    setSaving(false)
    setShowAddGeneral(false)
    setShowAddParticular(false)
    setShowNuevoAmbiente(false)
    setNuevaNormaGeneral('')
    setNuevaParticularEst('')
    setNuevaParticularTexto('')
    setNuevoAmbienteNombre('')
    setEditingGeneralId(null)
    setAmbienteFilter('')
    setAmbienteListOpen(false)
    setNormasGenerales([
      {
        id: 'ng-1',
        texto: 'No se permite calculadora programable ni celulares.',
      },
    ])
    setNormasParticulares([])
    setAsignaturaOk(false)
    setDocenteOk(false)
    setIdMateria(null)
    setIdDocente(null)
    setDirty(false)
    setConfirmClose(false)
    setOfflineOpen(false)
    setExpandedNormas({})
    setNormaGeneralError('')
    setNormaParticularError('')
  }

  const handleClose = () => {
    if (saving) return
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    resetAll()
    onClose()
  }

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setConfirmClose(true)
      return
    }
    handleClose()
  }

  const validarTodo = () =>
    validateExamenForm(form, {
      asignaturaSeleccionada: asignaturaOk,
      docenteSeleccionado: docenteOk,
    })

  const goNext = () => {
    const campos = STEPS[step - 1].campos
    const todos = validarTodo()
    const stepErrors: RegisterExamenFormErrors = {}
    for (const campo of campos) {
      if (todos[campo]) stepErrors[campo] = todos[campo]
    }
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      setGeneralError('Completa los campos obligatorios de este paso para continuar.')
      return
    }
    setGeneralError('')
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s))
  }

  const goBack = () => {
    setGeneralError('')
    setErrors({})
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 3) {
      goNext()
      return
    }
    if (isOffline()) {
      setOfflineOpen(true)
      return
    }
    const nextErrors = validarTodo()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const pasoConError = STEPS.find((s) => s.campos.some((c) => nextErrors[c]))
      if (pasoConError) setStep(pasoConError.id)
      setGeneralError('Hay datos del examen por corregir en este paso.')
      setSuccess(false)
      return
    }

    const duracion = minutesBetween(form.horaInicio, form.horaFin)
    if (duracion === null) {
      setGeneralError('La hora de fin debe ser posterior al inicio.')
      return
    }

    setSaving(true)
    setGeneralError('')
    try {
      await crearExamen({
        asignatura: toTitleCaseTexto(form.asignatura.trim()),
        docente: toTitleCaseTexto(form.docente.trim()),
        fecha: form.fecha,
        horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio,
        duracionMinutos: duracion,
        idAmbiente: Number(form.idAmbiente),
        normasGenerales: normasGenerales.filter((n) => n.activa !== false).map((n) => n.texto),
        normasParticulares: normasParticulares.filter((n) => n.activa !== false).map((n) => ({
          estudiante: n.estudiante,
          texto: n.texto,
        })),
        idMateria,
        idDocente,
      })
      setSuccess(true)
      onSuccess?.()
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        resetAll()
        onClose()
        closeTimerRef.current = null
      }, 900)
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setOfflineOpen(true)
        return
      }
      const error = err as {
        response?: { status?: number; data?: { mensaje?: string } }
      }
      const status = error.response?.status
      const mensaje = error.response?.data?.mensaje
      if (status === 409) {
        setGeneralError(mensaje ?? 'Conflicto de ambiente u horario.')
      } else if (status === 400) {
        setGeneralError(mensaje ?? 'Verifica los datos del examen.')
      } else {
        setGeneralError(mensaje ?? 'No se pudo registrar el examen. Intenta más tarde.')
      }
    } finally {
      setSaving(false)
    }
  }

  const addNormaGeneral = () => {
    const texto = nuevaNormaGeneral
    const otras = normasGenerales
      .filter((n) => n.activa !== false && n.id !== editingGeneralId)
      .map((n) => n.texto)
    const error = validateNormaTexto(texto, otras)
    setNormaGeneralError(error ?? '')
    if (error) return
    setDirty(true)
    if (editingGeneralId) {
      setNormasGenerales((prev) =>
        prev.map((n) => (n.id === editingGeneralId ? { ...n, texto } : n)),
      )
      setEditingGeneralId(null)
    } else {
      setNormasGenerales((prev) => [...prev, { id: `ng-${Date.now()}`, texto }])
    }
    setNuevaNormaGeneral('')
    setShowAddGeneral(false)
  }

  const addNormaParticular = () => {
    const estudiante = nuevaParticularEst.trim()
    const texto = nuevaParticularTexto
    const otras = normasParticulares
      .filter((n) => n.activa !== false && n.estudiante.toLowerCase() === estudiante.toLowerCase())
      .map((n) => n.texto)
    const error = !estudiante ? 'Indica el estudiante' : validateNormaTexto(texto, otras)
    setNormaParticularError(error ?? '')
    if (error) return
    setDirty(true)
    setNormasParticulares((prev) => [
      ...prev,
      { id: `np-${Date.now()}`, estudiante, texto },
    ])
    setNuevaParticularEst('')
    setNuevaParticularTexto('')
    setShowAddParticular(false)
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-examen-title"
    >
      <div className="relative flex h-[70dvh] max-h-[680px] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl sm:border-gray-100">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="min-w-0 flex-1">
            <div aria-hidden="true" className="mx-auto mb-3 h-1 w-11 rounded-full bg-[#C4D2E7] sm:hidden" />
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
                <FilePenLine size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="register-examen-title" className="text-base font-bold text-[#011140] sm:text-xl">
                  Registrar Nuevo Examen
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#E9F1FF] px-2 py-0.5 text-[10px] font-bold text-[#0439D9]">
                    Paso {step} de {STEPS.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">{STEP_DESCRIPCION[step]}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Cerrar"
            className="mt-4 shrink-0 rounded-full bg-[#F1F6FF] p-2 text-[#627A9B] transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 sm:mt-0 sm:rounded-lg sm:bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        <ol className="grid shrink-0 grid-cols-3 gap-2 border-b border-gray-100 px-4 py-3 sm:px-6" aria-label="Progreso del registro">
          {STEPS.map((s) => {
            const done = step > s.id
            const current = step === s.id
            return (
              <li key={s.id} aria-current={current ? 'step' : undefined} className="min-w-0">
                <div
                  className={`mb-2 h-1 rounded-full transition-colors ${
                    done ? 'bg-emerald-400' : current ? 'bg-[#0439D9]' : 'bg-gray-200'
                  }`}
                />
                <div className="flex items-start gap-2">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done
                        ? 'bg-emerald-500 text-white'
                        : current
                          ? 'bg-[#0439D9] text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : s.id}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-[11px] font-semibold ${
                        current ? 'text-[#011140]' : done ? 'text-emerald-700' : 'text-gray-400'
                      }`}
                    >
                      {s.titulo}
                    </p>
                    <p className="hidden truncate text-[10px] text-gray-400 sm:block">
                      {done ? 'Completado' : current ? s.detalle : 'Pendiente'}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {step === 1 && (
            <section className={sectionCardClass}>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-wide text-[#0439D9]">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />
                INFORMACIÓN BÁSICA DEL EXAMEN
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="registrar-asignatura" className="mb-1 block text-xs font-semibold text-gray-700">
                    Asignatura <span className="text-red-500">*</span>
                  </label>
                  <AsignaturaAutocomplete
                    id="registrar-asignatura"
                    value={form.asignatura}
                    error={errors.asignatura}
                    onChange={(value) => handleChange('asignatura', value)}
                    onSelect={(materia) => {
                      handleChange('asignatura', materia.nombre)
                      setAsignaturaOk(true)
                      setIdMateria(materia.id)
                    }}
                  />
                  {errors.asignatura && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.asignatura}</p>
                  )}
                </div>
                <div className="min-w-0">
                  <label htmlFor="registrar-docente" className="mb-1 block text-xs font-semibold text-gray-700">
                    Docente Responsable <span className="text-red-500">*</span>
                  </label>
                  {esDocente ? (
                    <input
                      id="registrar-docente"
                      value={form.docente}
                      readOnly
                      aria-label="Docente Responsable"
                      className={`${fieldClass()} cursor-not-allowed bg-gray-100 text-gray-600`}
                    />
                  ) : (
                  <DocenteAutocomplete
                    id="registrar-docente"
                    value={form.docente}
                    error={errors.docente}
                    onChange={(value) => handleChange('docente', value)}
                    onSelect={(docente) => {
                      handleChange('docente', `${docente.nombre} ${docente.apellidos}`.trim())
                      setDocenteOk(true)
                      setIdDocente(docente.id)
                    }}
                  />
                  )}
                  {errors.docente && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.docente}</p>
                  )}
                </div>
              </div>
            </section>
            )}

            {step === 2 && (
            <>
            <div className="flex items-start gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
              <Info size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
              <p className="text-[11px] leading-relaxed text-[#011140] sm:text-xs">
                <span className="font-semibold">Validación de Ambiente y Horarios en Tiempo Real:</span>{' '}
                El sistema audita automáticamente la disponibilidad del aula para prevenir
                solapamientos o cruces con otros exámenes.
              </p>
            </div>

            <section className={sectionCardClass}>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-wide text-[#0439D9]">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />
                PROGRAMACIÓN Y AMBIENTE
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Fecha de Evaluación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={todayISO()}
                    value={form.fecha}
                    onChange={(e) => handleChange('fecha', e.target.value)}
                    className={fieldClass(errors.fecha)}
                  />
                  {form.fecha && (
                    <p className="mt-1 text-[10px] text-[#627A9B]">{formatFechaDisplay(form.fecha)}</p>
                  )}
                  {errors.fecha && <p className="mt-1 text-[10px] text-red-500">{errors.fecha}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:contents">
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Hora de Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="08:00"
                    maxLength={5}
                    value={form.horaInicio}
                    onChange={(e) => handleChange('horaInicio', sanitizeHoraInput(e.target.value))}
                    onBlur={() => {
                      const parsed = parseHora24(form.horaInicio)
                      if (parsed) handleChange('horaInicio', formatHora24(parsed.h, parsed.m))
                    }}
                    className={fieldClass(errors.horaInicio)}
                  />
                  {form.horaInicio && parseHora24(form.horaInicio) && (
                    <p className="mt-1 text-[10px] font-semibold text-[#0439D9]">{formatAmPm(form.horaInicio)}</p>
                  )}
                  {errors.horaInicio && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.horaInicio}</p>
                  )}
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Hora de Fin / Duración <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="10:00"
                    maxLength={5}
                    value={form.horaFin}
                    onChange={(e) => handleChange('horaFin', sanitizeHoraInput(e.target.value))}
                    onBlur={() => {
                      const parsed = parseHora24(form.horaFin)
                      if (parsed) handleChange('horaFin', formatHora24(parsed.h, parsed.m))
                    }}
                    className={fieldClass(errors.horaFin)}
                  />
                  {form.horaFin && parseHora24(form.horaFin) && (
                    <p className="mt-1 text-[10px] font-semibold text-[#0439D9]">{formatAmPm(form.horaFin)}</p>
                  )}
                  {duracion !== null && (
                    <p className="mt-1 text-[10px] text-gray-500">{duracion} minutos</p>
                  )}
                  {errors.horaFin && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.horaFin}</p>
                  )}
                </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-gray-700" htmlFor="ambiente-buscar">
                    Ambiente / Aula Asignada <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {sinSolapamientoUi && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        <Check size={12} aria-hidden="true" />
                        Sin solapamiento detectado
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNuevoAmbiente((v) => !v)}
                      className="text-[11px] font-semibold text-[#0439D9] hover:underline"
                    >
                      + Nuevo ambiente
                    </button>
                  </div>
                </div>
                {showNuevoAmbiente && (
                  <div className="mb-2 flex gap-2">
                    <input
                      value={nuevoAmbienteNombre}
                      onChange={(e) => setNuevoAmbienteNombre(e.target.value)}
                      placeholder="Código o nombre (ej. 692F, INFLAB)"
                      className={fieldClass()}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const nombre = nuevoAmbienteNombre.trim()
                        if (!nombre) return
                        try {
                          const creado = await crearAmbiente({ nombre })
                          setAmbientes((prev) =>
                            [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                          )
                          handleChange('idAmbiente', String(creado.id))
                          setAmbienteFilter(creado.nombre)
                          setAmbienteListOpen(false)
                          setNuevoAmbienteNombre('')
                          setShowNuevoAmbiente(false)
                        } catch {
                          setGeneralError('No se pudo crear el ambiente (¿nombre duplicado?).')
                        }
                      }}
                      className="shrink-0 rounded-lg bg-[#0439D9] px-3 text-xs font-semibold text-white"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                <div ref={ambienteBoxRef} className="relative">
                  <div className="relative">
                    <input
                      id="ambiente-buscar"
                      type="text"
                      autoComplete="off"
                      disabled={loadingAmbientes}
                      value={
                        ambienteListOpen || !ambienteSeleccionado
                          ? ambienteFilter
                          : ambienteSeleccionado.ubicacion
                            ? `${ambienteSeleccionado.nombre} — ${ambienteSeleccionado.ubicacion}`
                            : ambienteSeleccionado.nombre
                      }
                      placeholder={
                        loadingAmbientes
                          ? 'Cargando ambientes…'
                          : 'Buscar aula (ej. 692F, INFLAB)…'
                      }
                      onFocus={() => {
                        setAmbienteListOpen(true)
                        if (ambienteSeleccionado) {
                          setAmbienteFilter(ambienteSeleccionado.nombre)
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value
                        setAmbienteFilter(value)
                        setAmbienteListOpen(true)
                        if (form.idAmbiente) handleChange('idAmbiente', '')
                      }}
                      className={`${fieldClass(errors.idAmbiente)} pr-10`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={ambienteListOpen ? 'Cerrar lista de ambientes' : 'Abrir lista de ambientes'}
                      disabled={loadingAmbientes}
                      onClick={() => {
                        if (ambienteListOpen) {
                          setAmbienteListOpen(false)
                          return
                        }
                        setAmbienteListOpen(true)
                        if (ambienteSeleccionado) {
                          setAmbienteFilter(ambienteSeleccionado.nombre)
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-[#0439D9]"
                    >
                      <ChevronsDown size={16} aria-hidden="true" />
                    </button>
                  </div>

                  {ambienteListOpen && !loadingAmbientes && (
                    <ul
                      role="listbox"
                      className="mt-1 max-h-40 overflow-y-auto overscroll-contain rounded-lg border border-[#D8E3F5] bg-white py-1 shadow-md"
                    >
                      {ambientesFiltrados.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-gray-400">Sin coincidencias</li>
                      ) : (
                        ambientesFiltrados.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={form.idAmbiente === String(a.id)}
                              className={`flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-[#E9F1FF] ${
                                form.idAmbiente === String(a.id) ? 'bg-[#F8FBFF]' : ''
                              }`}
                              onClick={() => {
                                handleChange('idAmbiente', String(a.id))
                                setAmbienteFilter(a.nombre)
                                setAmbienteListOpen(false)
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#011140]">{a.nombre}</span>
                                {a.disponible !== undefined && (
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                    a.disponible
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-red-50 text-red-600'
                                  }`}>
                                    {a.disponible ? 'Disponible' : 'Ocupado'}
                                  </span>
                                )}
                              </div>
                              {a.ubicacion && (
                                <span className="text-[10px] text-gray-500">{a.ubicacion}</span>
                              )}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                {!loadingAmbientes && ambientes.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-600">
                    No hay ambientes en el catálogo. Agrega uno con “+ Nuevo ambiente” o aplica
                    la migración V8.
                  </p>
                )}
                {errors.idAmbiente && (
                  <p className="mt-1 text-[10px] text-red-500">{errors.idAmbiente}</p>
                )}
              </div>
            </section>
            </>
            )}

            {step === 3 && (
            <>
            <section className="rounded-xl border border-[#D8E3F5] bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-wide text-[#0439D9]">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />
                RESUMEN DEL EXAMEN
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-2">
                {[
                  { label: 'Asignatura', value: form.asignatura, paso: 1 as Step },
                  { label: 'Docente responsable', value: form.docente, paso: 1 as Step },
                  { label: 'Fecha', value: form.fecha ? formatFechaDisplay(form.fecha) : '', paso: 2 as Step },
                  {
                    label: 'Horario',
                    value:
                      form.horaInicio && form.horaFin
                        ? `${formatAmPm(form.horaInicio)} – ${formatAmPm(form.horaFin)}${duracion !== null ? ` (${duracion} min)` : ''}`
                        : '',
                    paso: 2 as Step,
                  },
                  {
                    label: 'Ambiente',
                    value: ambienteSeleccionado
                      ? ambienteSeleccionado.ubicacion
                        ? `${ambienteSeleccionado.nombre} — ${ambienteSeleccionado.ubicacion}`
                        : ambienteSeleccionado.nombre
                      : '',
                    paso: 2 as Step,
                  },
                ].map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {item.label}
                      <button
                        type="button"
                        onClick={() => { setErrors({}); setGeneralError(''); setStep(item.paso) }}
                        className="normal-case tracking-normal text-[#0439D9] hover:underline"
                      >
                        Editar
                      </button>
                    </dt>
                    <dd className="mt-0.5 truncate font-semibold text-[#011140]">{item.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={sectionCardClass}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#0439D9]">
                    <ShieldCheck size={14} className="shrink-0" aria-hidden="true" />
                    <span className="leading-tight">NORMAS GENERALES DEL EXAMEN</span>
                  </h3>
                  <p className="hidden text-[10px] text-gray-500 min-[960px]:block">
                    Reglamento obligatorio para todos los postulantes habilitados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGeneral((v) => !v)
                    if (showAddGeneral) {
                      setEditingGeneralId(null)
                      setNuevaNormaGeneral('')
                    }
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#0439D9] px-2.5 py-1.5 text-[11px] font-semibold text-[#0439D9] hover:bg-[#E9F1FF] min-[960px]:rounded-lg min-[960px]:px-3 min-[960px]:text-xs"
                >
                  <Plus size={14} />{' '}
                  {editingGeneralId ? 'Editando…' : (
                    <>
                      <span className="min-[960px]:hidden">Agregar general</span>
                      <span className="hidden min-[960px]:inline">Agregar norma general</span>
                    </>
                  )}
                </button>
              </div>
              {showAddGeneral && (
                <div className="mb-2">
                  <div className="flex gap-2">
                    <input
                      value={nuevaNormaGeneral}
                      onChange={(e) => {
                        setNuevaNormaGeneral(formatearNorma(e.target.value))
                        if (normaGeneralError) setNormaGeneralError('')
                      }}
                      placeholder="Escribe la norma general… (10–60)"
                      maxLength={NORMA_MAX}
                      aria-invalid={Boolean(normaGeneralError)}
                      className={fieldClass(normaGeneralError)}
                    />
                    <button
                      type="button"
                      onClick={addNormaGeneral}
                      className="shrink-0 rounded-lg bg-[#0439D9] px-3 text-xs font-semibold text-white"
                    >
                      {editingGeneralId ? 'Guardar' : 'Añadir'}
                    </button>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 text-[10px]">
                    <span className="text-red-600">{normaGeneralError}</span>
                    <span className="shrink-0 text-gray-400">{nuevaNormaGeneral.length}/{NORMA_MAX}</span>
                  </div>
                </div>
              )}
              <ul className="space-y-2">
                {normasGenerales.filter((n) => n.activa !== false).map((n, idx) => (
                  <li
                    key={n.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-[#E8EEF7] bg-white px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FEF3C7] text-[10px] font-bold text-[#B45309]">
                        {idx + 1}
                      </span>
                      <NormaTexto
                        texto={n.texto}
                        expanded={Boolean(expandedNormas[n.id])}
                        onToggle={() => setExpandedNormas((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
                      />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Editar norma"
                        onClick={() => {
                          setNuevaNormaGeneral(n.texto)
                          setEditingGeneralId(n.id)
                          setShowAddGeneral(true)
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-[#0439D9]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar norma"
                        onClick={() => {
                          setDirty(true)
                          setNormasGenerales((prev) => prev.map((x) => (x.id === n.id ? { ...x, activa: false } : x)))
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={sectionCardClass}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#0439D9]">
                    <UserRoundCheck size={14} className="shrink-0" aria-hidden="true" />
                    <span className="leading-tight">NORMAS PARTICULARES POR ESTUDIANTE</span>
                  </h3>
                  <p className="hidden text-[10px] text-gray-500 min-[960px]:block">
                    Excepciones y adaptaciones asignadas a postulantes específicos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddParticular((v) => !v)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0439D9] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#032db0] min-[960px]:rounded-lg min-[960px]:px-3 min-[960px]:text-xs"
                >
                  <Plus size={14} />
                  <span className="min-[960px]:hidden">Agregar particular</span>
                  <span className="hidden min-[960px]:inline">Agregar norma particular</span>
                </button>
              </div>
              {showAddParticular && (
                <div className="mb-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      value={nuevaParticularEst}
                      onChange={(e) => {
                        setNuevaParticularEst(toTitleCaseNombre(e.target.value))
                        if (normaParticularError) setNormaParticularError('')
                      }}
                      placeholder="Estudiante / código"
                      maxLength={100}
                      className={fieldClass()}
                    />
                    <input
                      value={nuevaParticularTexto}
                      onChange={(e) => {
                        setNuevaParticularTexto(formatearNorma(e.target.value))
                        if (normaParticularError) setNormaParticularError('')
                      }}
                      placeholder="Norma o adaptación… (10–60)"
                      maxLength={NORMA_MAX}
                      aria-invalid={Boolean(normaParticularError)}
                      className={fieldClass(normaParticularError)}
                    />
                    <button
                      type="button"
                      onClick={addNormaParticular}
                      className="rounded-lg bg-[#0439D9] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Añadir
                    </button>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 text-[10px]">
                    <span className="text-red-600">{normaParticularError}</span>
                    <span className="shrink-0 text-gray-400">{nuevaParticularTexto.length}/{NORMA_MAX}</span>
                  </div>
                </div>
              )}
              {normasParticulares.filter((n) => n.activa !== false).length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#B8CBEF] bg-white px-3 py-4 text-center text-[11px] text-gray-400">
                  Sin normas particulares. Usa el botón para agregar adaptaciones.
                </p>
              ) : (
                <ul className="space-y-2">
                  {normasParticulares.filter((n) => n.activa !== false).map((n, idx) => (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-[#E8EEF7] bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-[#627A9B]">{idx + 1}. {n.estudiante}</p>
                        <NormaTexto
                          texto={n.texto}
                          expanded={Boolean(expandedNormas[n.id])}
                          onToggle={() => setExpandedNormas((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Eliminar norma particular"
                        onClick={() => {
                          setDirty(true)
                          setNormasParticulares((prev) => prev.map((x) => (x.id === n.id ? { ...x, activa: false } : x)))
                        }}
                        className="rounded p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            </>
            )}
          </div>

          <div className="shrink-0 border-t border-[#e3eaf1] bg-white px-4 py-3 sm:bg-[#f8fbff] sm:px-6 sm:py-4">
            {generalError && (
              <div role="alert" className="mb-2 flex items-start rounded-md border border-[#FECACA] bg-[#FEF2F2] p-2.5">
                <CircleAlert className="mr-2 mt-0.5 shrink-0 text-[#B91C1C]" size={16} />
                <p className="text-xs text-[#B91C1C]">{generalError}</p>
              </div>
            )}
            {success && (
              <div role="status" className="mb-2 flex items-start rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
                <Check className="mr-2 mt-0.5 shrink-0 text-emerald-700" size={16} />
                <p className="text-xs text-emerald-800">Examen registrado correctamente.</p>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden items-center text-[0.75rem] text-gray-400 sm:flex">
                <Lock size={12} aria-hidden="true" className="mr-1.5" />
                Todos los exámenes son registrados y auditados en SIGEX.
              </p>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={step === 1 ? requestClose : goBack}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#C9D7EC] px-4 py-2 text-sm font-semibold text-[#45628D] transition-colors hover:bg-gray-100 disabled:opacity-50 sm:w-auto sm:px-5 sm:py-2.5"
                >
                  {step === 1 ? 'Cancelar' : (
                    <>
                      <ChevronLeft size={16} aria-hidden="true" />
                      Atrás
                    </>
                  )}
                </button>
                {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#0439D9]/20 transition-colors hover:bg-[#0027a2] sm:w-auto sm:px-6 sm:py-2.5"
                >
                  Siguiente paso
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
                ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#0439D9]/20 transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5 sm:py-2.5"
                >
                  {saving ? (
                    'Guardando…'
                  ) : (
                    <>
                      <span className="sm:hidden">+ Registrar Examen</span>
                      <span className="hidden items-center gap-2 sm:flex">
                        <Check size={18} strokeWidth={4} aria-hidden="true" className="shrink-0" />
                        Guardar y Registrar examen
                      </span>
                    </>
                  )}
                </button>
                )}
              </div>
            </div>
          </div>
        </form>
        <ConfirmDiscardDialog
          open={confirmClose}
          onStay={() => setConfirmClose(false)}
          onLeave={handleClose}
        />
        <OfflineDialog open={offlineOpen} onClose={() => setOfflineOpen(false)} />
      </div>
    </div>
  )
}
