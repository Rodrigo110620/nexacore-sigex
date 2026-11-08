import { useEffect, useState } from 'react'
import axios from 'axios'
import { LoaderCircle, Pencil, ShieldCheck, UserRound } from 'lucide-react'
import ErrorCarga from '../ui/ErrorCarga'
import { asignarPersonal, personalDelExamen, personalDisponible, type PersonalControl } from '../../services/personalControlService'

const nombre = (p: PersonalControl) => `${p.nombre} ${p.apellidos}`.trim()

/**
 * Personal de control del examen (V53). Lo ven el ADMIN, el CONTROL y el docente del examen; lo cambian el
 * ADMIN y su docente. El CONTROL recibe reportes y avisos solo de sus exámenes asignados; puede controlar otro
 * como reemplazo, y ese registro queda marcado.
 */
export default function PersonalControlSeccion({ idExamen, puedeAsignar }: { idExamen: number; puedeAsignar: boolean }) {
  const [asignados, setAsignados] = useState<PersonalControl[] | null>(null)
  const [error, setError] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const [editando, setEditando] = useState(false)
  const [disponibles, setDisponibles] = useState<PersonalControl[] | null>(null)
  const [elegidos, setElegidos] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    let vigente = true
    personalDelExamen(idExamen)
      .then((lista) => { if (vigente) { setAsignados(lista); setError(false) } })
      .catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [idExamen, recarga])

  const abrir = () => {
    setEditando(true)
    setMensaje('')
    setElegidos(new Set((asignados ?? []).map((p) => p.idUsuario)))
    personalDisponible().then(setDisponibles).catch(() => setMensaje('No se pudo cargar el personal de control.'))
  }

  const alternar = (id: number) => setElegidos((prev) => {
    const nuevo = new Set(prev)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    return nuevo
  })

  const guardar = async () => {
    setGuardando(true)
    setMensaje('')
    try {
      setAsignados(await asignarPersonal(idExamen, [...elegidos]))
      setEditando(false)
    } catch (err) {
      setMensaje((axios.isAxiosError(err) && err.response?.data?.mensaje) || 'No se pudo guardar el personal de control.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-labelledby={`personal-control-${idExamen}`} className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#E9F1FF] text-[#0439D9]">
            <ShieldCheck size={15} aria-hidden="true" />
          </span>
          <h2 id={`personal-control-${idExamen}`} className="text-xs font-bold uppercase tracking-wide text-[#011140] sm:text-sm">Personal de control</h2>
        </div>
        {puedeAsignar && !editando && asignados && (
          <button type="button" onClick={abrir} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#D8E3F5] px-3 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
            <Pencil size={13} aria-hidden="true" /> {asignados.length ? 'Cambiar' : 'Asignar'}
          </button>
        )}
      </div>

      {error ? (
        <ErrorCarga mensaje="No se pudo cargar el personal de control." onReintentar={() => setRecarga((n) => n + 1)} />
      ) : !asignados ? (
        <p role="status" className="text-xs text-[#627A9B]">Cargando…</p>
      ) : editando ? (
        <div>
          <p className="text-xs text-[#627A9B]">Elige quién controla el ingreso. Verá los reportes y avisos de este examen.</p>
          {!disponibles && !mensaje ? (
            <p role="status" className="mt-2 flex items-center gap-2 text-xs text-[#627A9B]"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" />Cargando el personal…</p>
          ) : disponibles && disponibles.length === 0 ? (
            <p className="mt-2 text-xs text-[#627A9B]">No hay usuarios activos con el rol CONTROL.</p>
          ) : (
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2" aria-label="Personal de control disponible">
              {(disponibles ?? []).map((p) => (
                <li key={p.idUsuario}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 text-sm text-[#011140] has-[:checked]:border-[#0439D9] has-[:checked]:bg-[#F1F6FF]">
                    <input type="checkbox" checked={elegidos.has(p.idUsuario)} onChange={() => alternar(p.idUsuario)} className="h-4 w-4 accent-[#0439D9]" />
                    <span className="min-w-0"><span className="block truncate font-semibold">{nombre(p)}</span><span className="block truncate text-[11px] text-[#627A9B]">{p.email}</span></span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {mensaje && <p role="alert" className="mt-2 text-xs font-medium text-[#B91C1C]">{mensaje}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(false)} disabled={guardando} className="min-h-10 rounded-md border border-[#D8E3F5] px-4 text-sm font-semibold text-[#011140] hover:bg-[#F8FAFC]">Cancelar</button>
            <button type="button" onClick={() => void guardar()} disabled={guardando || !disponibles} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0439D9] px-4 text-sm font-bold text-white hover:bg-[#0C41E1] disabled:opacity-50">
              {guardando && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />} Guardar
            </button>
          </div>
        </div>
      ) : asignados.length === 0 ? (
        <p className="text-sm text-[#627A9B]">Sin personal de control asignado. Cualquier control puede registrar el ingreso.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Personal de control asignado">
          {asignados.map((p) => (
            <li key={p.idUsuario} className="inline-flex items-center gap-2 rounded-lg bg-[#F1F6FF] px-3 py-2 text-sm text-[#011140]">
              <UserRound size={15} className="text-[#0439D9]" aria-hidden="true" />
              <span><span className="font-semibold">{nombre(p)}</span><span className="block text-[11px] text-[#627A9B]">{p.email}</span></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
