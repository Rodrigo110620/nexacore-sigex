import { useCallback, useEffect, useRef, useState } from 'react'
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
  Dot,
  ChevronsDown,
} from 'lucide-react'
import {
  type NormaGeneral,
  type NormaParticular,
  type RegisterExamenFormErrors,
  type RegisterExamenFormState,
} from '../../types/examen.types'
import { crearAmbiente, listarAmbientes, listarAmbientesConDisponibilidad, type AmbienteDto } from '../../services/ambienteService'
import { useAuth } from '../../context/AuthContext'
import AulasAdicionalesEditor from './AulasAdicionalesEditor'
import { actualizarExamen, type ExamenDto, type ModoReparto } from '../../services/examenService'
import { listarEstudiantesExamen, type EstudianteHabilitacionDto } from '../../services/habilitacionService'
import {
  detalleAmbiente,
  formatFechaDisplay,
  isNetworkError,
  isOffline,
  minutesBetween,
  parseHora24,
  sanitizeNormaInput,
  sanitizeAmbienteInput,
  validateAmbienteNombre,
  mensajeErrorCrearAmbiente,
  toTitleCaseTexto,
  NORMA_MIN,
  NORMA_MAX,
  AMBIENTE_MAX,
  todayISO,
  validateExamenForm,
  validateNormaTexto,
  formatHora24,
  filtrarAmbientes,
  examFieldClass,
  EXAM_SECTION_CARD_CLASS,
  aulasSinAforo,
  aulasAdicionalesOcupadas,
} from '../../utils/examFormUtils'
import AsignaturaAutocomplete from './AsignaturaAutocomplete'
import DocenteAutocomplete from './DocenteAutocomplete'
import EstudianteNormaAutocomplete, { type OpcionEstudiante } from './EstudianteNormaAutocomplete'
import HoraSelector from './HoraSelector'
import { ConfirmDiscardDialog, NormaTexto, OfflineDialog } from './ExamFormDialogs'

interface EditExamenModalProps {
  isOpen: boolean
  examen: ExamenDto | null
  onClose: () => void
  onSuccess?: (actualizado: ExamenDto) => void
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Al editar, la norma particular solo puede asignarse a un asociado al examen que no esté inhabilitado. */
function filtrarHabilitables(lista: EstudianteHabilitacionDto[], criterio: string): OpcionEstudiante[] {
  const q = sinTildes(criterio.trim())
  return lista
    .filter((e) => e.estadoHabilitacion !== 'NO_HABILITADO')
    .filter((e) => [`${e.nombre} ${e.apellidos}`, e.ci, e.codigoSis].some((c) => sinTildes(c ?? '').includes(q)))
    .slice(0, 8)
    .map((e) => ({
      id: e.idEstudiante,
      nombre: `${e.nombre} ${e.apellidos}`,
      detalle: `CI ${e.ci} · Cód. ${e.codigoSis} · ${e.estadoHabilitacion === 'HABILITADO' ? 'Habilitado' : 'Pendiente'}`,
    }))
}

/** Calcula horaFin a partir de horaInicio + duracionMinutos */
function calcHoraFin(horaInicio: string, duracionMinutos: number): string {
  const parsed = parseHora24(horaInicio)
  if (!parsed) return ''
  const totalMin = parsed.h * 60 + parsed.m + duracionMinutos
  return formatHora24(Math.floor(totalMin / 60) % 24, totalMin % 60)
}

export default function EditExamenModal({ isOpen, examen, onClose, onSuccess }: EditExamenModalProps) {
  // Solo ADMIN da de alta ambientes; el resto elige del catálogo.
  const esAdmin = useAuth().roles.includes('ADMIN')
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
  const [ambienteError, setAmbienteError] = useState('')
  const [aulasAdicionales, setAulasAdicionales] = useState<number[]>([])
  const [modoReparto, setModoReparto] = useState<ModoReparto>('ALFABETICO')
  const [normasGenerales, setNormasGenerales] = useState<NormaGeneral[]>([])
  const [normasParticulares, setNormasParticulares] = useState<NormaParticular[]>([])
  const [nuevaNormaGeneral, setNuevaNormaGeneral] = useState('')
  const [showAddGeneral, setShowAddGeneral] = useState(false)
  const [nuevaParticularEst, setNuevaParticularEst] = useState('')
  const [nuevaParticularIdEst, setNuevaParticularIdEst] = useState<number | null>(null)
  const [nuevaParticularTexto, setNuevaParticularTexto] = useState('')
  const [showAddParticular, setShowAddParticular] = useState(false)
  const [editingGeneralId, setEditingGeneralId] = useState<string | null>(null)
  const [editingParticularId, setEditingParticularId] = useState<string | null>(null)
  const [asociados, setAsociados] = useState<EstudianteHabilitacionDto[]>([])
  /** Evita un segundo envío antes de que React vuelva a pintar el botón deshabilitado. */
  const submittingRef = useRef(false)
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

  // Pre-populate form when examen changes
  useEffect(() => {
    if (!examen || !isOpen) return
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
      setAulasAdicionales((examen.aulas ?? []).filter((a) => a.orden > 0).map((a) => a.idAmbiente))
      setModoReparto(examen.modoReparto ?? 'ALFABETICO')
      setNormasGenerales(
        (examen.normasGenerales ?? []).map((t, i) => ({ id: `ng-${i}`, texto: t })),
      )
      setNormasParticulares(
        (examen.normasParticulares ?? []).map((n, i) => ({
          id: `np-${i}`,
          estudiante: n.estudiante,
          texto: n.texto,
          idEstudiante: n.idEstudiante ?? null,
        })),
      )
      setErrors({})
      setGeneralError('')
      setSuccess(false)
      setAsignaturaOk(true)
      setDocenteOk(true)
      setIdMateria(examen.idMateria ?? null)
      setIdDocente(examen.idDocente ?? null)
      setDirty(false)
      setConfirmClose(false)
      setOfflineOpen(false)
      setExpandedNormas({})
      setNormaGeneralError('')
      setNormaParticularError('')
      setNuevaNormaGeneral('')
      setShowAddGeneral(false)
      setEditingGeneralId(null)
      setNuevaParticularEst('')
      setNuevaParticularIdEst(null)
      setNuevaParticularTexto('')
      setShowAddParticular(false)
      setEditingParticularId(null)
      submittingRef.current = false
      setNuevoAmbienteNombre('')
      setAmbienteError('')
      setShowNuevoAmbiente(false)
    }, 0)
    return () => window.clearTimeout(handle)
  }, [examen, isOpen])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!examen || !isOpen) return
    let cancelled = false
    listarEstudiantesExamen(examen.idExamen, examen.idParalelo)
      .then((lista) => { if (!cancelled) setAsociados(lista) })
      .catch(() => { if (!cancelled) setAsociados([]) })
    return () => { cancelled = true }
  }, [examen, isOpen])

  const buscarHabilitables = useCallback(
    (criterio: string) => Promise.resolve(filtrarHabilitables(asociados, criterio)),
    [asociados],
  )

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
        // Si la disponibilidad ya llegó, no la pisa con la lista sin "Ocupado".
        .then((data) => { if (!cancelled) setAmbientes((prev) => (prev.some((a) => a.disponible !== undefined) ? prev : data)) })
        .catch(() => { if (!cancelled) setGeneralError('No se pudo cargar el catálogo de ambientes.') })
        .finally(() => { if (!cancelled) setLoadingAmbientes(false) })
    }, 0)
    return () => { cancelled = true; window.clearTimeout(handle) }
  }, [isOpen])

  // Refrescar disponibilidad cuando cambian fecha, hora o duración (excluyendo el propio examen)
  useEffect(() => {
    const dur = minutesBetween(form.horaInicio, form.horaFin)
    if (!form.fecha || !form.horaInicio || dur === null || !examen) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      listarAmbientesConDisponibilidad({
        fecha: form.fecha,
        horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio,
        duracionMinutos: dur,
        idExamenExcluido: examen.idExamen,
        idParaleloExcluido: examen.idParalelo,
      })
        .then((data) => { if (!cancelled) setAmbientes(data) })
        .catch(() => { /* silencioso */ })
    }, 400)
    return () => { cancelled = true; window.clearTimeout(handle) }
  }, [form.fecha, form.horaInicio, form.horaFin, examen])

  if (!isOpen || !examen) return null

  const duracion = minutesBetween(form.horaInicio, form.horaFin)
  const ambienteSeleccionado = ambientes.find((a) => String(a.id) === form.idAmbiente)
  // Si el aula principal pasa a ser una de las adicionales, deja de contarse dos veces.
  const adicionalesVigentes = aulasAdicionales.filter((idAula) => String(idAula) !== form.idAmbiente)
  const horarioCompleto = Boolean(form.fecha && form.horaInicio && form.horaFin && duracion !== null)
  const ambienteOcupado = horarioCompleto && ambienteSeleccionado?.disponible === false
  const sinSolapamientoUi = horarioCompleto && ambienteSeleccionado?.disponible === true
  /** Normas ya guardadas: al editarlas se conserva la versión anterior como eliminada (historial). */
  const generalGuardada = (texto: string) => (examen.normasGenerales ?? []).includes(texto)
  const particularGuardada = (n: NormaParticular) =>
    (examen.normasParticulares ?? []).some((p) => p.estudiante === n.estudiante && p.texto === n.texto)
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

  const handleClose = () => {
    if (saving) return
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current || success) return
    if (isOffline()) {
      setOfflineOpen(true)
      return
    }
    const nextErrors = validateExamenForm(form, {
      asignaturaSeleccionada: asignaturaOk,
      docenteSeleccionado: docenteOk,
      validarPasado:
        form.fecha !== examen.fecha || form.horaInicio !== (examen.horaInicio ?? '').slice(0, 5),
      ambienteOcupado,
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setGeneralError('Completa los campos obligatorios.')
      return
    }
    const dur = minutesBetween(form.horaInicio, form.horaFin)
    if (dur === null) { setGeneralError('La hora de fin debe ser posterior al inicio.'); return }
    const ocupadas = aulasAdicionalesOcupadas(ambientes, adicionalesVigentes)
    if (ocupadas.length > 0) {
      setGeneralError(`${ocupadas.length === 1 ? 'El aula' : 'Las aulas'} ${ocupadas.join(', ')} ${
        ocupadas.length === 1 ? 'está ocupada' : 'están ocupadas'
      } en ese horario. Quítala del examen o cambia el horario.`)
      return
    }
    const sinAforo = aulasSinAforo(ambientes, form.idAmbiente, adicionalesVigentes)
    if (sinAforo.length > 0) {
      setGeneralError(`Para repartir a los estudiantes en varias aulas, registra el aforo de: ${sinAforo.join(', ')}.`)
      return
    }

    submittingRef.current = true
    setSaving(true)
    setGeneralError('')
    try {
      const actualizado = await actualizarExamen(examen.idExamen, examen.idParalelo, {
        asignatura: toTitleCaseTexto(form.asignatura.trim()),
        docente: toTitleCaseTexto(form.docente.trim()),
        fecha: form.fecha,
        horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio,
        duracionMinutos: dur,
        idAmbiente: Number(form.idAmbiente),
        normasGenerales: normasGenerales.filter((n) => n.activa !== false).map((n) => n.texto),
        normasParticulares: normasParticulares.filter((n) => n.activa !== false).map((n) => ({
          estudiante: n.estudiante,
          texto: n.texto,
          idEstudiante: n.idEstudiante ?? null,
        })),
        idMateria,
        idDocente,
        normasGeneralesEliminadas: normasGenerales.filter((n) => n.activa === false).map((n) => n.texto),
        normasParticularesEliminadas: normasParticulares.filter((n) => n.activa === false).map((n) => ({
          estudiante: n.estudiante,
          texto: n.texto,
          idEstudiante: n.idEstudiante ?? null,
        })),
        idAmbientesAdicionales: adicionalesVigentes,
        modoReparto,
      })
      setSuccess(true)
      setDirty(false)
      onSuccess?.(actualizado)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setSuccess(false)
        onClose()
        closeTimerRef.current = null
      }, 900)
    } catch (err: unknown) {
      // Solo si falló se permite reintentar; tras guardar el botón queda bloqueado.
      submittingRef.current = false
      if (isNetworkError(err)) {
        setOfflineOpen(true)
        return
      }
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

  const otrasNormasGenerales = () =>
    normasGenerales
      .filter((n) => n.activa !== false && n.id !== editingGeneralId)
      .map((n) => n.texto)

  const guardarAmbiente = async () => {
    const nombre = nuevoAmbienteNombre.trim().toUpperCase()
    const error = validateAmbienteNombre(nombre, ambientes)
    setAmbienteError(error ?? '')
    if (error) return
    try {
      const creado = await crearAmbiente({ nombre })
      setAmbientes((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      handleChange('idAmbiente', String(creado.id))
      setAmbienteFilter(creado.nombre)
      setAmbienteListOpen(false)
      setNuevoAmbienteNombre('')
      setShowNuevoAmbiente(false)
    } catch (err) {
      setAmbienteError(mensajeErrorCrearAmbiente(err))
    }
  }

  const addNormaGeneral = () => {
    const texto = nuevaNormaGeneral.trim()
    const otras = otrasNormasGenerales()
    const error = validateNormaTexto(texto, otras)
    setNormaGeneralError(error ?? '')
    if (error) return
    setDirty(true)
    if (editingGeneralId) {
      setNormasGenerales((prev) => prev.flatMap((n) => {
        if (n.id !== editingGeneralId) return [n]
        return generalGuardada(n.texto)
          ? [{ ...n, activa: false }, { id: `ng-${Date.now()}`, texto }]
          : [{ ...n, texto }]
      }))
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
    const otras = normasParticulares
      .filter((n) => n.activa !== false && n.id !== editingParticularId && n.idEstudiante === nuevaParticularIdEst)
      .map((n) => n.texto)
    const error = !estudiante
      ? 'Indica el estudiante'
      : nuevaParticularIdEst === null
        ? 'Selecciona un estudiante asociado al examen de las sugerencias'
        : validateNormaTexto(texto, otras)
    setNormaParticularError(error ?? '')
    if (error) return
    setDirty(true)
    const datos = { estudiante, idEstudiante: nuevaParticularIdEst, texto }
    if (editingParticularId) {
      setNormasParticulares((prev) => prev.flatMap((n) => {
        if (n.id !== editingParticularId) return [n]
        return particularGuardada(n)
          ? [{ ...n, activa: false }, { id: `np-${Date.now()}`, ...datos }]
          : [{ ...n, ...datos }]
      }))
    } else {
      setNormasParticulares((prev) => [...prev, { id: `np-${Date.now()}`, ...datos }])
    }
    cerrarFormParticular()
  }

  const cerrarFormParticular = () => {
    setNuevaParticularEst('')
    setNuevaParticularIdEst(null)
    setNuevaParticularTexto('')
    setEditingParticularId(null)
    setNormaParticularError('')
    setShowAddParticular(false)
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-examen-title"
    >
      <div className="relative flex h-[70dvh] max-h-[680px] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl sm:border-gray-100">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="min-w-0 flex-1">
            <div aria-hidden="true" className="mx-auto mb-3 h-1 w-11 rounded-full bg-[#C4D2E7] sm:hidden" />
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
                <FilePenLine size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="edit-examen-title" className="text-sm font-bold text-[#011140]">
                  Editar Examen
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Modifica la asignatura, fecha, horario, ambiente o normas de la evaluación.
                </p>
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

        <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
              <Info size={16} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
              <p className="text-[11px] leading-relaxed text-[#011140] sm:text-xs">
                <span className="font-semibold">Edición de examen:</span>{' '}
                El sistema revalidará la disponibilidad del aula y el horario al guardar los cambios.
              </p>
            </div>

            <section className={sectionCardClass}>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-[#011140]">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />
                1. INFORMACIÓN BÁSICA DEL EXAMEN
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="editar-asignatura" className="mb-1 block text-xs font-medium text-[#011140]">
                    Asignatura <span className="text-red-500">*</span>
                  </label>
                  <AsignaturaAutocomplete
                    id="editar-asignatura"
                    value={form.asignatura}
                    error={errors.asignatura}
                    onChange={(value) => handleChange('asignatura', value)}
                    onSelect={(materia) => {
                      handleChange('asignatura', materia.nombre)
                      setAsignaturaOk(true)
                      setIdMateria(materia.id)
                    }}
                  />
                  {errors.asignatura && <p className="mt-1 text-[10px] text-red-500">{errors.asignatura}</p>}
                </div>
                <div className="min-w-0">
                  <label htmlFor="editar-docente" className="mb-1 block text-xs font-medium text-[#011140]">
                    Docente Responsable <span className="text-red-500">*</span>
                  </label>
                  <DocenteAutocomplete
                    id="editar-docente"
                    value={form.docente}
                    error={errors.docente}
                    onChange={(value) => handleChange('docente', value)}
                    onSelect={(docente) => {
                      handleChange('docente', `${docente.nombre} ${docente.apellidos}`.trim())
                      setDocenteOk(true)
                      setIdDocente(docente.id)
                    }}
                  />
                  {errors.docente && <p className="mt-1 text-[10px] text-red-500">{errors.docente}</p>}
                </div>
              </div>
            </section>

            <section className={sectionCardClass}>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-[#011140]">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0439D9]" aria-hidden="true" />
                2. PROGRAMACIÓN Y AMBIENTE
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-medium text-[#011140]">
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
                  <label htmlFor="editar-hora-inicio" className="mb-1 block text-xs font-medium text-[#011140]">
                    Hora de Inicio <span className="text-red-500">*</span>
                  </label>
                  <HoraSelector
                    id="editar-hora-inicio"
                    label="Hora de inicio"
                    value={form.horaInicio}
                    error={errors.horaInicio}
                    onChange={(v) => handleChange('horaInicio', v)}
                  />
                  {errors.horaInicio && <p className="mt-1 text-[10px] text-red-500">{errors.horaInicio}</p>}
                </div>
                <div className="min-w-0">
                  <label htmlFor="editar-hora-fin" className="mb-1 block text-xs font-medium text-[#011140]">
                    Hora de Fin / Duración <span className="text-red-500">*</span>
                  </label>
                  <HoraSelector
                    id="editar-hora-fin"
                    label="Hora de fin"
                    value={form.horaFin}
                    error={errors.horaFin}
                    onChange={(v) => handleChange('horaFin', v)}
                  />
                  {duracion !== null && <p className="mt-1 text-[10px] text-gray-500">{duracion} minutos</p>}
                  {errors.horaFin && <p className="mt-1 text-[10px] text-red-500">{errors.horaFin}</p>}
                </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-[#011140]" htmlFor="edit-ambiente-buscar">
                    Ambiente / Aula Asignada <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {sinSolapamientoUi && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        <Check size={12} aria-hidden="true" /> Sin solapamiento detectado
                      </span>
                    )}
                    {ambienteOcupado && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
                        <CircleAlert size={12} aria-hidden="true" /> Ambiente ocupado
                      </span>
                    )}
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowNuevoAmbiente((v) => !v)}
                        className="text-[11px] font-semibold text-[#0439D9] hover:underline"
                      >
                        + Nuevo ambiente
                      </button>
                    )}
                  </div>
                </div>
                {esAdmin && showNuevoAmbiente && (
                  <div className="mb-2">
                    <div className="flex gap-2">
                      <input
                        value={nuevoAmbienteNombre}
                        onChange={(e) => {
                          setNuevoAmbienteNombre(sanitizeAmbienteInput(e.target.value))
                          if (ambienteError) setAmbienteError('')
                        }}
                        placeholder="Código o nombre (ej. 692F)"
                        maxLength={AMBIENTE_MAX}
                        aria-invalid={Boolean(ambienteError)}
                        className={fieldClass(ambienteError)}
                      />
                      <button
                        type="button"
                        onClick={guardarAmbiente}
                        className="shrink-0 rounded-lg bg-[#0439D9] px-3 text-xs font-semibold text-white"
                      >
                        Guardar
                      </button>
                    </div>
                    <div className="mt-1 flex justify-between gap-2 text-[10px]">
                      <span className="text-red-600">{ambienteError}</span>
                      <span className="shrink-0 text-gray-400">{nuevoAmbienteNombre.length}/{AMBIENTE_MAX}</span>
                    </div>
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
                          : `${ambienteSeleccionado.nombre} — ${detalleAmbiente(ambienteSeleccionado)}`
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
                            aria-disabled={a.disponible === false}
                            disabled={a.disponible === false}
                            className={`flex w-full flex-col px-3 py-2 text-left text-xs ${
                              a.disponible === false ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#E9F1FF]'
                            } ${form.idAmbiente === String(a.id) ? 'bg-[#F8FBFF]' : ''}`}
                            onClick={() => {
                              if (a.disponible === false) return
                              handleChange('idAmbiente', String(a.id))
                              setAmbienteFilter(a.nombre)
                              setAmbienteListOpen(false)
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#011140]">{a.nombre}</span>
                              {a.disponible !== undefined && (
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  a.disponible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                }`}>
                                  {a.disponible ? 'Disponible' : 'Ocupado'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500">{detalleAmbiente(a)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {errors.idAmbiente ? (
                  <p className="mt-1 text-[10px] text-red-500">{errors.idAmbiente}</p>
                ) : ambienteOcupado && (
                  <p className="mt-1 text-[10px] text-red-500">
                    El ambiente está ocupado en ese horario. Elige otro ambiente u horario.
                  </p>
                )}
                <AulasAdicionalesEditor
                  ambientes={ambientes}
                  idPrincipal={form.idAmbiente}
                  value={adicionalesVigentes}
                  onChange={(ids) => { setAulasAdicionales(ids); setDirty(true) }}
                  esAdmin={esAdmin}
                  modoReparto={modoReparto}
                  onModoRepartoChange={(modo) => { setModoReparto(modo); setDirty(true) }}
                  onAforoGuardado={(actualizado) => setAmbientes((prev) => prev.map((a) => (
                    a.id === actualizado.id ? { ...a, capacidad: actualizado.capacidad } : a
                  )))}
                />
              </div>
            </section>

            <section className={sectionCardClass}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#011140]">
                    <ShieldCheck size={14} className="shrink-0" aria-hidden="true" />
                    <span className="leading-tight">NORMAS GENERALES DEL EXAMEN</span>
                  </h3>
                  <p className="hidden text-[10px] text-gray-500 min-[960px]:block">
                    Reglamento obligatorio para todos los postulantes habilitados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddGeneral((v) => !v); if (showAddGeneral) { setEditingGeneralId(null); setNuevaNormaGeneral('') } }}
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
                    <input value={nuevaNormaGeneral} onChange={(e) => { const valor = sanitizeNormaInput(e.target.value); setNuevaNormaGeneral(valor); if (normaGeneralError) setNormaGeneralError(validateNormaTexto(valor.trim(), otrasNormasGenerales()) ?? '') }} onBlur={() => setNuevaNormaGeneral((v) => v.trim())} placeholder={`Escribe la norma… (${NORMA_MIN}–${NORMA_MAX})`} maxLength={NORMA_MAX} aria-invalid={Boolean(normaGeneralError)} className={fieldClass(normaGeneralError)} />
                    <button type="button" onClick={addNormaGeneral} className="shrink-0 rounded-lg bg-[#0439D9] px-3 text-xs font-semibold text-white">
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
                  <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-[#E8EEF7] bg-white px-3 py-2.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FEF3C7] text-[10px] font-bold text-[#B45309]">{idx + 1}</span>
                      <NormaTexto
                        texto={n.texto}
                        expanded={Boolean(expandedNormas[n.id])}
                        onToggle={() => setExpandedNormas((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
                      />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" aria-label="Editar" onClick={() => { setNuevaNormaGeneral(n.texto); setEditingGeneralId(n.id); setShowAddGeneral(true) }} className="rounded p-1 text-gray-400 hover:text-[#0439D9]"><Pencil size={14} /></button>
                      <button type="button" aria-label="Eliminar" onClick={() => {
                        setDirty(true)
                        setNormasGenerales((prev) => prev.map((x) => (x.id === n.id ? { ...x, activa: false } : x)))
                      }} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={sectionCardClass}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#011140]">
                    <UserRoundCheck size={14} className="shrink-0" aria-hidden="true" />
                    <span className="leading-tight">NORMAS PARTICULARES POR ESTUDIANTE</span>
                  </h3>
                  <p className="hidden text-[10px] text-gray-500 min-[960px]:block">
                    Excepciones y adaptaciones asignadas a postulantes específicos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (showAddParticular ? cerrarFormParticular() : setShowAddParticular(true))}
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
                    <EstudianteNormaAutocomplete
                      id="editar-norma-estudiante"
                      value={nuevaParticularEst}
                      placeholder="Estudiante asociado al examen…"
                      buscar={buscarHabilitables}
                      onChange={(v) => {
                        setNuevaParticularEst(v)
                        setNuevaParticularIdEst(null)
                        if (normaParticularError) setNormaParticularError('')
                      }}
                      onSelect={(est) => {
                        setNuevaParticularEst(est.nombre)
                        setNuevaParticularIdEst(est.id)
                        if (normaParticularError) setNormaParticularError('')
                      }}
                    />
                    <input value={nuevaParticularTexto} onChange={(e) => { setNuevaParticularTexto(sanitizeNormaInput(e.target.value)); if (normaParticularError) setNormaParticularError('') }} onBlur={() => setNuevaParticularTexto((v) => v.trim())} placeholder={`Norma o adaptación… (${NORMA_MIN}–${NORMA_MAX})`} maxLength={NORMA_MAX} aria-invalid={Boolean(normaParticularError)} className={fieldClass(normaParticularError)} />
                    <button type="button" onClick={addNormaParticular} className="rounded-lg bg-[#0439D9] px-3 py-2 text-xs font-semibold text-white">
                      {editingParticularId ? 'Guardar' : 'Añadir'}
                    </button>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 text-[10px]">
                    <span className="text-red-600">{normaParticularError}</span>
                    <span className="shrink-0 text-gray-400">{nuevaParticularTexto.length}/{NORMA_MAX}</span>
                  </div>
                </div>
              )}
              {normasParticulares.filter((n) => n.activa !== false).length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#B8CBEF] bg-white px-3 py-4 text-center text-[11px] text-gray-400">Sin normas particulares.</p>
              ) : (
                <ul className="space-y-2">
                  {normasParticulares.filter((n) => n.activa !== false).map((n, idx) => (
                    <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-[#E8EEF7] bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-[#627A9B]">{idx + 1}. {n.estudiante}</p>
                        <NormaTexto
                          texto={n.texto}
                          expanded={Boolean(expandedNormas[n.id])}
                          onToggle={() => setExpandedNormas((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
                        />
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" aria-label="Editar norma particular" onClick={() => {
                          setNuevaParticularEst(n.estudiante)
                          setNuevaParticularIdEst(n.idEstudiante ?? null)
                          setNuevaParticularTexto(n.texto)
                          setEditingParticularId(n.id)
                          setNormaParticularError('')
                          setShowAddParticular(true)
                        }} className="rounded p-1 text-gray-400 hover:text-[#0439D9]"><Pencil size={14} /></button>
                        <button type="button" aria-label="Eliminar" onClick={() => {
                          setDirty(true)
                          setNormasParticulares((prev) => prev.map((x) => (x.id === n.id ? { ...x, activa: false } : x)))
                        }} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

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
                <p className="text-xs text-emerald-800">Examen actualizado correctamente.</p>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-[10px] text-gray-400 sm:flex sm:items-center">
                <span className="text-[#3B82F6]"><Dot /></span> Campos con (*) son mandatorios
              </p>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#C9D7EC] px-4 py-2 text-sm font-semibold text-[#45628D] transition-colors hover:bg-gray-100 disabled:opacity-50 sm:w-auto sm:px-5 sm:py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || success}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#0439D9]/20 transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5 sm:py-2.5"
                >
                  {saving ? (
                    'Guardando…'
                  ) : (
                    <>
                      <span className="sm:hidden">Guardar Cambios</span>
                      <span className="hidden items-center gap-2 sm:flex">
                        <Check size={18} strokeWidth={4} aria-hidden="true" className="shrink-0" />
                        Guardar cambios
                      </span>
                    </>
                  )}
                </button>
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
