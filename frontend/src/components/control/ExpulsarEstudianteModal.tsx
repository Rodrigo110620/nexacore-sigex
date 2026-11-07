import { useEffect, useRef, useState } from 'react'
import { Ban, TriangleAlert, UserX, X } from 'lucide-react'
import type { EstudianteAsignado } from '../../services/controlExamenService'
import { expulsarEstudiante } from '../../services/controlIngresoService'
import { MOTIVO_EXPULSION, MOTIVOS_FRECUENTES_EXPULSION, normalizarMotivoExpulsion, validarMotivoExpulsion, type ExpulsionResponse } from '../../services/expulsionService'
import type { ExamenDto } from '../../services/examenService'
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
          <span><UserX size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 id="expulsion-titulo">{registro ? 'Expulsión registrada' : 'Expulsar estudiante'}</h2>
            <p className="truncate !text-xs !normal-case !tracking-normal">{[`${estudiante.nombre} ${estudiante.apellidos}`, estudiante.codigoSis, datosExamen?.asignatura ?? examen ?? `Examen #${idExamen}`].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" aria-label="Cerrar expulsión" disabled={enviando} onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="control-denial-body">
          <fieldset disabled={bloqueado}>
            <TextoLibreCampo id="expulsion-motivo" label={<span className="font-semibold">Motivo <span className="text-[#B91C1C]">*</span></span>} max={MOTIVO_EXPULSION.max} value={motivo} onChange={setMotivo}
              error={motivo ? errorMotivo : null} ayuda={`Entre ${MOTIVO_EXPULSION.min} y ${MOTIVO_EXPULSION.max} caracteres, con palabras que expliquen la expulsión.`}
              placeholder="Describe qué ocurrió" normalizarEntrada={(valor) => valor.replace(/^ +/, '').replace(/ +/g, ' ')} onBlur={() => setMotivo(normalizarMotivoExpulsion(motivo))} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[#45628D]">Motivos frecuentes</p>
            <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label="Motivos frecuentes">
              {MOTIVOS_FRECUENTES_EXPULSION.map((m) => (
                <button key={m} type="button" onClick={() => setMotivo(m)} aria-pressed={motivo === m}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${motivo === m ? 'border-[#0439D9] bg-[#EDF2FE] text-[#0439D9]' : 'border-[#D5E2FA] bg-white text-[#011140] hover:bg-[#F2F5FA]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#FEF3C7] p-3 text-xs leading-snug text-[#92400E]">
            <TriangleAlert size={16} className="shrink-0" aria-hidden="true" />
            La expulsión queda registrada con la fecha y hora del servidor y el usuario responsable, y no se puede editar.
          </p>
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
            <Ban size={14} aria-hidden="true" />{enviando ? 'Enviando…' : 'Expulsar'}
          </button>}
        </div>
      </form>
    </dialog>
  )
}
