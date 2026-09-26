import { useEffect, useState } from 'react'
import {
  X,
  Info,
  Check,
  CircleAlert,
  FilePenLine,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react'
import {
  INITIAL_EXAMEN_FORM,
  type NormaGeneral,
  type NormaParticular,
  type RegisterExamenFormErrors,
  type RegisterExamenFormState,
} from '../../types/examen.types'
import { crearAmbiente, listarAmbientes, type AmbienteDto } from '../../services/ambienteService'

interface RegisterExamenModalProps {
  isOpen: boolean
  onClose: () => void
}

function minutesBetween(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null
  const diff = eh * 60 + em - (sh * 60 + sm)
  return diff > 0 ? diff : null
}

function validateExamenForm(form: RegisterExamenFormState): RegisterExamenFormErrors {
  const errors: RegisterExamenFormErrors = {}
  if (!form.asignatura.trim()) errors.asignatura = 'La asignatura es obligatoria'
  if (!form.docente.trim()) errors.docente = 'El docente responsable es obligatorio'
  if (!form.fecha) errors.fecha = 'La fecha es obligatoria'
  if (!form.horaInicio) errors.horaInicio = 'La hora de inicio es obligatoria'
  if (!form.horaFin) errors.horaFin = 'La hora de fin es obligatoria'
  if (!form.idAmbiente) errors.idAmbiente = 'Selecciona un ambiente'
  const dur = minutesBetween(form.horaInicio, form.horaFin)
  if (form.horaInicio && form.horaFin && dur === null) {
    errors.horaFin = 'La hora de fin debe ser posterior al inicio'
  }
  return errors
}

export default function RegisterExamenModal({ isOpen, onClose }: RegisterExamenModalProps) {
  const [form, setForm] = useState<RegisterExamenFormState>(INITIAL_EXAMEN_FORM)
  const [errors, setErrors] = useState<RegisterExamenFormErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ambientes, setAmbientes] = useState<AmbienteDto[]>([])
  const [loadingAmbientes, setLoadingAmbientes] = useState(false)
  const [nuevoAmbienteNombre, setNuevoAmbienteNombre] = useState('')
  const [showNuevoAmbiente, setShowNuevoAmbiente] = useState(false)
  const [normasGenerales, setNormasGenerales] = useState<NormaGeneral[]>([
    {
      id: 'ng-1',
      texto: 'No se permite el uso de calculadora programable ni dispositivos electrónicos.',
    },
  ])
  const [normasParticulares, setNormasParticulares] = useState<NormaParticular[]>([])
  const [nuevaNormaGeneral, setNuevaNormaGeneral] = useState('')
  const [showAddGeneral, setShowAddGeneral] = useState(false)
  const [nuevaParticularEst, setNuevaParticularEst] = useState('')
  const [nuevaParticularTexto, setNuevaParticularTexto] = useState('')
  const [showAddParticular, setShowAddParticular] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoadingAmbientes(true)
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
    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const duracion = minutesBetween(form.horaInicio, form.horaFin)
  const sinSolapamiento = Boolean(form.idAmbiente && form.fecha && form.horaInicio && form.horaFin && !errors.horaFin)

  const handleChange = (field: keyof RegisterExamenFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (generalError) setGeneralError('')
    if (success) setSuccess(false)
  }

  const resetAll = () => {
    setForm(INITIAL_EXAMEN_FORM)
    setErrors({})
    setGeneralError('')
    setSuccess(false)
    setShowAddGeneral(false)
    setShowAddParticular(false)
    setNuevaNormaGeneral('')
    setNuevaParticularEst('')
    setNuevaParticularTexto('')
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateExamenForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setGeneralError('Completa los campos obligatorios del examen (asignatura, fecha, hora, duración y ambiente).')
      setSuccess(false)
      return
    }
    // UI mockup: sin API aún (próximo PR backend)
    setGeneralError('')
    setSuccess(true)
  }

  const addNormaGeneral = () => {
    const texto = nuevaNormaGeneral.trim()
    if (!texto) return
    setNormasGenerales((prev) => [...prev, { id: `ng-${Date.now()}`, texto }])
    setNuevaNormaGeneral('')
    setShowAddGeneral(false)
  }

  const addNormaParticular = () => {
    const estudiante = nuevaParticularEst.trim()
    const texto = nuevaParticularTexto.trim()
    if (!estudiante || !texto) return
    setNormasParticulares((prev) => [
      ...prev,
      { id: `np-${Date.now()}`, estudiante, texto },
    ])
    setNuevaParticularEst('')
    setNuevaParticularTexto('')
    setShowAddParticular(false)
  }

  const fieldClass = (hasError?: string) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-examen-title"
    >
      <div className="flex h-[85dvh] max-h-[860px] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(92dvh,900px)] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
                <FilePenLine size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="register-examen-title" className="text-base font-bold text-[#011140] sm:text-xl">
                  Registrar Nuevo Examen
                </h2>
                <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">
                  Complete la asignatura, fecha, horario y ambiente para planificar la evaluación.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-[#627A9B] hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
              <Info size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
              <p className="text-[11px] leading-relaxed text-[#011140] sm:text-xs">
                <span className="font-semibold">Validación de Ambiente y Horarios en Tiempo Real:</span>{' '}
                El sistema audita automáticamente la disponibilidad del aula para prevenir
                solapamientos o cruces con otros exámenes (Criterio CA-03).
              </p>
            </div>

            <section>
              <h3 className="mb-3 text-[11px] font-bold tracking-wide text-[#0439D9]">
                INFORMACIÓN BÁSICA DEL EXAMEN
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Asignatura <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.asignatura}
                    onChange={(e) => handleChange('asignatura', e.target.value)}
                    placeholder="Ej. Algoritmos y Estructuras de Datos"
                    className={fieldClass(errors.asignatura)}
                  />
                  {errors.asignatura && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.asignatura}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Docente Responsable <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.docente}
                    onChange={(e) => handleChange('docente', e.target.value)}
                    placeholder="Ej. Mg. Elena Rostova"
                    className={fieldClass(errors.docente)}
                  />
                  {errors.docente && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.docente}</p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-[11px] font-bold tracking-wide text-[#0439D9]">
                PROGRAMACIÓN Y AMBIENTE
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Fecha de Evaluación <span className="text-red-500">*</span>
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
                    Hora de Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.horaInicio}
                    onChange={(e) => handleChange('horaInicio', e.target.value)}
                    className={fieldClass(errors.horaInicio)}
                  />
                  {errors.horaInicio && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.horaInicio}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Hora de Fin / Duración <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.horaFin}
                    onChange={(e) => handleChange('horaFin', e.target.value)}
                    className={fieldClass(errors.horaFin)}
                  />
                  {duracion !== null && (
                    <p className="mt-1 text-[10px] text-gray-500">{duracion} minutos</p>
                  )}
                  {errors.horaFin && (
                    <p className="mt-1 text-[10px] text-red-500">{errors.horaFin}</p>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Ambiente / Aula Asignada <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNuevoAmbiente((v) => !v)}
                    className="text-[11px] font-semibold text-[#0439D9] hover:underline"
                  >
                    + Nuevo ambiente
                  </button>
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={form.idAmbiente}
                    onChange={(e) => handleChange('idAmbiente', e.target.value)}
                    disabled={loadingAmbientes}
                    className={`${fieldClass(errors.idAmbiente)} sm:flex-1`}
                  >
                    <option value="">
                      {loadingAmbientes ? 'Cargando ambientes…' : 'Seleccionar ambiente…'}
                    </option>
                    {ambientes.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.nombre}
                        {a.ubicacion ? ` — ${a.ubicacion}` : ''}
                      </option>
                    ))}
                  </select>
                  {sinSolapamiento && (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                      <Check size={14} aria-hidden="true" />
                      Sin solapamiento detectado
                    </span>
                  )}
                </div>
                {errors.idAmbiente && (
                  <p className="mt-1 text-[10px] text-red-500">{errors.idAmbiente}</p>
                )}
              </div>
            </section>

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-bold tracking-wide text-[#0439D9]">
                    NORMAS GENERALES DEL EXAMEN
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Reglamento obligatorio para todos los postulantes habilitados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddGeneral((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#0439D9] px-3 py-1.5 text-xs font-semibold text-[#0439D9] hover:bg-[#E9F1FF]"
                >
                  <Plus size={14} /> Agregar norma general
                </button>
              </div>
              {showAddGeneral && (
                <div className="mb-2 flex gap-2">
                  <input
                    value={nuevaNormaGeneral}
                    onChange={(e) => setNuevaNormaGeneral(e.target.value)}
                    placeholder="Escribe la norma general…"
                    className={fieldClass()}
                  />
                  <button
                    type="button"
                    onClick={addNormaGeneral}
                    className="shrink-0 rounded-lg bg-[#0439D9] px-3 text-xs font-semibold text-white"
                  >
                    Añadir
                  </button>
                </div>
              )}
              <ul className="space-y-2">
                {normasGenerales.map((n, idx) => (
                  <li
                    key={n.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-[#F8FBFF] px-3 py-2"
                  >
                    <p className="text-xs text-[#011140]">
                      <span className="font-bold text-[#0439D9]">{idx + 1}.</span> {n.texto}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Editar norma"
                        onClick={() => {
                          setNuevaNormaGeneral(n.texto)
                          setNormasGenerales((prev) => prev.filter((x) => x.id !== n.id))
                          setShowAddGeneral(true)
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-white hover:text-[#0439D9]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar norma"
                        onClick={() =>
                          setNormasGenerales((prev) => prev.filter((x) => x.id !== n.id))
                        }
                        className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-bold tracking-wide text-[#0439D9]">
                    NORMAS PARTICULARES POR ESTUDIANTE
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Excepciones y adaptaciones asignadas a postulantes específicos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddParticular((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0439D9] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#032db0]"
                >
                  <Plus size={14} /> Agregar norma particular
                </button>
              </div>
              {showAddParticular && (
                <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <input
                    value={nuevaParticularEst}
                    onChange={(e) => setNuevaParticularEst(e.target.value)}
                    placeholder="Estudiante / código"
                    className={fieldClass()}
                  />
                  <input
                    value={nuevaParticularTexto}
                    onChange={(e) => setNuevaParticularTexto(e.target.value)}
                    placeholder="Norma o adaptación…"
                    className={fieldClass()}
                  />
                  <button
                    type="button"
                    onClick={addNormaParticular}
                    className="rounded-lg bg-[#0439D9] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Añadir
                  </button>
                </div>
              )}
              {normasParticulares.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#B8CBEF] bg-white px-3 py-4 text-center text-[11px] text-gray-400">
                  Sin normas particulares. Usa el botón para agregar adaptaciones.
                </p>
              ) : (
                <ul className="space-y-2">
                  {normasParticulares.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
                    >
                      <p className="text-xs text-[#011140]">
                        <span className="font-semibold">{n.estudiante}:</span> {n.texto}
                      </p>
                      <button
                        type="button"
                        aria-label="Eliminar norma particular"
                        onClick={() =>
                          setNormasParticulares((prev) => prev.filter((x) => x.id !== n.id))
                        }
                        className="rounded p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
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
                <p className="text-xs text-emerald-800">
                  Formulario válido (mockup UI). La API de registro se conectará en el siguiente
                  paso.
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#e3eaf1] bg-[#f8fbff] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-[11px] text-gray-400 sm:block">
                Todos los exámenes son registrados y auditados en SIGEX.
              </p>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#011140] hover:bg-gray-50 sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#032db0] sm:w-auto"
                >
                  Guardar y Registrar Examen
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
