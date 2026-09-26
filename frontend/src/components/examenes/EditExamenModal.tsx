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
  BookOpen,
  User,
  Lock,
  ChevronsDown,
} from 'lucide-react'
import {
  type NormaGeneral,
  type NormaParticular,
  type RegisterExamenFormErrors,
  type RegisterExamenFormState,
} from '../../types/examen.types'
import { crearAmbiente, listarAmbientes, type AmbienteDto } from '../../services/ambienteService'
import { actualizarExamen, type ExamenDto } from '../../services/examenService'

interface EditExamenModalProps {
  isOpen: boolean
  examen: ExamenDto | null
  onClose: () => void
  onSuccess?: () => void
}

function parseHora24(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

function formatHora24(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function sanitizeHoraInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function minutesBetween(start: string, end: string): number | null {
  const a = parseHora24(start)
  const b = parseHora24(end)
  if (!a || !b) return null
  const diff = b.h * 60 + b.m - (a.h * 60 + a.m)
  return diff > 0 ? diff : null
}

/** Calcula horaFin a partir de horaInicio + duracionMinutos */
function calcHoraFin(horaInicio: string, duracionMinutos: number): string {
  const parsed = parseHora24(horaInicio)
  if (!parsed) return ''
  const totalMin = parsed.h * 60 + parsed.m + duracionMinutos
  return formatHora24(Math.floor(totalMin / 60) % 24, totalMin % 60)
}

function validateExamenForm(form: RegisterExamenFormState): RegisterExamenFormErrors {
  const errors: RegisterExamenFormErrors = {}
  if (!form.asignatura.trim()) errors.asignatura = 'La asignatura es obligatoria'
  if (!form.docente.trim()) errors.docente = 'El docente responsable es obligatorio'
  if (!form.fecha) errors.fecha = 'La fecha es obligatoria'
  if (!form.horaInicio.trim()) {
    errors.horaInicio = 'La hora de inicio es obligatoria'
  } else if (!parseHora24(form.horaInicio)) {
    errors.horaInicio = 'Usa formato 24 h (ej. 08:00 o 13:30)'
  }
  if (!form.horaFin.trim()) {
    errors.horaFin = 'La hora de fin es obligatoria'
  } else if (!parseHora24(form.horaFin)) {
    errors.horaFin = 'Usa formato 24 h (ej. 10:00 o 15:00)'
  }
  if (!form.idAmbiente) errors.idAmbiente = 'Selecciona un ambiente'
  if (!errors.horaInicio && !errors.horaFin) {
    const dur = minutesBetween(form.horaInicio, form.horaFin)
    if (dur === null) {
      errors.horaFin = 'La hora de fin debe ser posterior al inicio'
    }
  }
  return errors
}

export default function EditExamenModal({ isOpen, examen, onClose, onSuccess }: EditExamenModalProps) {
  const [form, setForm] = useState<RegisterExamenFormState>({
    asignatura: '',
    docente: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    idAmbiente: '',
  })
  const [errors, setErrors] = useState<RegisterExamenFormErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ambientes, setAmbientes] = useState<AmbienteDto[]>([])
  const [loadingAmbientes, setLoadingAmbientes] = useState(false)
  const [nuevoAmbienteNombre, setNuevoAmbienteNombre] = useState('')
  const [showNuevoAmbiente, setShowNuevoAmbiente] = useState(false)
  const [normasGenerales, setNormasGenerales] = useState<NormaGeneral[]>([])
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

  // Pre-populate form when examen changes
  useEffect(() => {
    if (!examen) return
    const horaFin = calcHoraFin(
      (examen.horaInicio ?? '').slice(0, 5),
      examen.duracionMinutos ?? 0,
    )
    const handle = window.setTimeout(() => {
      setForm({
        asignatura: examen.asignatura ?? '',
        docente: examen.docente ?? '',
        fecha: examen.fecha ?? '',
        horaInicio: (examen.horaInicio ?? '').slice(0, 5),
        horaFin,
        idAmbiente: String(examen.idAmbiente ?? ''),
      })
      setAmbienteFilter(examen.ambienteNombre ?? '')
      setNormasGenerales(
        (examen.normasGenerales ?? []).map((t, i) => ({ id: `ng-${i}`, texto: t })),
      )
      setNormasParticulares(
        (examen.normasParticulares ?? []).map((n, i) => ({
          id: `np-${i}`,
          estudiante: n.estudiante,
          texto: n.texto,
        })),
      )
      setErrors({})
      setGeneralError('')
      setSuccess(false)
    }, 0)
    return () => window.clearTimeout(handle)
  }, [examen])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

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
      listarAmbientes()
        .then((data) => { if (!cancelled) setAmbientes(data) })
        .catch(() => { if (!cancelled) setGeneralError('No se pudo cargar el catálogo de ambientes.') })
        .finally(() => { if (!cancelled) setLoadingAmbientes(false) })
    }, 0)
    return () => { cancelled = true; window.clearTimeout(handle) }
  }, [isOpen])

  if (!isOpen || !examen) return null

  const duracion = minutesBetween(form.horaInicio, form.horaFin)
  const ambienteSeleccionado = ambientes.find((a) => String(a.id) === form.idAmbiente)
  const sinSolapamientoUi = Boolean(
    form.idAmbiente && form.fecha && form.horaInicio && form.horaFin && duracion !== null,
  )
  const ambientesFiltrados = ambientes.filter((a) => {
    const q = ambienteFilter.trim().toLowerCase()
    if (!q) return true
    return a.nombre.toLowerCase().includes(q) || (a.ubicacion ?? '').toLowerCase().includes(q)
  })

  const fieldClass = (hasError?: string) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`
  const inputWithIconClass = (hasError?: string) =>
    `w-full rounded-lg border bg-white py-2.5 pl-3 pr-10 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`
  const sectionCardClass = 'rounded-xl border border-[#E8EEF7] bg-[#FAFCFF] p-4'

  const handleChange = (field: keyof RegisterExamenFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (generalError) setGeneralError('')
    if (success) setSuccess(false)
  }

  const handleClose = () => {
    if (saving) return
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateExamenForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setGeneralError('Completa los campos obligatorios.')
      return
    }
    const dur = minutesBetween(form.horaInicio, form.horaFin)
    if (dur === null) { setGeneralError('La hora de fin debe ser posterior al inicio.'); return }

    setSaving(true)
    setGeneralError('')
    try {
      await actualizarExamen(examen.idExamen, examen.idParalelo, {
        asignatura: form.asignatura.trim(),
        docente: form.docente.trim(),
        fecha: form.fecha,
        horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio,
        duracionMinutos: dur,
        idAmbiente: Number(form.idAmbiente),
        normasGenerales: normasGenerales.map((n) => n.texto),
        normasParticulares: normasParticulares.map((n) => ({ estudiante: n.estudiante, texto: n.texto })),
      })
      setSuccess(true)
      onSuccess?.()
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => { onClose(); closeTimerRef.current = null }, 900)
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { mensaje?: string } } }
      const status = error.response?.status
      const mensaje = error.response?.data?.mensaje
      if (status === 409) setGeneralError(mensaje ?? 'Conflicto de ambiente u horario.')
      else if (status === 400) setGeneralError(mensaje ?? 'Verifica los datos del examen.')
      else setGeneralError(mensaje ?? 'No se pudo actualizar el examen.')
    } finally {
      setSaving(false)
    }
  }

  const addNormaGeneral = () => {
    const texto = nuevaNormaGeneral.trim()
    if (!texto) return
    if (editingGeneralId) {
      setNormasGenerales((prev) => prev.map((n) => (n.id === editingGeneralId ? { ...n, texto } : n)))
      setEditingGeneralId(null)
    } else {
      setNormasGenerales((prev) => [...prev, { id: `ng-${Date.now()}`, texto }])
    }
    setNuevaNormaGeneral('')
    setShowAddGeneral(false)
  }

  const addNormaParticular = () => {
    const estudiante = nuevaParticularEst.trim()
    const texto = nuevaParticularTexto.trim()
    if (!estudiante || !texto) return
    setNormasParticulares((prev) => [...prev, { id: `np-${Date.now()}`, estudiante, texto }])
    setNuevaParticularEst('')
    setNuevaParticularTexto('')
    setShowAddParticular(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-examen-title"
    >
      <div className="flex h-[85dvh] max-h-[860px] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(92dvh,900px)] sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
              <FilePenLine size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 id="edit-examen-title" className="text-base font-bold text-[#011140] sm:text-xl">
                Editar Examen
              </h2>
              <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">
                Modifica asignatura, fecha, horario, ambiente o normas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-[#627A9B] hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
              <Info size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
              <p className="text-[11px] leading-relaxed text-[#011140] sm:text-xs">
                <span className="font-semibold">Edición de examen:</span>{' '}
                El sistema revalidará la disponibilidad del aula y el horario al guardar los cambios.
              </p>
            </div>

            {/* Sección 1: Información básica */}
            <section className={sectionCardClass}>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-wide text-[#0439D9]">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />
                1. INFORMACIÓN BÁSICA DEL EXAMEN
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Asignatura <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      value={form.asignatura}
                      onChange={(e) => handleChange('asignatura', e.target.value)}
                      className={inputWithIconClass(errors.asignatura)}
                    />
                    <BookOpen size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  </div>
                  {errors.asignatura && <p className="mt-1 text-[10px] text-red-500">{errors.asignatura}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Docente Responsable <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      value={form.docente}
                      onChange={(e) => handleChange('docente', e.target.value)}
                      className={inputWithIconClass(errors.docente)}
                    />
                    <User size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  </div>
                  {errors.docente && <p className="mt-1 text-[10px] text-red-500">{errors.docente}</p>}
                </div>
              </div>
            </section>

            {/* Sección 2: Programación */}
            <section className={sectionCardClass}>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-wide text-[#0439D9]">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />
                2. PROGRAMACIÓN Y AMBIENTE
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => handleChange('fecha', e.target.value)}
                    className={fieldClass(errors.fecha)}
                  />
                  {errors.fecha && <p className="mt-1 text-[10px] text-red-500">{errors.fecha}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Hora inicio <span className="text-red-500">*</span>
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
                  {errors.horaInicio && <p className="mt-1 text-[10px] text-red-500">{errors.horaInicio}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Hora fin <span className="text-red-500">*</span>
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
                  {duracion !== null && <p className="mt-1 text-[10px] text-gray-500">{duracion} minutos</p>}
                  {errors.horaFin && <p className="mt-1 text-[10px] text-red-500">{errors.horaFin}</p>}
                </div>
              </div>

              {/* Selector de ambiente */}
              <div className="mt-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-gray-700" htmlFor="edit-ambiente-buscar">
                    Ambiente / Aula <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {sinSolapamientoUi && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        <Check size={12} aria-hidden="true" /> Sin solapamiento
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
                      placeholder="Código o nombre (ej. 692F)"
                      className={fieldClass()}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const nombre = nuevoAmbienteNombre.trim()
                        if (!nombre) return
                        try {
                          const creado = await crearAmbiente({ nombre })
                          setAmbientes((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)))
                          handleChange('idAmbiente', String(creado.id))
                          setAmbienteFilter(creado.nombre)
                          setAmbienteListOpen(false)
                          setNuevoAmbienteNombre('')
                          setShowNuevoAmbiente(false)
                        } catch {
                          setGeneralError('No se pudo crear el ambiente.')
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
                      id="edit-ambiente-buscar"
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
                      placeholder={loadingAmbientes ? 'Cargando…' : 'Buscar aula…'}
                      onFocus={() => {
                        setAmbienteListOpen(true)
                        if (ambienteSeleccionado) setAmbienteFilter(ambienteSeleccionado.nombre)
                      }}
                      onChange={(e) => {
                        setAmbienteFilter(e.target.value)
                        setAmbienteListOpen(true)
                        if (form.idAmbiente) handleChange('idAmbiente', '')
                      }}
                      className={`${fieldClass(errors.idAmbiente)} pr-10`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={loadingAmbientes}
                      onClick={() => { setAmbienteListOpen((v) => !v) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-50"
                    >
                      <ChevronsDown size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {ambienteListOpen && !loadingAmbientes && (
                    <ul role="listbox" className="mt-1 max-h-40 overflow-y-auto overscroll-contain rounded-lg border border-[#D8E3F5] bg-white py-1 shadow-md">
                      {ambientesFiltrados.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-gray-400">Sin coincidencias</li>
                      ) : ambientesFiltrados.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={form.idAmbiente === String(a.id)}
                            className={`flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-[#E9F1FF] ${form.idAmbiente === String(a.id) ? 'bg-[#F8FBFF]' : ''}`}
                            onClick={() => {
                              handleChange('idAmbiente', String(a.id))
                              setAmbienteFilter(a.nombre)
                              setAmbienteListOpen(false)
                            }}
                          >
                            <span className="font-semibold text-[#011140]">{a.nombre}</span>
                            {a.ubicacion && <span className="text-[10px] text-gray-500">{a.ubicacion}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {errors.idAmbiente && <p className="mt-1 text-[10px] text-red-500">{errors.idAmbiente}</p>}
              </div>
            </section>

            {/* Normas generales */}
            <section className={sectionCardClass}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#0439D9]">
                  <ShieldCheck size={14} aria-hidden="true" /> NORMAS GENERALES
                </h3>
                <button
                  type="button"
                  onClick={() => { setShowAddGeneral((v) => !v); if (showAddGeneral) { setEditingGeneralId(null); setNuevaNormaGeneral('') } }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#0439D9] px-3 py-1.5 text-xs font-semibold text-[#0439D9] hover:bg-[#E9F1FF]"
                >
                  <Plus size={14} /> {editingGeneralId ? 'Editando…' : 'Agregar'}
                </button>
              </div>
              {showAddGeneral && (
                <div className="mb-2 flex gap-2">
                  <input value={nuevaNormaGeneral} onChange={(e) => setNuevaNormaGeneral(e.target.value)} placeholder="Escribe la norma…" className={fieldClass()} />
                  <button type="button" onClick={addNormaGeneral} className="shrink-0 rounded-lg bg-[#0439D9] px-3 text-xs font-semibold text-white">
                    {editingGeneralId ? 'Guardar' : 'Añadir'}
                  </button>
                </div>
              )}
              <ul className="space-y-2">
                {normasGenerales.map((n, idx) => (
                  <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-[#E8EEF7] bg-white px-3 py-2.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FEF3C7] text-[10px] font-bold text-[#B45309]">{idx + 1}</span>
                      <p className="text-xs leading-relaxed text-[#011140]">{n.texto}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" aria-label="Editar" onClick={() => { setNuevaNormaGeneral(n.texto); setEditingGeneralId(n.id); setShowAddGeneral(true) }} className="rounded p-1 text-gray-400 hover:text-[#0439D9]"><Pencil size={14} /></button>
                      <button type="button" aria-label="Eliminar" onClick={() => setNormasGenerales((prev) => prev.filter((x) => x.id !== n.id))} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Normas particulares */}
            <section className={sectionCardClass}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#0439D9]">
                  <UserRoundCheck size={14} aria-hidden="true" /> NORMAS PARTICULARES
                </h3>
                <button type="button" onClick={() => setShowAddParticular((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-[#0439D9] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#032db0]">
                  <Plus size={14} /> Agregar
                </button>
              </div>
              {showAddParticular && (
                <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <input value={nuevaParticularEst} onChange={(e) => setNuevaParticularEst(e.target.value)} placeholder="Estudiante / código" className={fieldClass()} />
                  <input value={nuevaParticularTexto} onChange={(e) => setNuevaParticularTexto(e.target.value)} placeholder="Norma o adaptación…" className={fieldClass()} />
                  <button type="button" onClick={addNormaParticular} className="rounded-lg bg-[#0439D9] px-3 py-2 text-xs font-semibold text-white">Añadir</button>
                </div>
              )}
              {normasParticulares.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#B8CBEF] bg-white px-3 py-4 text-center text-[11px] text-gray-400">Sin normas particulares.</p>
              ) : (
                <ul className="space-y-2">
                  {normasParticulares.map((n) => (
                    <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-[#E8EEF7] bg-white px-3 py-2">
                      <p className="text-xs text-[#011140]"><span className="font-semibold">{n.estudiante}:</span> {n.texto}</p>
                      <button type="button" aria-label="Eliminar" onClick={() => setNormasParticulares((prev) => prev.filter((x) => x.id !== n.id))} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {generalError && (
              <div className="flex items-start rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3">
                <CircleAlert className="mr-2 mt-0.5 shrink-0 text-[#B91C1C]" size={18} />
                <p className="text-xs text-[#B91C1C]">{generalError}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <Check className="mr-2 mt-0.5 shrink-0 text-emerald-700" size={18} />
                <p className="text-xs text-emerald-800">Examen actualizado correctamente.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#e3eaf1] bg-[#f8fbff] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden items-center gap-1.5 text-[11px] text-gray-400 sm:flex">
                <Lock size={12} aria-hidden="true" /> Cambios auditados en SIGEX.
              </p>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:gap-3">
                <button type="button" onClick={handleClose} disabled={saving} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#011140] hover:bg-gray-50 disabled:opacity-50 sm:w-auto">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:opacity-60 sm:w-auto">
                  {!saving && <Check size={16} aria-hidden="true" />}
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
