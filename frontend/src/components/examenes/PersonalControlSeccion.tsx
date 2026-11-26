import { useEffect, useState } from 'react'
import axios from 'axios'
import { LoaderCircle, Pencil, ShieldCheck, UserRound } from 'lucide-react'
import ErrorCarga from '../ui/ErrorCarga'
import { ListaPersonal } from './PersonalControlRegistro'
import { asignarPersonal, personalDelExamen, personalDisponibleParaExamen, type PersonalControl } from '../../services/personalControlService'

const nombre = (p: PersonalControl) => `${p.nombre} ${p.apellidos}`.trim()

/**
 * Personal de control del examen (V53). Lo ven el ADMIN, el CONTROL y el docente del examen; lo cambian el
 * ADMIN y su docente. El personal con rol CONTROL debe estar asignado al examen para registrar ingresos.
 */
export default function PersonalControlSeccion({ idExamen, puedeAsignar, aulas = [] }: {
  idExamen: number
  puedeAsignar: boolean
  /** Aulas del examen (principal y adicionales): con más de una, cada control queda a cargo de una (V66). */
  aulas?: { idAmbiente: number; nombre: string }[]
}) {
  const [asignados, setAsignados] = useState<PersonalControl[] | null>(null)
  const [error, setError] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const [editando, setEditando] = useState(false)
  const [disponibles, setDisponibles] = useState<PersonalControl[] | null>(null)
  const [elegidos, setElegidos] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [aulaDe, setAulaDe] = useState<Record<number, number>>({})
  const minimo = aulas.length - 1
  const variasAulas = minimo > 0

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
    setAulaDe(Object.fromEntries((asignados ?? []).filter((p) => p.idAmbiente).map((p) => [p.idUsuario, p.idAmbiente as number])))
    personalDisponibleParaExamen(idExamen).then(setDisponibles).catch(() => setMensaje('No se pudo verificar el horario del personal. Intenta nuevamente.'))
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
      // Solo las aulas elegidas a mano; las demás las reparte el servidor (una por aula).
      const aulasElegidas = Object.fromEntries(Object.entries(aulaDe).filter(([id]) => elegidos.has(Number(id))))
      setAsignados(await asignarPersonal(idExamen, [...elegidos], variasAulas ? aulasElegidas : undefined))
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

      {variasAulas && (
        <p className="mb-2 text-sm text-[#627A9B]">
          El examen se reparte en {aulas.length} aulas: requiere al menos {minimo} {minimo === 1 ? 'persona' : 'personas'} de control (una por cada aula adicional).
        </p>
      )}
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
            <ListaPersonal personal={disponibles ?? []} elegidos={[...elegidos]} alternar={alternar} deshabilitado={guardando} />
          )}
          {variasAulas && elegidos.size > 0 && disponibles && (
            <div className="mt-3 rounded-md border border-[#D8E3F5] bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold text-[#011140]">Aula de cada uno</p>
              <p className="text-[11px] text-[#627A9B]">El examen se reparte en {aulas.length} aulas. Si no eliges, se asigna uno por aula, en orden.</p>
              <ul className="mt-2 space-y-1.5">
                {(disponibles ?? []).filter((p) => elegidos.has(p.idUsuario)).map((p) => (
                  <li key={p.idUsuario} className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span className="truncate font-semibold text-[#011140]">{nombre(p)}</span>
                    <select aria-label={`Aula de ${nombre(p)}`} value={aulaDe[p.idUsuario] ?? ''} disabled={guardando}
                      onChange={(e) => setAulaDe((prev) => {
                        const nuevo = { ...prev }
                        if (e.target.value) nuevo[p.idUsuario] = Number(e.target.value)
                        else delete nuevo[p.idUsuario]
                        return nuevo
                      })}
                      className="h-9 rounded-md border border-[#C9D7EC] bg-white px-2 text-xs text-[#011140] sm:w-44">
                      <option value="">Automática</option>
                      {aulas.map((a) => <option key={a.idAmbiente} value={a.idAmbiente}>Aula {a.nombre}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
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
        <p className="text-sm text-[#627A9B]">
          Sin personal de control asignado.{' '}
          {!variasAulas && 'El docente responsable puede realizar el control de su examen. '}
          El personal de control debe estar asignado para registrar ingresos.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Personal de control asignado">
          {asignados.map((p) => (
            <li key={p.idUsuario} className="inline-flex items-center gap-2 rounded-lg bg-[#F1F6FF] px-3 py-2 text-sm text-[#011140]">
              <UserRound size={15} className="text-[#0439D9]" aria-hidden="true" />
              <span><span className="font-semibold">{nombre(p)}</span><span className="block text-[11px] text-[#627A9B]">{p.email}</span></span>
              {p.ambiente && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#0439D9]">Aula {p.ambiente}</span>}
            </li>
          ))}
        </ul>
      )}
      {!editando && asignados && variasAulas && (() => {
        // Aulas del examen que nadie controla (con personal asignado).
        const cubiertas = new Set(asignados.map((p) => p.idAmbiente))
        const sinControl = asignados.length === 0 ? [] : aulas.filter((a) => !cubiertas.has(a.idAmbiente))
        return sinControl.length > 0 && (
          <p role="status" className="mt-2 rounded-md bg-[#FFFAEB] px-3 py-2 text-[11px] font-semibold text-[#7A2E0E]">
            {sinControl.length === 1 ? `El aula ${sinControl[0].nombre} no tiene` : `Las aulas ${sinControl.map((a) => a.nombre).join(', ')} no tienen`} personal de control.
          </p>
        )
      })()}
    </section>
  )
}
