import { useEffect, useRef, useState } from 'react'
import { Ban, BookOpen, CalendarDays, Clock3, LockKeyhole, MapPin, ShieldAlert } from 'lucide-react'
import type { EstudianteAsignado } from '../../services/controlExamenService'
import { expulsarEstudiante } from '../../services/controlIngresoService'
import { MOTIVO_EXPULSION, validarMotivoExpulsion, type ExpulsionResponse } from '../../services/expulsionService'
import type { ExamenDto } from '../../services/examenService'
import { addMinutes, formatFecha, horaCorta } from '../../utils/examenFormat'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import { getUserInitials } from '../users/userAvatar.utils'
import { mensajeDeError } from '../../services/fotoRevisionService'
import TextoLibreCampo from './TextoLibreCampo'
import RegistroExpulsion from './RegistroExpulsion'
import '../../pages/Control/ControlIngresoPage.css'

interface Props {
  idExamen: number
  examen?: string
  datosExamen?: ExamenDto
  estudiante: EstudianteAsignado
  onClose: () => void
}

export default function ExpulsarEstudianteModal({ idExamen, examen, datosExamen, estudiante, onClose }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const enCurso = useRef(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sinConfirmar, setSinConfirmar] = useState(false)
  const [registro, setRegistro] = useState<ExpulsionResponse | null>(null)
  const [error, setError] = useState('')
  const bloqueado = enviando || sinConfirmar
  const errorMotivo = validarMotivoExpulsion(motivo)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    dialogo.current?.showModal()
    return () => anterior?.focus()
  }, [])

  const enviar = async () => {
    if (enCurso.current || errorMotivo || !estudiante.ingresado || estudiante.expulsado) return
    enCurso.current = true
    setEnviando(true)
    setError('')
    try {
      const respuesta = await expulsarEstudiante({ idEstudiante: estudiante.idEstudiante, idExamen, motivo })
      setRegistro(respuesta)
      if (respuesta) setMotivo(respuesta.motivo)
      setSinConfirmar(true)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo registrar la expulsión.'))
      enCurso.current = false
    } finally {
      setEnviando(false)
    }
  }

  return (
    <dialog ref={dialogo} aria-labelledby="expulsion-titulo" onCancel={(e) => { e.preventDefault(); if (!enviando) onClose() }} className="control-overlay control-denial-overlay fixed inset-0 m-0 grid h-full max-h-none w-full max-w-none place-items-center border-0 p-4 text-[#011140]">
      <form className="control-denial-modal" aria-busy={enviando} onSubmit={(e) => { e.preventDefault(); void enviar() }}>
        <div className="control-denial-heading">
          <span><ShieldAlert size={18} aria-hidden="true" /></span>
          <div><h2 id="expulsion-titulo">{registro ? 'Expulsión registrada' : 'Confirmar expulsión'}</h2><p>Registro disciplinario del examen</p></div>
        </div>
        <div className="control-denial-body">
          <div className="control-modal-student text-xs [overflow-wrap:anywhere]">
            <div className="flex items-center gap-3">
              <FotoEstudiante fotoUrl={estudiante.fotoUrl} nombre={`${estudiante.nombre} ${estudiante.apellidos}`}
                iniciales={getUserInitials(estudiante)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0439D9] text-base font-bold text-white" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase text-[#45628D]">Estudiante · {registro ? 'Expulsado' : 'Ingresó'}</p>
                <p className="font-bold">{estudiante.nombre} {estudiante.apellidos}</p>
                <p className="text-[#0439D9]">Código SIS: {estudiante.codigoSis} · CI: {estudiante.ci}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 rounded-lg bg-white p-3 text-[#45628D] sm:grid-cols-2">
              <p className="flex gap-2 sm:col-span-2"><BookOpen size={14} className="shrink-0 text-[#0439D9]" aria-hidden="true" />Examen #{idExamen} · {datosExamen?.asignatura ?? examen}</p>
              {datosExamen && <>
                <p className="flex gap-2"><CalendarDays size={14} className="shrink-0" aria-hidden="true" />Fecha: {formatFecha(datosExamen.fecha)}</p>
                <p className="flex gap-2"><Clock3 size={14} className="shrink-0" aria-hidden="true" />Horario: {horaCorta(datosExamen.horaInicio)} – {addMinutes(datosExamen.horaInicio, datosExamen.duracionMinutos)}</p>
                <p className="flex gap-2 sm:col-span-2"><MapPin size={14} className="shrink-0" aria-hidden="true" />Ambiente del examen: {datosExamen.ambienteNombre}</p>
              </>}
            </div>
            <p className="mt-2 text-[#45628D]">{estudiante.carrera}</p>
          </div>
          <fieldset disabled={bloqueado}>
            <TextoLibreCampo id="expulsion-motivo" label="Motivo de expulsión (obligatorio)" max={MOTIVO_EXPULSION.max} value={motivo} onChange={setMotivo} error={errorMotivo} />
          </fieldset>
          <div className="control-denial-audit">
            <p className="flex items-center gap-2 font-bold uppercase"><ShieldAlert size={14} aria-hidden="true" />Al confirmar, se registrará:</p>
            <p>Estudiante · Examen · Motivo · Usuario responsable</p>
            <p>El responsable y la hora oficial se registran en el servidor al confirmar.</p>
            <p className="mt-1 flex items-center gap-2"><LockKeyhole size={12} aria-hidden="true" />Fecha y hora automáticas, no editables.</p>
          </div>
          {error && <p role="alert" className="mt-3 text-xs text-[#B91C1C]">{error}</p>}
          {sinConfirmar && !registro && <p role="status" className="mt-3 text-xs">Respuesta recibida sin registro verificable. Consulta el registro antes de volver a enviar.</p>}
          {registro && (
            <div className="mt-3">
              <p role="status" className="text-xs font-semibold text-[#166534]">Expulsión registrada correctamente.</p>
              <RegistroExpulsion registro={registro} />
            </div>
          )}
        </div>
        <div className="control-denial-footer">
          <button type="button" disabled={enviando} onClick={onClose} className="control-change">{sinConfirmar ? 'Cerrar' : 'Cancelar'}</button>
          {!registro && <button type="submit" disabled={bloqueado || Boolean(errorMotivo)} className="control-deny">
            <Ban size={14} aria-hidden="true" />{enviando ? 'Enviando…' : 'Confirmar expulsión'}
          </button>}
        </div>
      </form>
    </dialog>
  )
}
