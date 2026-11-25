import { useEffect, useState } from 'react'
import { CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react'
import { personalDisponibleEnHorario, type PersonalControl } from '../../services/personalControlService'

/**
 * Paso de confirmación del registro: quién controlará el ingreso. Opcional (se puede asignar después en el detalle),
 * pero visible para no olvidarlo. Muestra quién está ocupado a esa hora y no deja marcarlo.
 */
export default function PersonalControlRegistro({ fecha, horaInicio, duracionMinutos, idMateria, idDocente, elegidos, onChange, minimo = 0 }: {
  /** Con aulas adicionales: cuántas personas hacen falta como mínimo (una por cada aula adicional). */
  minimo?: number
  fecha: string
  horaInicio: string
  duracionMinutos: number | null
  idMateria?: number | null
  idDocente?: number | null
  elegidos: number[]
  onChange: (ids: number[]) => void
}) {
  // El resultado queda guardado con el horario que se consultó: si el horario cambia, se ve «cargando» hasta la respuesta.
  const clave = [fecha, horaInicio, duracionMinutos, idMateria, idDocente].join('|')
  const [carga, setCarga] = useState<{ clave: string; personal: PersonalControl[] | null; error: boolean } | null>(null)
  const vigente = carga?.clave === clave ? carga : null
  const personal = vigente?.personal ?? null
  const error = vigente?.error ?? false

  useEffect(() => {
    if (!fecha || !horaInicio || !duracionMinutos) return
    let activo = true
    personalDisponibleEnHorario({ fecha, horaInicio: horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio, duracionMinutos, idMateria, idDocente })
      .then((lista) => {
        if (!activo) return
        setCarga({ clave, personal: lista, error: false })
        // Si cambió el horario y alguien marcado quedó ocupado, se desmarca.
        const libres = new Set(lista.filter((p) => p.disponible !== false).map((p) => p.idUsuario))
        if (elegidos.some((id) => !libres.has(id))) onChange(elegidos.filter((id) => libres.has(id)))
      })
      .catch(() => { if (activo) setCarga({ clave, personal: null, error: true }) })
    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar el horario
  }, [clave])

  const alternar = (id: number) => onChange(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id])

  return (
    <section aria-labelledby="registro-personal-control" className="rounded-xl border border-[#D8E3F5] bg-white p-4">
      <h3 id="registro-personal-control" className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#011140]">
        <ShieldCheck size={15} className="text-[#0439D9]" aria-hidden="true" />
        PERSONAL DE CONTROL <span className="font-normal normal-case tracking-normal text-[#627A9B]">({minimo > 0 ? `mínimo ${minimo}` : 'opcional'} · {elegidos.length} elegido{elegidos.length === 1 ? '' : 's'})</span>
      </h3>
      {minimo > 0 ? (
        <p className={`mt-1 text-[11px] font-semibold ${elegidos.length < minimo ? 'text-[#B45309]' : 'text-[#05603A]'}`}>
          El examen se reparte en {minimo + 1} aulas: elige al menos {minimo} {minimo === 1 ? 'persona' : 'personas'} (una por cada aula adicional).
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-[#627A9B]">Quién controlará el ingreso. Si no eliges ahora, puedes asignarlo después en el detalle del examen.</p>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-[#B42318]">No se pudo cargar el personal de control. Podrás asignarlo después en el detalle del examen.</p>}
      {!personal && !error && (
        <p role="status" className="mt-2 flex items-center gap-2 text-xs text-[#627A9B]"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Revisando quién está libre a esa hora…</p>
      )}
      {personal && personal.length === 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-[#B45309]"><CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> No hay usuarios con el rol CONTROL. Créalos en Usuarios.</p>
      )}
      {personal && personal.length > 0 && <ListaPersonal personal={personal} elegidos={elegidos} alternar={alternar} />}
    </section>
  )
}

/** Solo los disponibles para marcar; los ocupados se pueden ver plegados, con el examen con el que chocan. */
export function ListaPersonal({ personal, elegidos, alternar, deshabilitado = false }: {
  personal: PersonalControl[]
  elegidos: number[]
  alternar: (id: number) => void
  deshabilitado?: boolean
}) {
  const libres = personal.filter((p) => p.disponible !== false)
  const ocupados = personal.filter((p) => p.disponible === false)
  return (
    <>
      {libres.length === 0 ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-[#FFFAEB] p-2 text-xs text-[#7A2E0E]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Todo el personal de control tiene otro examen a esa hora. Cambia el horario o asígnalo después.
        </p>
      ) : (
        <ul aria-label="Personal de control disponible" className="mt-2 max-h-52 overflow-y-auto rounded-md border border-[#D8E3F5]">
          {libres.map((p) => (
            <li key={p.idUsuario} className="border-b border-[#EEF2F8] last:border-b-0">
              <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-[#011140] hover:bg-[#F8FAFF]">
                <input type="checkbox" disabled={deshabilitado} checked={elegidos.includes(p.idUsuario)} onChange={() => alternar(p.idUsuario)}
                  className="h-4 w-4 shrink-0 accent-[#0439D9]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{`${p.nombre} ${p.apellidos}`.trim()}</span>
                  <span className="block truncate text-[11px] text-[#627A9B]">{p.email}</span>
                </span>
                <span className="shrink-0 rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-bold text-[#05603A]">Disponible</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {ocupados.length > 0 && (
        <details className="mt-2 text-[11px] text-[#627A9B]">
          <summary className="cursor-pointer font-semibold text-[#45628D]">
            {ocupados.length === 1 ? '1 ocupado' : `${ocupados.length} ocupados`} a esa hora
          </summary>
          <ul className="mt-1 space-y-0.5 pl-4">
            {ocupados.map((p) => (
              <li key={p.idUsuario}>{`${p.nombre} ${p.apellidos}`.trim()} · {p.conflictoHorario ?? 'Ocupado'}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
