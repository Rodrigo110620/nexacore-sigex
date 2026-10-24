import { useEffect, useRef, useState } from 'react'
import { Ban } from 'lucide-react'
import type { EstudianteAsignado } from '../../services/controlExamenService'
import { expulsarEstudiante } from '../../services/controlIngresoService'
import { mensajeDeError } from '../../services/fotoRevisionService'
import TextoLibreCampo from './TextoLibreCampo'
import '../../pages/Control/ControlIngresoPage.css'

interface Props {
  idExamen: number
  examen?: string
  estudiante: EstudianteAsignado
  onClose: () => void
}

export default function ExpulsarEstudianteModal({ idExamen, examen, estudiante, onClose }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const enCurso = useRef(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sinConfirmar, setSinConfirmar] = useState(false)
  const [error, setError] = useState('')
  const bloqueado = enviando || sinConfirmar

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    dialogo.current?.showModal()
    return () => anterior?.focus()
  }, [])

  const enviar = async () => {
    if (enCurso.current || !motivo.trim() || !estudiante.ingresado || estudiante.expulsado) return
    enCurso.current = true
    setEnviando(true)
    setError('')
    try {
      await expulsarEstudiante({ idEstudiante: estudiante.idEstudiante, idExamen, motivo })
      // El contrato aún no permite verificar el registro: nunca mostrar éxito ni reenviar aquí.
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
          <span><Ban size={18} aria-hidden="true" /></span>
          <div><h2 id="expulsion-titulo">Confirmar expulsión</h2><p>Registro disciplinario del examen</p></div>
        </div>
        <div className="control-denial-body">
          <div className="control-modal-student text-xs">
            <p className="font-bold">{estudiante.nombre} {estudiante.apellidos}</p>
            <p>Código SIS: {estudiante.codigoSis} · CI: {estudiante.ci}</p>
            <p>{estudiante.carrera}</p>
            <p className="mt-2 font-semibold">Examen #{idExamen} · {examen}</p>
          </div>
          <fieldset disabled={bloqueado}>
            <TextoLibreCampo id="expulsion-motivo" label="Motivo de expulsión (obligatorio)" max={500} value={motivo} onChange={setMotivo} error={!motivo.trim() ? 'El motivo es obligatorio.' : null} />
          </fieldset>
          <p className="control-denial-audit">El responsable y la hora oficial se registran en el servidor al confirmar.</p>
          {error && <p role="alert" className="mt-3 text-xs text-[#B91C1C]">{error}</p>}
          {sinConfirmar && <p role="status" className="mt-3 text-xs">Respuesta recibida sin registro verificable. Consulta el registro antes de volver a enviar.</p>}
        </div>
        <div className="control-denial-footer">
          <button type="button" disabled={enviando} onClick={onClose} className="control-change">{sinConfirmar ? 'Cerrar' : 'Cancelar'}</button>
          <button type="submit" disabled={bloqueado || !motivo.trim()} className="control-deny">
            {enviando ? 'Enviando…' : 'Confirmar expulsión'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
