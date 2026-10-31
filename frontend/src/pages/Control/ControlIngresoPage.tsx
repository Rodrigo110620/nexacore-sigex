import { normalizarJustificacion, validarJustificacion } from '../../utils/justificacionManual'
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ListChecks, ClipboardList, Gavel, Fingerprint, Ban, ShieldX, UserCheck, CheckCircle2, ChevronLeft, LoaderCircle, X, Building2, Flag } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import { useAuth } from '../../context/AuthContext'
import './ControlIngresoPage.css'
import { autorizarIngreso, denegarIngreso, obtenerContextoControl, obtenerTiposIncidencia } from '../../services/controlIngresoService'
import type { AutorizarIngresoResultado, ContextoControlIngreso, TipoIncidencia } from '../../types/controlIngreso'
import { primerGarabato } from '../../utils/palabras'
import TextoLibreCampo from '../../components/control/TextoLibreCampo'
import { DETALLE_INCIDENCIA, DETALLE_DENEGACION, OBSERVACIONES_CONTROL, validarTextoLibre } from '../../utils/textoLibreValidators'
import { VerificarAmbienteModal } from '../../components/control/VerificarAmbienteModal'
import RazonesInhabilitacion from '../../components/control/RazonesInhabilitacion'
import { NormaTexto } from '../../components/examenes/ExamFormDialogs'
import ResultadoModal, { type Resultado } from '../../components/ui/ResultadoModal'
import { isNetworkError, isOffline } from '../../utils/examFormUtils'
import FotoEstudiante from '../../components/estudiantes/FotoEstudiante'
import AvisoFotoReportada from '../../components/estudiantes/AvisoFotoReportada'
import { obtenerReporteFoto, type ReporteFotoAbierto } from '../../services/fotoRevisionService'
import useEnVivo from '../../hooks/useEnVivo'
import ReportarFotoModal from '../../components/control/ReportarFotoModal'
import ReporteQrDuplicadoModal from '../../components/control/ReporteQrDuplicadoModal'
import { etiquetaCondicion } from '../../utils/condicionEstudiante'
import useTiempoExamen from '../../hooks/useTiempoExamen'
import { aperturaControl, controlSinAbrir, MINUTOS_APERTURA_CONTROL } from '../../utils/tiempoExamen'
import { fechaHoraNumerica } from '../../utils/examenFormat'

const VERIFICACION = 'Identidad biométrica cotejada / Carnet físico verificado'
const MAX_DETALLE_DENEGACION = 500
/** Con esta razón el detalle adicional es obligatorio (BUG-D01). */
const OTRA_RAZON = 'Otra razón'
const ETIQUETA_INCIDENCIA: Record<string, string> = {
  LLEGADA_TARDE: 'Estudiante llegó tarde',
  DOCUMENTO_MAL_ESTADO: 'Documento en mal estado',
  OTRA_INCIDENCIA: 'Otra incidencia',
}
const SIN_CONEXION_AUTORIZAR = 'No se pudo autorizar ni registrar el ingreso porque no hay conexión a Internet. La información ingresada se conserva: vuelve a presionar "Autorizar Ingreso" cuando recuperes la conexión.'
const SIN_CONEXION_DENEGAR = 'No se pudo registrar la denegación porque no hay conexión a Internet. La información ingresada se conserva: vuelve a presionar "Confirmar Denegación" cuando recuperes la conexión.'

/** ISO local con offset: no usar toISOString(), que convierte la hora visible del dispositivo a UTC. */
function horaLocalDelDispositivo() {
  const ahora = new Date()
  const minutos = -ahora.getTimezoneOffset()
  const signo = minutos >= 0 ? '+' : '-'
  const absoluto = Math.abs(minutos)
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
  return `${local}${signo}${String(Math.floor(absoluto / 60)).padStart(2, '0')}:${String(absoluto % 60).padStart(2, '0')}`
}

/** Mensaje del backend (p. ej. una validación 400), o null si no trae uno. */
function mensajeDelServidor(err: unknown): string | null {
  return (err as { response?: { data?: { mensaje?: string } } }).response?.data?.mensaje ?? null
}

const card = 'rounded-xl border border-[#E1E7F0] bg-white p-4 shadow-[0_2px_8px_rgba(1,17,64,.05)] sm:p-5'

function Title({ icon, text }: { n?: number; icon: React.ReactNode; text: string }) {
  return <div className="control-section-title"><span>{icon}</span><h2>{text}</h2></div>
}

function StudentSummary({ctx}: {ctx: ContextoControlIngreso}) {
  return <div className="control-modal-student"><div className="flex items-center gap-3"><FotoEstudiante fotoUrl={ctx.fotoUrl} nombre={ctx.estudiante} iniciales={ctx.estudiante.split(' ').slice(0,2).map(x=>x[0]).join('')} className="control-avatar" ampliable detalle={`Código: ${ctx.codigoSis}`}/><div><p className="text-[9px] uppercase text-[#45628D]">{etiquetaCondicion(ctx.condicion)}</p><p className="text-sm font-bold">{ctx.estudiante}</p><p className="text-[10px] text-[#0439D9]">Cód: {ctx.codigoSis}</p></div></div><div className="my-3 rounded-md bg-white p-2"><p className="text-[9px] uppercase text-[#45628D]">Materia y ambiente</p><p className="text-xs">{ctx.asignatura} · {ctx.ambiente}</p></div><div className="flex justify-between gap-3 text-[10px]"><p>CI: {ctx.documento}</p><p>Carrera: {ctx.carrera || 'No registrada'}</p></div></div>
}

/** Tras registrar, vuelve sola a la identificación para atender al siguiente (se puede cancelar). */
export const VOLVER_A_IDENTIFICAR_MS = 6000

/** Vibración corta al autorizar y doble al denegar, si el celular lo permite. */
function vibrar(autorizado: boolean) {
  try { navigator.vibrate?.(autorizado ? 40 : [60, 50, 60]) } catch { /* sin vibración */ }
}

/** Ícono de "autorizado": el ✓ se dibuja al aparecer (sin animación si se pidió reducir movimiento). */
function CheckAnimado() {
  return (
    <svg className="control-check" width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" pathLength={1} />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  )
}

export default function ControlIngresoPage() {
  const { nombre } = useAuth()
  const nav = useNavigate(), p = useParams()
  const [searchParams] = useSearchParams()
  const [ingresoManual, setIngresoManual] = useState(searchParams.get('ingreso') === 'manual')
  const [justificacionManual, setJustificacionManual] = useState('')
  const [justificacionError, setJustificacionError] = useState<string | null>(null)
  const idEstudiante = Number(p.idEstudiante), idExamen = Number(p.idExamen)
  const valid = Number.isInteger(idEstudiante) && Number.isInteger(idExamen)
  const [ctx, setCtx] = useState<ContextoControlIngreso | null>(null)
  const [types, setTypes] = useState<TipoIncidencia[]>([])
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([])
  const otraIncidenciaSeleccionada = types.some(t => t.nombre === 'OTRA_INCIDENCIA' && selectedIncidents.includes(t.id))
  const [obs, setObs] = useState(''), [incident, setIncident] = useState(''), [checks, setChecks] = useState<string[]>([])
  const [denialOpen, setDenialOpen] = useState(false), [reason, setReason] = useState('')
  const [denialDetail, setDenialDetail] = useState(''), [denied, setDenied] = useState(false)
  const otraRazon = reason === OTRA_RAZON
  const detalleError = otraRazon && !denialDetail ? 'Especifique la razón de la denegación' : validarTextoLibre(denialDetail, DETALLE_DENEGACION)
  const [textErrorField, setTextErrorField] = useState<'observaciones' | 'incidencia' | 'denialDetail' | null>(null)
  const [loading, setLoading] = useState(valid), [saving, setSaving] = useState(false), [error, setError] = useState(valid ? '' : 'Identificadores inválidos.')
  const [autoVolver, setAutoVolver] = useState(false)
  const [result, setResult] = useState<AutorizarIngresoResultado | null>(null)
  const [verificarAmbienteOpen, setVerificarAmbienteOpen] = useState(false)
  const [ambienteConfirmado, setAmbienteConfirmado] = useState(true)
  const [aviso, setAviso] = useState<Resultado | null>(null)
  const [reportarFotoOpen, setReportarFotoOpen] = useState(false)
  // Al terminar el examen se bloquean los ingresos (el backend también lo impide).
  const tiempoExamen = useTiempoExamen(ctx ? { fecha: ctx.fecha, horaInicio: ctx.horaInicio, duracionMinutos: ctx.duracionMinutos } : null)
  const examenTerminado = tiempoExamen?.fase === 'finalizado'
  // No se registra el ingreso días antes: el control abre 15 minutos antes del inicio.
  const controlCerrado = controlSinAbrir(tiempoExamen)
  const apertura = ctx ? aperturaControl(ctx.fecha, ctx.horaInicio) : null
  // La foto es obligatoria para verificar la identidad (el backend también lo impide).
  const sinFoto = Boolean(ctx && !ctx.fotoUrl)
  /** Reporte abierto de la foto: se avisa en lugar de dejar reportarla otra vez. */
  const [reporteFoto, setReporteFoto] = useState<ReporteFotoAbierto | null>(null)
  const [normasAbiertas, setNormasAbiertas] = useState<Set<string>>(new Set())
  const obsError = validarTextoLibre(obs, OBSERVACIONES_CONTROL)
  const [loadError, setLoadError] = useState('')
  const [reporteQrOpen, setReporteQrOpen] = useState(false)

  const pedirContexto = useCallback(() => Promise.all([obtenerContextoControl(idEstudiante, idExamen), obtenerTiposIncidencia()])
    .then(([c, t]) => { setCtx(c); setTypes(t) })
    .catch((err) => setLoadError(isNetworkError(err)
      ? 'Sin conexión a Internet: no se pudo cargar la información del control. Verifica tu conexión e inténtalo nuevamente.'
      : 'No se pudo cargar la información del control.'))
    .finally(() => setLoading(false)), [idEstudiante, idExamen])

  useEffect(() => {
    if (valid) void pedirContexto()
  }, [valid, pedirContexto])

  // Sin conexión o con error, simplemente no se muestra el aviso: no debe frenar el control.
  const cargarReporteFoto = useCallback(() => obtenerReporteFoto(idEstudiante)
    .then(setReporteFoto)
    .catch(() => setReporteFoto(null)), [idEstudiante])

  useEffect(() => {
    if (valid) void cargarReporteFoto()
  }, [valid, cargarReporteFoto])

  // En vivo: si otro miembro del personal reporta o revisa la foto, el aviso se actualiza; si registra
  // el ingreso de este estudiante en otro dispositivo, el estado se actualiza (evita un doble ingreso).
  useEnVivo((c) => c.idEstudiante === idEstudiante, () => {
    void cargarReporteFoto()
    void pedirContexto()
  })

  const reintentarCarga = () => {
    setLoading(true)
    setLoadError('')
    void pedirContexto()
  }

  const alternarNorma = (clave: string) => setNormasAbiertas((prev) => {
    const siguiente = new Set(prev)
    if (siguiente.has(clave)) siguiente.delete(clave)
    else siguiente.add(clave)
    return siguiente
  })

  const submit = async (denegar = false) => {
    const errorJustificacion = validarJustificacion(justificacionManual)
    if (!denegar && ingresoManual && errorJustificacion) {
      setJustificacionError(errorJustificacion)
      return
    }
    const errorIncidencia = otraIncidenciaSeleccionada ? validarTextoLibre(incident, DETALLE_INCIDENCIA) : null
    if (errorIncidencia) { setTextErrorField('incidencia'); setError(errorIncidencia); return }
    if (denegar && detalleError) return
    if (obsError) {
      setTextErrorField('observaciones')
      return
    }
    if (denegar && denialDetail.length > MAX_DETALLE_DENEGACION) {
      setTextErrorField('denialDetail')
      setError(`El detalle adicional no puede superar ${MAX_DETALLE_DENEGACION} caracteres.`)
      return
    }
    if (!denegar && (denied || checks.length === 0)) {
      setError('Confirma la verificación de identidad antes de autorizar.')
      return
    }
    const textosLibres: { field: 'observaciones' | 'incidencia' | 'denialDetail'; text: string }[] = denegar
      ? [{ field: 'observaciones', text: obs }, { field: 'denialDetail', text: denialDetail }]
      : [{ field: 'observaciones', text: obs }]
    if (otraIncidenciaSeleccionada) textosLibres.push({ field: 'incidencia', text: incident })
    const invalido = textosLibres.map(({ field, text }) => ({ field, garabato: primerGarabato(text.trim()) })).find(({ garabato }) => garabato)
    if (invalido?.garabato) {
      setTextErrorField(invalido.field)
      setError(`El texto contiene contenido no válido: "${invalido.garabato}".`)
      return
    }
    setTextErrorField(null)
    setError('')
    // Sin conexión no se intenta registrar nada: no hay autorización ni denegación a medias.
    if (isOffline()) {
      setAviso({ tipo: 'offline', mensaje: denegar ? SIN_CONEXION_DENEGAR : SIN_CONEXION_AUTORIZAR })
      return
    }
    setSaving(true)
    try {
      const payload = {
        idEstudiante,
        idExamen,
        observaciones: denegar ? [reason.trim(), obs.trim()].filter(Boolean).join(' — ').slice(0, 1000) : obs,
        ...(denegar && denialDetail.trim() ? { detalleDenegacion: denialDetail.trim() } : {}),
        identidadVerificada: checks.length > 0,
        verificacionesAdicionales: checks,
        incidencias: selectedIncidents.map(id => ({
          idTipoIncidencia: id,
          descripcion: (types.find(t => t.id === id)?.nombre === 'OTRA_INCIDENCIA' ? incident.trim() : '') || types.find(t => t.id === id)?.nombre || 'Incidencia detectada',
        })),
        fechaHoraDispositivo: horaLocalDelDispositivo(),
        ...(!denegar && ingresoManual ? { ingresoManual: true, justificacionManual: normalizarJustificacion(justificacionManual) } : {}),
      }
      const response = await (denegar ? denegarIngreso(payload) : autorizarIngreso(payload))
      setResult(response)
      setAutoVolver(true)
      vibrar(response.autorizado)
      if (denegar) {
        setDenied(true)
        if (ctx) setCtx({ ...ctx, habilitado: false, motivoInhabilitacion: response.causa })
      }
      setDenialOpen(false)
    } catch (err) {
      if (isNetworkError(err)) setAviso({ tipo: 'offline', mensaje: denegar ? SIN_CONEXION_DENEGAR : SIN_CONEXION_AUTORIZAR })
      else {
        const mensaje = mensajeDelServidor(err)
        if (ingresoManual && !denegar && mensaje?.toLocaleLowerCase('es').includes('justificación')) setJustificacionError(mensaje)
        else setError(mensaje ?? 'No se pudo registrar el control. Intenta nuevamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!result || !autoVolver) return
    const t = window.setTimeout(() => nav(`/dashboard/control/${idExamen}/identificar`), VOLVER_A_IDENTIFICAR_MS)
    return () => window.clearTimeout(t)
  }, [result, autoVolver, nav, idExamen])

  return <div className="accs02-layout"><PanelLayout compactDesktop title={ctx?.ambiente || 'Control de ingreso'} description="" topBarVariant="control">
    <main className="control-screen min-h-full bg-[#F7F8FA] px-3 pb-28 pt-4 sm:px-6 min-[960px]:pb-8"><div className="mx-auto max-w-6xl">
      <button onClick={() => nav(`/dashboard/control/${idExamen}/identificar`)} className="mb-3 inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-[#0439D9]"><ChevronLeft size={15}/>Volver a identificar estudiante</button>
      {loading && <div role="status" className={`${card} p-12 text-center`}><LoaderCircle className="mx-auto animate-spin text-[#0439D9]"/>Cargando...</div>}
      {loadError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{loadError}</p><button type="button" onClick={reintentarCarga} className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700">Reintentar</button></div>}
      {error && !denialOpen && !textErrorField && !error.includes('contenido no válido') && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!loading && ctx && <div className="control-sheet space-y-4">
        <section className="control-exam-header"><div className="flex flex-col justify-between gap-3 border-b border-[#E6EDF8] bg-[#F8F9FB] px-4 py-3 min-[760px]:flex-row min-[760px]:items-center sm:px-5"><div className="flex flex-wrap items-center gap-2"><UserCheck size={16} className="text-[#0439D9]"/><h1 className="text-sm font-extrabold uppercase text-[#15213B]">Control de ingreso</h1><span className="text-sm text-[#15213B]">{ctx.asignatura}</span><span className="text-sm text-[#15213B]">· {ctx.ambiente}</span></div><div className="flex flex-wrap gap-4 text-[10px] text-[#627A9B]"><span>Fecha: <b>{ctx.fecha.split('-').reverse().join('/')}</b></span><span>Hora: <b>{ctx.horaInicio.slice(0,5)} hrs</b></span></div></div></section>
        <section className="grid gap-4">
          <div className="control-student-heading"><span>Estudiante identificado</span></div><article className="control-student"><div className="control-student-row"><div className="control-student-identity flex min-w-0 items-center gap-3"><FotoEstudiante fotoUrl={ctx.fotoUrl} nombre={ctx.estudiante} iniciales={ctx.estudiante.split(' ').slice(0,2).map(x=>x[0]).join('')} className="control-avatar" ampliable detalle={`Código: ${ctx.codigoSis}`} accionAmpliada={reporteFoto?undefined:(cerrar)=><button type="button" onClick={()=>{cerrar();setReportarFotoOpen(true)}} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#B45309] hover:bg-[#FFF7E6]"><Flag size={14} aria-hidden="true"/>¿La foto no coincide? Reportar foto</button>}/><div><p className="text-[9px] font-semibold uppercase text-[#45628D]">{etiquetaCondicion(ctx.condicion)}</p><p className="text-sm font-bold text-[#20242a]">{ctx.estudiante}</p><p className="text-xs text-[#45628D]">Código: <span>{ctx.codigoSis}</span></p>{reporteFoto?<AvisoFotoReportada reporte={reporteFoto}/>:ctx.fotoUrl&&<button type="button" onClick={()=>setReportarFotoOpen(true)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309] hover:underline"><Flag size={12} aria-hidden="true"/>¿La foto no coincide? → Reportar foto</button>}</div></div><dl className="control-student-details"><div><dt>CI</dt><dd>{ctx.documento}</dd></div><div><dt>Carrera</dt><dd>{ctx.carrera || 'No registrada'}</dd></div></dl><span className={`control-status ${ctx.habilitado?'':'control-status-denied'}`}><CheckCircle2 size={14}/>{ctx.habilitado?'HABILITADO':'NO HABILITADO'}</span></div></article>
          <article className="control-environment">
            <Title icon={<Building2 size={14}/>} text="Verificación de ambiente"/>
            <div className="flex flex-col gap-3 rounded-lg border border-[#E6EDF8] bg-[#F8F9FB] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-[#0439D9]"><Building2 size={20}/></span><div><p className="text-[10px] font-bold uppercase text-[#627A9B]">Aula asignada para este examen:</p><p className="text-base font-extrabold text-[#15213B]">{ctx.ambiente || '—'}</p></div></div>
              <div className="flex flex-col gap-1.5 border-t border-[#E6EDF8] pt-2 text-xs sm:items-end sm:border-0 sm:pt-0"><label className="flex cursor-pointer items-center gap-2 font-medium text-[#15213B]"><input type="checkbox" checked={ambienteConfirmado} onChange={e=>setAmbienteConfirmado(e.target.checked)} className="rounded border-gray-300 text-[#0439D9] focus:ring-[#0439D9]"/>Confirmo que el estudiante está físicamente en el {ctx.ambiente || 'aula'}</label><button type="button" onClick={()=>setVerificarAmbienteOpen(true)} className="text-left text-[11px] font-semibold text-amber-700 underline sm:text-right">¿Aula incorrecta? → Reportar ubicación incorrecta</button></div>
            </div>
          </article>
          <article className="control-rules"><Title icon={<ListChecks size={14}/>} text="Normas del examen"/><div className="control-rules-box"><div className="flex items-start gap-2"><Gavel size={14} className="mt-0.5 shrink-0 text-[#0439D9]"/><div className="min-w-0"><b>Normas generales:</b>{ctx.normasGenerales.length ? <ol className="control-rules-list">{ctx.normasGenerales.map((x,i)=><li key={`${i}-${x}`}><NormaTexto texto={x} expanded={normasAbiertas.has(`g-${i}`)} onToggle={()=>alternarNorma(`g-${i}`)}/></li>)}</ol> : <p>No registradas.</p>}</div></div><div className="mt-2 flex items-start gap-2"><ClipboardList size={14} className="mt-0.5 shrink-0 text-[#0439D9]"/><div className="min-w-0"><b>Normas particulares:</b>{ctx.normasParticulares.length ? <ol className="control-rules-list">{ctx.normasParticulares.map((x,i)=><li key={`${i}-${x}`}><NormaTexto texto={x} expanded={normasAbiertas.has(`p-${i}`)} onToggle={()=>alternarNorma(`p-${i}`)}/></li>)}</ol> : <p>No se registraron normas particulares para este estudiante.</p>}</div></div></div></article>
        </section>
        {(!ctx.habilitado||ctx.ingresoRegistrado)&&<section className="rounded-xl border border-[#FFBFC9] bg-[#FFF6F7] px-4 py-3 text-[#C7193F]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 shrink-0" size={19}/><div><b className="block text-sm">No se puede autorizar el ingreso</b>{ctx.ingresoRegistrado?<p className="mt-0.5 text-sm">El ingreso ya fue registrado para este examen.</p>:<RazonesInhabilitacion motivo={ctx.motivoInhabilitacion} sinRazon="El estudiante no está habilitado." className="text-sm"/>}</div></div>{ctx.ingresoRegistrado&&<button type="button" onClick={()=>setReporteQrOpen(true)} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-[#D81B3D] bg-white px-3 text-xs font-bold text-[#B91C34] hover:bg-red-50">Reportar incidencia</button>}</div></section>}
        {!ctx.ingresoRegistrado && <section className="control-register">
          <Title icon={<ListChecks size={14}/>} text="Registro de control"/>
          <div className="mb-4 rounded-lg border border-[#D8E3F5] bg-[#F1F6FF] p-3">
            {searchParams.get('ingreso') === 'manual' ? (
              <div className="flex items-center gap-2 text-sm font-bold text-[#0439D9]">
                <UserCheck size={18} aria-hidden="true" />
                <span>Ingreso manual por CI/SIS</span>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm font-semibold text-[#011140]">
                <input type="checkbox" checked={ingresoManual} onChange={e=>{setIngresoManual(e.target.checked);setJustificacionError(null)}}/>
                Ingreso manual por excepción
              </label>
            )}
            {ingresoManual && <div className="mt-3">
              <label htmlFor="justificacion-manual" className="block text-xs font-semibold">Justificación del ingreso manual (obligatoria)</label>
              <textarea id="justificacion-manual" value={justificacionManual} onChange={e=>{const valor = e.target.value.slice(0, 65).toLocaleLowerCase('es').replace(/\p{L}/u, letra => letra.toLocaleUpperCase('es'));setJustificacionManual(valor);setJustificacionError(validarJustificacion(valor));setError('')}} maxLength={65} aria-describedby={`justificacion-ayuda${justificacionError ? ' justificacion-error' : ''}`} aria-invalid={!!justificacionError} rows={3} className="control-input mt-1" placeholder="Ej.: El celular está apagado"/>
              {justificacionError && <p id="justificacion-error" role="alert" className="mt-1 text-xs text-red-700">{justificacionError}</p>}
              <p id="justificacion-ayuda" className="mt-1 text-xs text-[#627A9B]">{justificacionManual.length}/65 caracteres. Mínimo 10 caracteres; solo letras y un espacio entre palabras. Se guardará con el usuario y la hora del servidor.</p>
            </div>}
          </div>
          <div className="control-fields">
            <div>
              <TextoLibreCampo id="control-observaciones" className="block text-xs" label={<>Observaciones <span className="text-[#7586A0]">(opcional)</span></>} max={OBSERVACIONES_CONTROL.max} rows={3} value={obs} onChange={v=>{setObs(v); if(textErrorField==='observaciones'){setTextErrorField(null);setError('')}}} error={obsError ?? (textErrorField==='observaciones' ? error : null)} placeholder="Estudiante ingresa con credencial oficial en regla"/>
              <fieldset className="mt-3"><legend className="text-xs">Verificaciones adicionales</legend><label className={`control-verification ${checks.length ? 'is-verified' : ''}`}><Fingerprint size={17} className="shrink-0 text-[#45628D]"/><input aria-label={VERIFICACION} type="checkbox" checked={checks.length>0} onChange={e=>setChecks(e.target.checked?[VERIFICACION]:[])}/><span>{VERIFICACION}</span></label></fieldset>
            </div>
            <fieldset className="control-incidents"><legend className="sr-only">Incidencias detectadas</legend><p className="mb-3 flex items-center gap-2 font-semibold text-[#A6450A]"><AlertTriangle size={14}/>Incidencias Detectadas</p>{types.filter(t=>['LLEGADA_TARDE','DOCUMENTO_MAL_ESTADO','OTRA_INCIDENCIA'].includes(t.nombre)).map(t=><label key={t.id} className="mb-2 flex items-start gap-2"><input type="checkbox" checked={selectedIncidents.includes(t.id)} onChange={()=>{setSelectedIncidents(v=>v.includes(t.id)?v.filter(id=>id!==t.id):[...v,t.id]); if(t.nombre==='OTRA_INCIDENCIA'){setIncident(''); if(textErrorField==='incidencia'){setTextErrorField(null);setError('')}}}}/>{ETIQUETA_INCIDENCIA[t.nombre]}</label>)}{otraIncidenciaSeleccionada&&<><textarea aria-label="Detalle de incidencias" aria-invalid={textErrorField==='incidencia'} value={incident} onChange={e=>{setIncident(e.target.value); if(textErrorField==='incidencia'){setTextErrorField(null);setError('')}}} rows={2} maxLength={1000} className="control-input" placeholder="Opcional: describe la incidencia..."/>{textErrorField==='incidencia'&&<p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}</>}</fieldset>
          </div>
        </section>}
        {sinFoto&&!examenTerminado&&!ctx.ingresoRegistrado&&<p role="alert" className="mx-1 mb-2 rounded-lg border border-[#FECACA] bg-[#FFF5F5] p-3 text-xs text-[#7F1D1D]"><strong>Sin foto registrada:</strong> no se puede verificar su identidad ni autorizar su ingreso. Debe registrarla en su portal, o la administración o el docente desde su ficha. Puedes denegar el ingreso o reportar la incidencia.</p>}
        {controlCerrado&&apertura&&!ctx.ingresoRegistrado&&<p role="status" className="mx-1 mb-2 rounded-lg border border-[#BFD2F8] bg-[#EAF2FF] p-3 text-xs text-[#011140]"><strong>El control de ingreso aún no está habilitado:</strong> se habilita el {apertura.fecha} a las {apertura.hora}, {MINUTOS_APERTURA_CONTROL} minutos antes del inicio del examen.</p>}
        {examenTerminado&&!ctx.ingresoRegistrado&&<p role="status" className="mx-1 mb-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#344158]"><strong>El examen ya terminó:</strong> no se pueden registrar ingresos. Los reportes de incidentes siguen disponibles.</p>}
        {!ctx.ingresoRegistrado&&<div className="control-actions"><div><button onClick={()=>setDenialOpen(true)} disabled={saving||!!result||examenTerminado||controlCerrado} className="control-deny"><Ban size={14}/>Denegar</button><button onClick={()=>void submit()} disabled={saving||!!result||examenTerminado||controlCerrado||sinFoto||!ctx.habilitado||checks.length===0||!ambienteConfirmado||!!obsError} className="control-authorize">{saving?<LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>:<CheckCircle2 size={17}/>}{saving?'Registrando...':'Autorizar Ingreso'}</button></div></div>}
      </div>}
    </div></main>
    {denialOpen&&ctx&&<div className="control-overlay control-denial-overlay fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Denegar ingreso"><section className="control-denial-modal">
      <div className="control-denial-heading"><span><ShieldX size={18}/></span><div><h2>Denegar Ingreso</h2><p>Acta de inadmisibilidad al aula</p></div><button aria-label="Cerrar denegación" onClick={()=>setDenialOpen(false)}><X size={16}/></button></div>
      <div className="control-denial-body"><StudentSummary ctx={ctx}/><div className="mt-3 flex justify-between text-xs"><label htmlFor="denial-reason">Razón de denegación <span className="text-red-600">*</span></label><span className="text-[9px] text-[#45628D]">Requerido para auditoría</span></div><select id="denial-reason" className="control-input" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Seleccionar razón</option>{['Suplantación','Fuera de tiempo','Documento inválido','Incumplimiento de normas','Deuda pendiente',OTRA_RAZON].map(x=><option key={x}>{x}</option>)}</select>{reason&&<p className="mt-2 rounded-md bg-[#f3f3f3] px-2 py-1 text-[10px] text-[#45628D]">{reason}</p>}<TextoLibreCampo id="denial-detail" label={<>Detalle adicional {otraRazon ? <span className="text-red-600">*</span> : <span className="text-[#45628D]">(opcional)</span>}</>} max={DETALLE_DENEGACION.max} value={denialDetail} onChange={setDenialDetail} error={detalleError} placeholder={otraRazon ? 'Especifique la razón de la denegación...' : 'Especifique el motivo o detalles de la denegación para auditoría institucional...'}/><div className="control-denial-audit"><p>AL CONFIRMAR, SE REGISTRARÁ:</p><div className="flex justify-between"><span>PERSONAL DE CONTROL</span><b>{nombre}</b></div><div className="flex justify-between"><span>FECHA Y HORA OFICIAL</span><span>Al confirmar · servidor</span></div></div></div>
      {error&&(!textErrorField||textErrorField==='incidencia')&&<p role="alert" className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}<div className="control-denial-footer"><button onClick={()=>setDenialOpen(false)} className="control-change">Cancelar</button><button disabled={!reason.trim()||saving||!!detalleError||!!obsError} onClick={()=>void submit(true)} className="control-deny">{saving?<LoaderCircle size={14} className="animate-spin" aria-hidden="true"/>:<Ban size={14}/>}{saving?'Registrando...':'Confirmar Denegación'}</button></div></section></div>}
    {result&&ctx&&<div className="control-overlay control-result-overlay fixed inset-0 z-[60] grid place-items-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Resultado del control"><section className={`control-receipt ${result.autorizado?'es-autorizado':'es-denegado'}`}><button aria-label="Cerrar resultado" onClick={()=>{setAutoVolver(false); setResult(null); if(result.autorizado) setCtx({...ctx,ingresoRegistrado:true})}} className="absolute right-3 top-3 rounded-full bg-[#F4F5F7] p-1 text-[#7586A0]"><X size={16}/></button><div className={`control-receipt-icon mx-auto grid h-12 w-12 place-items-center rounded-full ${result.autorizado?'bg-green-100 text-green-600':'bg-red-100 text-red-700'}`}>{result.autorizado?<CheckAnimado/>:<AlertTriangle/>}</div><h2 className={`mx-auto mt-3 w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase ${result.autorizado?'bg-[#ECFDF5] text-[#087F59]':'bg-red-50 text-red-700'}`}>{result.autorizado?'Ingreso autorizado':'Ingreso denegado'}</h2><div className="mt-4"><StudentSummary ctx={ctx}/></div><dl className="control-receipt-meta my-4 space-y-2 text-xs"><div><dt className="text-[#45628D]">{result.autorizado ? 'Autorizado por' : 'Denegado por'}</dt><dd>{result.autorizadoPor}</dd></div><div><dt className="text-[#45628D]">Fecha y hora oficial</dt><dd>{fechaHoraNumerica(result.fechaHoraIngreso)}</dd></div></dl><p className={`rounded-lg p-3 text-xs ${result.autorizado?'bg-[#ECFDF5] text-[#087F59]':'bg-red-50 text-red-700'}`}>{result.autorizado?(result.ambiente?<>El estudiante debe ingresar al aula <b className="text-base">{result.ambiente}</b>.</>:'El estudiante puede ingresar al ambiente de evaluación.'):result.causa}</p>{autoVolver&&<div className="mt-4" role="status"><div className="h-1 overflow-hidden rounded-full bg-[#E4E9F2]"><div className="control-cuenta h-full rounded-full bg-[#0439D9]" style={{animationDuration:`${VOLVER_A_IDENTIFICAR_MS}ms`}}/></div><div className="mt-1.5 flex items-center justify-between text-[11px] text-[#627A9B]"><span>Vuelve a identificar en {VOLVER_A_IDENTIFICAR_MS/1000} s</span><button type="button" onClick={()=>setAutoVolver(false)} className="font-semibold text-[#0439D9] hover:underline">Quedarme aquí</button></div></div>}<button onClick={()=>nav(`/dashboard/control/${idExamen}/identificar`)} className="control-siguiente mt-3 min-h-10 w-full rounded-lg bg-[#0439D9] text-sm font-semibold text-white shadow-md">→ Registrar siguiente estudiante</button></section></div>}
    {reportarFotoOpen&&ctx&&<ReportarFotoModal idEstudiante={idEstudiante} idExamen={idExamen} estudiante={ctx.estudiante} codigoSis={ctx.codigoSis} onClose={()=>setReportarFotoOpen(false)} onReportada={(mensaje)=>{setReportarFotoOpen(false);setAviso({tipo:'exito',mensaje});void cargarReporteFoto()}}/>}
    <ResultadoModal resultado={aviso} onClose={()=>setAviso(null)}/>
    <VerificarAmbienteModal 
  isOpen={verificarAmbienteOpen} 
  onClose={() => setVerificarAmbienteOpen(false)} 
  onReportado={() => {
    setVerificarAmbienteOpen(false);
    setAmbienteConfirmado(false);
  }}
  ctx={ctx}
  aulaActualExamen={ctx?.ambiente}
  usuarioNombre={nombre ?? undefined}
/>
    {reporteQrOpen && ctx && <ReporteQrDuplicadoModal idExamen={idExamen} idEstudianteQr={idEstudiante} onClose={()=>{ setReporteQrOpen(false); nav(`/dashboard/control/${idExamen}/identificar`) }}/>}
  </PanelLayout>{(denialOpen || result || verificarAmbienteOpen) && <MobileBottomNav variant="controlHome" />}</div>
}
