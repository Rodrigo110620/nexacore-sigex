import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { reasignarAmbiente } from '../../services/controlExamenService'
import type { EstudianteAsignado } from '../../services/controlExamenService'
import type { AulaExamenDto } from '../../services/examenService'
import { listarAmbientes, type AmbienteDto } from '../../services/ambienteService'

interface Props {
  idExamen: number
  examenNombre?: string
  estudiante: EstudianteAsignado
  aulas?: AulaExamenDto[]
  aulaActualId?: number | null
  onClose: () => void
  onSuccess: () => void
}

export default function ReasignarAmbienteModal({ idExamen, examenNombre, estudiante, aulas, aulaActualId, onClose, onSuccess }: Props) {
  const [idAmbienteDestino, setIdAmbienteDestino] = useState<number | ''>('')
  const [motivo, setMotivo] = useState('')
  const [observacion, setObservacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ambientes, setAmbientes] = useState<AmbienteDto[]>([])
  const [cargandoAmbientes, setCargandoAmbientes] = useState(false)

  useEffect(() => {
    let vigente = true
    setCargandoAmbientes(true)
    listarAmbientes()
      .then((data) => {
        if (vigente) setAmbientes(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (vigente) setAmbientes([])
      })
      .finally(() => {
        if (vigente) setCargandoAmbientes(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  const opciones = useMemo(() => {
    if (ambientes.length > 0) {
      return ambientes
        .map((a: any) => {
          const id = a?.idAmbiente ?? a?.id ?? a?.ambienteId
          if (typeof id !== 'number') return null
          const nombre = a?.nombre ?? a?.nombreAmbiente ?? `Aula ${id}`
          const ubicacion = a?.ubicacion ?? null
          return { id, nombre, ubicacion }
        })
        .filter((a): a is { id: number; nombre: string; ubicacion: string | null } => {
          if (!a) return false
          if (aulaActualId && a.id === aulaActualId) return false
          return true
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    }

    const lista = Array.isArray(aulas) ? aulas : []
    return lista
      .map((a: any) => {
        const id = a?.idAmbiente ?? a?.id ?? a?.ambienteId ?? a?.idAmbienteExamen
        if (typeof id !== 'number') return null
        const nombre = a?.nombre ?? a?.nombreAmbiente ?? a?.ambienteNombre ?? `Aula ${id}`
        const ubicacion = a?.ubicacion ?? a?.ambienteUbicacion ?? null
        return { id, nombre, ubicacion }
      })
      .filter((a): a is { id: number; nombre: string; ubicacion: string | null } => {
        if (!a) return false
        if (aulaActualId && a.id === aulaActualId) return false
        return true
      })
  }, [ambientes, aulas, aulaActualId])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (idAmbienteDestino === '' || Number(idAmbienteDestino) <= 0) {
      setError('Selecciona un aula destino')
      return
    }
    if (!motivo.trim()) {
      setError('El motivo es obligatorio')
      return
    }
    if (motivo.trim().length > 500) {
      setError('El motivo no puede superar 500 caracteres')
      return
    }
    try {
      setCargando(true)
      await reasignarAmbiente(idExamen, estudiante.idEstudiante, {
        idAmbienteDestino: Number(idAmbienteDestino),
        motivo: motivo.trim(),
        observacion: observacion.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data
      const msg = data?.mensaje || data?.message || data?.error || (typeof data === 'string' ? data : '') || err?.message || 'No se pudo reasignar el ambiente'
      if (msg === 'Not Found') setError('El estudiante no está asociado al examen seleccionado')
      else setError(msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EDF1F7] px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-[#011140]">Reasignar ambiente por contingencia</h3>
            <p className="text-xs text-[#627A9B]">{estudiante.nombre} {estudiante.apellidos} · {estudiante.codigoSis}</p>
            {examenNombre && <p className="text-xs text-[#627A9B]">{examenNombre}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#627A9B] hover:bg-[#F1F6FF] hover:text-[#0439D9]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={enviar} className="flex flex-col gap-3 px-4 py-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#011140]">Aula destino</label>
            <select
              value={idAmbienteDestino}
              onChange={(e) => setIdAmbienteDestino(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-lg border border-[#D8E3F5] px-3 py-2 text-sm"
              disabled={cargando || cargandoAmbientes}
            >
              <option value="">{cargandoAmbientes ? 'Cargando aulas...' : 'Seleccionar aula'}</option>
              {opciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}{a.ubicacion ? ` · ${a.ubicacion}` : ''}
                </option>
              ))}
            </select>
            {opciones.length === 0 && <p className="text-xs text-[#B91C1C]">No hay otro aula disponible para este examen</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#011140]">Motivo (obligatorio)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              rows={3}
              className="rounded-lg border border-[#D8E3F5] px-3 py-2 text-sm"
              placeholder="Contingencia física / corte de red / computadora dañada..."
              disabled={cargando}
            />
            <span className="text-[10px] text-[#627A9B]">{motivo.length}/500</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#011140]">Observación (opcional)</label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              maxLength={1000}
              rows={2}
              className="rounded-lg border border-[#D8E3F5] px-3 py-2 text-sm"
              disabled={cargando}
            />
          </div>
          {error && <p className="text-xs text-[#B91C1C]">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#627A9B] hover:bg-[#F1F6FF]" disabled={cargando}>Cancelar</button>
            <button type="submit" className="rounded-lg bg-[#0439D9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#022FBF] disabled:opacity-60" disabled={cargando}>
              {cargando ? 'Reasignando...' : 'Reasignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
