import { useEffect, useState } from 'react'
import { CheckCircle2, TriangleAlert } from 'lucide-react'
import type { EstudianteIdentificado } from '../../services/identificacionService'
import { listarIntentosIngreso, registrarIntentoIngreso, type IntentoIngreso } from '../../services/intentoIngresoService'

interface EstudianteNoVinculadoModalProps {
  estudiante: EstudianteIdentificado
  idExamen: number
  materia?: string
  aula?: string
  onCerrar: () => void
}

/** Aviso para un estudiante que existe pero no está registrado en el examen. Escape también cierra. */
export default function EstudianteNoVinculadoModal({
  estudiante,
  idExamen,
  materia,
  aula,
  onCerrar,
}: EstudianteNoVinculadoModalProps) {
  const [motivo, setMotivo] = useState('Intentó ingresar a un examen que no le corresponde.')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [historial, setHistorial] = useState<IntentoIngreso[]>([])
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCerrar])

  useEffect(() => {
    void listarIntentosIngreso(idExamen, estudiante.idEstudiante).then(setHistorial).catch(() => setHistorial([]))
  }, [idExamen, estudiante.idEstudiante])

  const registrar = async () => {
    if (!motivo.trim()) return
    setGuardando(true)
    setMensaje('')
    try {
      await registrarIntentoIngreso({ idExamen, idEstudiante: estudiante.idEstudiante,
        identificador: estudiante.codigoSis || estudiante.ci, motivo: motivo.trim() })
      setHistorial(await listarIntentosIngreso(idExamen, estudiante.idEstudiante))
      setMensaje('Intento registrado correctamente.')
    } catch {
      setMensaje('No se pudo registrar el intento. Intenta nuevamente.')
    } finally { setGuardando(false) }
  }

  const datos: [string, string | undefined][] = [
    ['Código', estudiante.codigoSis],
    ['CI', estudiante.ci],
    ['Materia', materia],
    ['Aula', aula],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-vinculado-title"
      aria-describedby="no-vinculado-descripcion"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#D8E3F5] bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FDE68A] bg-[#FFF8E7] text-[#D97706]">
            <TriangleAlert size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="no-vinculado-title" className="text-base font-bold text-[#011140]">
              Estudiante no vinculado
            </h2>
            <p id="no-vinculado-descripcion" className="mt-1 text-sm text-gray-600">
              <span className="font-semibold text-[#011140]">
                {estudiante.nombre} {estudiante.apellidos}
              </span>{' '}
              no está registrado en este examen.
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-[#FDE68A] bg-[#FFF8E7] p-3 text-xs">
          {datos
            .filter(([, valor]) => valor)
            .map(([label, valor]) => (
              <div key={label} className="flex gap-1">
                <dt className="text-[#627A9B]">{label}:</dt>
                <dd className="font-semibold text-[#011140]">{valor}</dd>
              </div>
            ))}
        </dl>

        <div className="mt-4 rounded-lg border border-[#D8E3F5] p-3">
          <label htmlFor="motivo-intento" className="text-xs font-semibold text-[#011140]">Motivo del intento</label>
          <textarea id="motivo-intento" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={2}
            className="mt-1 w-full rounded-lg border border-[#C9D7EC] p-2 text-sm" />
          {mensaje && <p role="status" className={`mt-2 text-xs ${mensaje.startsWith('Intento') ? 'text-emerald-700' : 'text-red-700'}`}>{mensaje}</p>}
          <button type="button" disabled={guardando || !motivo.trim()} onClick={() => void registrar()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0439D9] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <CheckCircle2 size={16} />{guardando ? 'Registrando…' : 'Registrar intento'}
          </button>
        </div>

        <section className="mt-4" aria-label="Historial de intentos del estudiante">
          <h3 className="text-xs font-bold uppercase text-[#011140]">Historial de intentos ({historial.length})</h3>
          {historial.length === 0 ? <p className="mt-1 text-xs text-[#627A9B]">Sin intentos registrados en este examen.</p> : (
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-[#45628D]">
              {historial.map((intento) => <li key={intento.idIntento} className="rounded bg-[#F6F9FE] p-2">{intento.motivo} · {new Date(intento.fechaHora).toLocaleString()}</li>)}
            </ul>
          )}
        </section>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onCerrar}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#011140] hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
