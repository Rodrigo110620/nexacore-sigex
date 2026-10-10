import { useEffect, useState } from 'react'
import { AlertTriangle, ListChecks, ClipboardList, Gavel, Fingerprint, Ban, ShieldX, UserCheck, Check, CheckCircle2, ChevronLeft, LoaderCircle, X, Building2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import { useAuth } from '../../context/AuthContext'
import './ControlIngresoPage.css'
import { autorizarIngreso, denegarIngreso, obtenerContextoControl, obtenerHistorialControl, obtenerTiposIncidencia } from '../../services/controlIngresoService'
import type { AutorizarIngresoResultado, ContextoControlIngreso, RegistroControlIngreso, TipoIncidencia } from '../../types/controlIngreso'
import { primerGarabato } from '../../utils/palabras'
import TextoLibreCampo from '../../components/control/TextoLibreCampo'
import { DETALLE_DENEGACION, validarTextoLibre } from '../../utils/textoLibreValidators'
import { VerificarAmbienteModal } from '../../components/control/VerificarAmbienteModal'

const VERIFICACION = 'Identidad biométrica cotejada / Carnet físico verificado'
const MAX_DETALLE_DENEGACION = 500
const card = 'rounded-xl border border-[#E1E7F0] bg-white p-4 shadow-[0_2px_8px_rgba(1,17,64,.05)] sm:p-5'

function Title({ icon, text }: { n?: number; icon: React.ReactNode; text: string }) {
  return <div className="control-section-title"><span>{icon}</span><h2>{text}</h2></div>
}

function StudentSummary({ctx}: {ctx: ContextoControlIngreso}) {
  return <div className="control-modal-student"><div className="flex items-center gap-3"><b className="control-avatar">{ctx.estudiante.split(' ').slice(0,2).map(x=>x[0]).join('')}</b><div><p className="text-[9px] uppercase text-[#45628D]">Estudiante regular</p><p className="text-sm font-bold">{ctx.estudiante}</p><p className="text-[10px] text-[#0439D9]">Cód: {ctx.codigoSis}</p></div></div><div className="my-3 rounded-md bg-white p-2"><p className="text-[9px] uppercase text-[#45628D]">Materia y ambiente</p><p className="text-xs">{ctx.asignatura} · {ctx.ambiente}</p></div><div className="flex justify-between gap-3 text-[10px]"><p>CI: {ctx.documento}</p><p>Carrera: {ctx.carrera || 'No registrada'}</p></div></div>
}

export default function ControlIngresoPage() {
  const { nombre } = useAuth()
  const nav = useNavigate(), p = useParams()
  const idEstudiante = Number(p.idEstudiante), idExamen = Number(p.idExamen)
  const valid = Number.isInteger(idEstudiante) && Number.isInteger(idExamen)
  const [ctx, setCtx] = useState<ContextoControlIngreso | null>(null)
  const [types, setTypes] = useState<TipoIncidencia[]>([])
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([])
  const [obs, setObs] = useState(''), [incident, setIncident] = useState(''), [checks, setChecks] = useState<string[]>([])
  const [denialOpen, setDenialOpen] = useState(false), [reason, setReason] = useState('')
  const [denialDetail, setDenialDetail] = useState(''), [denied, setDenied] = useState(false)
  const detalleError = validarTextoLibre(denialDetail, DETALLE_DENEGACION)
  const [textErrorField, setTextErrorField] = useState<'observaciones' | 'incidencia' | 'denialDetail' | null>(null)
  const [loading, setLoading] = useState(valid), [saving, setSaving] = useState(false), [error, setError] = useState(valid ? '' : 'Identificadores inválidos.')
  const [result, setResult] = useState<AutorizarIngresoResultado | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false), [historyLoading, setHistoryLoading] = useState(false), [historyError, setHistoryError] = useState(''), [history, setHistory] = useState<RegistroControlIngreso[]>([])
  const [verificarAmbienteOpen, setVerificarAmbienteOpen] = useState(false)
  const [ambienteConfirmado, setAmbienteConfirmado] = useState(true)

  useEffect(() => {
    if (!valid) return
    Promise.all([obtenerContextoControl(idEstudiante, idExamen), obtenerTiposIncidencia()]).then(([c, t]) => { setCtx(c); setTypes(t) }).catch(() => setError('No se pudo cargar la información del control.')).finally(() => setLoading(false))
  }, [idEstudiante, idExamen, valid])

  const openHistory = async () => {
    setHistoryOpen(true)
    setHistoryLoading(true)
    setHistoryError('')
    try {
      setHistory(await obtenerHistorialControl(idEstudiante, idExamen))
    } catch {
      setHistoryError('No se pudo cargar el historial. Comprueba tu conexión e inténtalo nuevamente.')
    } finally {
      setHistoryLoading(false)
    }
  }
  const submit = async (denegar = false) => {
    if (denegar && detalleError) return
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
      : [{ field: 'observaciones', text: obs }, { field: 'incidencia', text: incident }]
    const invalido = textosLibres.map(({ field, text }) => ({ field, garabato: primerGarabato(text.trim()) })).find(({ garabato }) => garabato)
    if (invalido?.garabato) {
      setTextErrorField(invalido.field)
      setError(`El texto contiene contenido no válido: "${invalido.garabato}".`)
      return
    }
    setTextErrorField(null)
    setSaving(true)
    setError('')
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
          descripcion: incident.trim() || types.find(t => t.id === id)?.nombre || 'Incidencia detectada',
        })),
      }
      const response = await (denegar ? denegarIngreso(payload) : autorizarIngreso(payload))
      setResult(response)
      if (denegar) {
        setDenied(true)
        if (ctx) setCtx({ ...ctx, habilitado: false, motivoInhabilitacion: response.causa })
      }
      setDenialOpen(false)
    } catch {
      setError('No se pudo registrar el control. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="accs02-layout"><PanelLayout compactDesktop title={ctx?.ambiente || 'Control de ingreso'} description="" topBarVariant="control">
    <main className="control-screen min-h-full bg-[#F7F8FA] px-3 pb-28 pt-4 sm:px-6 min-[960px]:pb-8"><div className="mx-auto max-w-6xl">
      <button onClick={() => nav(`/dashboard/control/${idExamen}/identificar`)} className="mb-3 inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-[#0439D9]"><ChevronLeft size={15}/>Volver a identificar estudiante</button>
      {loading && <div role="status" className={`${card} p-12 text-center`}><LoaderCircle className="mx-auto animate-spin text-[#0439D9]"/>Cargando...</div>}
      {error && !error.includes('contenido no válido') && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!loading && ctx && <div className="control-sheet space-y-4">
        <section className="control-exam-header"><div className="flex flex-col justify-between gap-3 border-b border-[#E6EDF8] bg-[#F8F9FB] px-4 py-3 min-[760px]:flex-row min-[760px]:items-center sm:px-5"><div className="flex flex-wrap items-center gap-2"><UserCheck size={16} className="text-[#0439D9]"/><h1 className="text-sm font-extrabold uppercase text-[#15213B]">Control de ingreso</h1><span className="text-sm text-[#15213B]">{ctx.asignatura}</span><span className="text-sm text-[#15213B]">· {ctx.ambiente}</span></div><div className="flex flex-wrap gap-4 text-[10px] text-[#627A9B]"><span>Fecha: <b>{ctx.fecha.split('-').reverse().join('/')}</b></span><span>Hora: <b>{ctx.horaInicio.slice(0,5)} hrs</b></span></div></div></section>
        <section className="grid gap-4">
          <div className="control-student-heading"><span>Estudiante identificado</span></div><article className="control-student"><div className="control-student-row"><div className="control-student-identity flex min-w-0 items-center gap-3"><b className="control-avatar">{ctx.estudiante.split(' ').slice(0,2).map(x=>x[0]).join('')}</b><div><p className="text-sm font-bold text-[#20242a]">{ctx.estudiante}</p><p className="text-xs text-[#45628D]">Código: <span>{ctx.codigoSis}</span></p></div></div><dl className="control-student-details"><div><dt>CI</dt><dd>{ctx.documento}</dd></div><div><dt>Carrera</dt><dd>{ctx.carrera || 'No registrada'}</dd></div></dl><span className={`control-status ${ctx.habilitado?'':'control-status-denied'}`}><CheckCircle2 size={14}/>{ctx.habilitado?'HABILITADA':'NO HABILITADA'}</span></div></article>
          <article className="rounded-xl border border-[#E1E7F0] bg-white p-4 shadow-[0_2px_8px_rgba(1,17,64,.05)] sm:p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-[#E6EDF8] pb-3"><Building2 size={16} className="text-[#0439D9]"/><h2 className="text-xs font-extrabold uppercase tracking-wide text-[#15213B]">Verificación de ambiente</h2></div>
            <div className="flex flex-col gap-3 rounded-lg border border-[#E6EDF8] bg-[#F8F9FB] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-[#0439D9]"><Building2 size={20}/></span><div><p className="text-[10px] font-bold uppercase text-[#627A9B]">Aula asignada para este examen:</p><p className="text-base font-extrabold text-[#15213B]">{ctx.ambiente || '—'}</p></div></div>
              <div className="flex flex-col gap-1.5 border-t border-[#E6EDF8] pt-2 text-xs sm:items-end sm:border-0 sm:pt-0"><label className="flex cursor-pointer items-center gap-2 font-medium text-[#15213B]"><input type="checkbox" checked={ambienteConfirmado} onChange={e=>setAmbienteConfirmado(e.target.checked)} className="rounded border-gray-300 text-[#0439D9] focus:ring-[#0439D9]"/>Confirmo que el estudiante está físicamente en el {ctx.ambiente || 'aula'}</label><button type="button" onClick={()=>setVerificarAmbienteOpen(true)} className="text-left text-[11px] font-semibold text-amber-700 underline sm:text-right">¿Aula incorrecta? → Reportar ubicación incorrecta</button></div>
            </div>
          </article>
          <article className="control-rules"><Title icon={<ListChecks size={14}/>} text="Normas del examen"/><div className="control-rules-box"><div className="flex items-start gap-2"><Gavel size={14} className="mt-0.5 shrink-0 text-[#0439D9]"/><div className="min-w-0"><b>Normas generales:</b>{ctx.normasGenerales.length ? <ul className="control-rules-list">{ctx.normasGenerales.map((x,i)=><li key={`${i}-${x}`}>{x}</li>)}</ul> : <p>No registradas.</p>}</div></div><div className="mt-2 flex items-start gap-2"><ClipboardList size={14} className="mt-0.5 shrink-0 text-[#0439D9]"/><div className="min-w-0"><b>Normas particulares:</b>{ctx.normasParticulares.length ? <ul className="control-rules-list">{ctx.normasParticulares.map((x,i)=><li key={`${i}-${x}`}>{x}</li>)}</ul> : <p>No se registraron normas particulares para este estudiante.</p>}</div></div></div></article>
        </section>
        {(!ctx.habilitado||ctx.ingresoRegistrado)&&<section className="rounded-xl border border-[#FFBFC9] bg-[#FFF2F4] p-4 text-[#C7193F]"><div className="flex gap-2"><AlertTriangle size={20}/><div><b>No se puede autorizar el ingreso</b><p className="text-sm">{ctx.ingresoRegistrado?'El ingreso ya fue registrado para este examen.':ctx.motivoInhabilitacion||'El estudiante no está habilitado.'}</p></div></div></section>}
        {!ctx.ingresoRegistrado && <section className="control-register">
          <Title icon={<ListChecks size={14}/>} text="Registro de control"/>
          <div className="control-fields">
            <div>
              <label htmlFor="control-observaciones" className="text-xs">Observaciones <span className="text-[#7586A0]">(opcional)</span></label>
              <textarea id="control-observaciones" aria-invalid={textErrorField==='observaciones'} aria-describedby={textErrorField==='observaciones'?'control-observaciones-error':undefined} value={obs} onChange={e=>{setObs(e.target.value); if(textErrorField==='observaciones'){setTextErrorField(null);setError('')}}} rows={3} maxLength={1000} className="control-input" placeholder="Estudiante ingresa con credencial oficial en regla"/>
              {textErrorField==='observaciones' && <p id="control-observaciones-error" role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
              <fieldset className="mt-3"><legend className="text-xs">Verificaciones adicionales</legend><label className={`control-verification ${checks.length ? 'is-verified' : ''}`}><Fingerprint size={17} className="shrink-0 text-[#45628D]"/><input aria-label={VERIFICACION} type="checkbox" checked={checks.length>0} onChange={e=>setChecks(e.target.checked?[VERIFICACION]:[])}/><span>{VERIFICACION}</span></label></fieldset>
            </div>
            <fieldset className="control-incidents"><legend className="sr-only">Incidencias detectadas</legend><p className="mb-3 flex items-center gap-2 font-semibold text-[#A6450A]"><AlertTriangle size={14}/>Incidencias Detectadas</p>{types.filter(t=>['LLEGADA_TARDE','DOCUMENTO_MAL_ESTADO','OTRA_INCIDENCIA'].includes(t.nombre)).map(t=><label key={t.id} className="mb-2 flex items-start gap-2"><input type="checkbox" checked={selectedIncidents.includes(t.id)} onChange={()=>setSelectedIncidents(v=>v.includes(t.id)?v.filter(id=>id!==t.id):[...v,t.id])}/>{{LLEGADA_TARDE:'Estudiante llegó tarde',DOCUMENTO_MAL_ESTADO:'Documento en mal estado',OTRA_INCIDENCIA:'Otra incidencia'}[t.nombre]}</label>)}{selectedIncidents.length>0&&<><textarea aria-label="Detalle de incidencias" aria-invalid={textErrorField==='incidencia'} value={incident} onChange={e=>{setIncident(e.target.value); if(textErrorField==='incidencia'){setTextErrorField(null);setError('')}}} rows={2} maxLength={1000} className="control-input" placeholder="Opcional: describe la incidencia..."/>{textErrorField==='incidencia'&&<p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}</>}</fieldset>
          </div>
        </section>}
        {!ctx.ingresoRegistrado&&<div className="control-actions"><button onClick={openHistory} className="control-change" aria-label="Historial del control" title="Historial del control"><ClipboardList size={15}/></button><div><button onClick={()=>setDenialOpen(true)} disabled={saving||!!result} className="control-deny"><Ban size={14}/>Denegar</button><button onClick={()=>void submit()} disabled={saving||!!result||!ctx.habilitado||checks.length===0||!ambienteConfirmado} className="control-authorize"><CheckCircle2 size={17}/>{saving?'Registrando...':'Autorizar Ingreso'}</button></div></div>}
      </div>}
    </div></main>
    {denialOpen&&ctx&&<div className="control-overlay control-denial-overlay fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Denegar ingreso"><section className="control-denial-modal">
      <div className="control-denial-heading"><span><ShieldX size={18}/></span><div><h2>Denegar Ingreso</h2><p>Acta de inadmisibilidad al aula</p></div><button aria-label="Cerrar denegación" onClick={()=>setDenialOpen(false)}><X size={16}/></button></div>
      <div className="control-denial-body"><StudentSummary ctx={ctx}/><div className="mt-3 flex justify-between text-xs"><label htmlFor="denial-reason">Razón de denegación <span className="text-red-600">*</span></label><span className="text-[9px] text-[#45628D]">Requerido para auditoría</span></div><select id="denial-reason" className="control-input" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Seleccionar razón</option>{['Suplantación','Fuera de tiempo','Documento inválido','Incumplimiento de normas','Deuda pendiente','Otra razón'].map(x=><option key={x}>{x}</option>)}</select>{reason&&<p className="mt-2 rounded-md bg-[#f3f3f3] px-2 py-1 text-[10px] text-[#45628D]">{reason}</p>}<TextoLibreCampo id="denial-detail" label={<>Detalle adicional <span className="text-[#45628D]">(opcional)</span></>} max={DETALLE_DENEGACION.max} value={denialDetail} onChange={setDenialDetail} error={detalleError} placeholder="Especifique el motivo o detalles de la denegación para auditoría institucional..."/><div className="control-denial-audit"><p>AL CONFIRMAR, SE REGISTRARÁ:</p><div className="flex justify-between"><span>PERSONAL DE CONTROL</span><b>{nombre}</b></div><div className="flex justify-between"><span>FECHA Y HORA OFICIAL</span><span>Al confirmar · servidor</span></div></div></div>
      <div className="control-denial-footer"><button onClick={()=>setDenialOpen(false)} className="control-change">Cancelar</button><button disabled={!reason.trim()||saving||!!detalleError} onClick={()=>void submit(true)} className="control-deny"><Ban size={14}/>{saving?'Registrando...':'Confirmar Denegación'}</button></div></section></div>}
    {historyOpen&&<div className="fixed inset-0 z-50 grid place-items-center bg-[#DCE9FA]/80 p-3" role="dialog" aria-modal="true" aria-label="Historial del control"><section className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 flex justify-between border-b bg-white p-4"><div><h2 className="font-extrabold">Historial del control realizado</h2><p className="text-xs text-[#7586A0]">Autorizaciones y denegaciones registradas</p></div><button aria-label="Cerrar historial" onClick={()=>setHistoryOpen(false)}><X/></button></header><div className="space-y-3 p-4">{historyLoading&&<p role="status">Cargando...</p>}{historyError&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p>{historyError}</p><button type="button" onClick={()=>void openHistory()} className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700">Reintentar</button></div>}{!historyLoading&&!historyError&&history.length===0&&<p role="status" className="text-sm text-[#7586A0]">No hay registros en el historial de este control.</p>}{!historyError&&history.map(r=><article key={r.idRegistro} className="rounded-xl border p-4"><div className="flex justify-between"><b className={r.resultado==='AUTORIZADO'?'text-green-700':'text-red-700'}>{r.resultado}</b><time className="text-xs text-[#7586A0]">{new Date(r.fechaHora).toLocaleString()}</time></div><p className="mt-2 text-sm font-bold">Personal de control: {r.usuarioControl}</p>{r.causa&&<p className="text-sm text-red-700">Causa: {r.causa}</p>}{r.observaciones&&<p className="text-sm">Observaciones: {r.observaciones}</p>}{r.verificacionesAdicionales.map(x=><p key={x} className="flex items-center gap-1 text-xs text-[#61718A]"><Check size={12}/>{x}</p>)}</article>)}</div></section></div>}
    {result&&ctx&&<div className="control-overlay control-result-overlay fixed inset-0 z-[60] grid place-items-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Resultado del control"><section className="control-receipt"><button aria-label="Cerrar resultado" onClick={()=>{setResult(null); if(result.autorizado) setCtx({...ctx,ingresoRegistrado:true})}} className="absolute right-3 top-3 rounded-full bg-[#F4F5F7] p-1 text-[#7586A0]"><X size={16}/></button><div className={`control-receipt-icon mx-auto grid h-12 w-12 place-items-center rounded-full ${result.autorizado?'bg-green-100 text-green-600':'bg-red-100 text-red-700'}`}>{result.autorizado?<CheckCircle2 size={30}/>:<AlertTriangle/>}</div><h2 className={`mx-auto mt-3 w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase ${result.autorizado?'bg-[#ECFDF5] text-[#087F59]':'bg-red-50 text-red-700'}`}>{result.autorizado?'Ingreso autorizado':'Ingreso denegado'}</h2><div className="mt-4"><StudentSummary ctx={ctx}/></div><dl className="control-receipt-meta my-4 space-y-2 text-xs"><div><dt className="text-[#45628D]">{result.autorizado ? 'Autorizado por' : 'Denegado por'}</dt><dd>{result.autorizadoPor}</dd></div><div><dt className="text-[#45628D]">Fecha y hora oficial</dt><dd>{new Date(result.fechaHoraIngreso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</dd></div></dl><p className={`rounded-lg p-3 text-xs ${result.autorizado?'bg-[#ECFDF5] text-[#087F59]':'bg-red-50 text-red-700'}`}>{result.autorizado?(result.ambiente?<>El estudiante debe ingresar al aula <b className="text-base">{result.ambiente}</b>.</>:'El estudiante puede ingresar al ambiente de evaluación.'):result.causa}</p><button onClick={()=>nav(`/dashboard/control/${idExamen}/identificar`)} className="mt-4 min-h-10 w-full rounded-lg bg-[#0439D9] text-sm font-semibold text-white shadow-md">→ Registrar siguiente estudiante</button></section></div>}
    <VerificarAmbienteModal isOpen={verificarAmbienteOpen} onClose={()=>setVerificarAmbienteOpen(false)} onReportIncident={()=>{setVerificarAmbienteOpen(false);setAmbienteConfirmado(false)}} ctx={ctx} aulaActual={ctx?.ambiente || ''}/>
  </PanelLayout>{(denialOpen || result || verificarAmbienteOpen) && <MobileBottomNav variant="controlHome" />}</div>
}
