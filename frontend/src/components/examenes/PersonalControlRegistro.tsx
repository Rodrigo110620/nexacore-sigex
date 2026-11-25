import { useEffect, useState } from 'react'
import { CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react'
import { personalDisponibleEnHorario, type PersonalControl } from '../../services/personalControlService'

/**
 * Paso de confirmación del registro: quién controlará el ingreso. Opcional (se puede asignar después en el detalle),
 * pero visible para no olvidarlo. Muestra quién está ocupado a esa hora y no deja marcarlo.
 */
export default function PersonalControlRegistro({ fecha, horaInicio, duracionMinutos, idMateria, idDocente, elegidos, onChange }: {
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
        PERSONAL DE CONTROL <span className="font-normal normal-case tracking-normal text-[#627A9B]">(opcional · {elegidos.length} elegido{elegidos.length === 1 ? '' : 's'})</span>
      </h3>
      <p className="mt-1 text-[11px] text-[#627A9B]">Quién controlará el ingreso. Si no eliges ahora, puedes asignarlo después en el detalle del examen.</p>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-[#B42318]">No se pudo cargar el personal de control. Podrás asignarlo después en el detalle del examen.</p>}
      {!personal && !error && (
        <p role="status" className="mt-2 flex items-center gap-2 text-xs text-[#627A9B]"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Revisando quién está libre a esa hora…</p>
      )}
      {personal && personal.length === 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-[#B45309]"><CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> No hay usuarios con el rol CONTROL. Créalos en Usuarios.</p>
      )}
      {personal && personal.length > 0 && (
        <ul className="mt-2 max-h-52 overflow-y-auto rounded-md border border-[#D8E3F5]">
          {personal.map((p) => {
            const ocupado = p.disponible === false
            return (
              <li key={p.idUsuario} className="border-b border-[#EEF2F8] last:border-b-0">
                <label className={`flex items-center gap-2.5 px-3 py-2 text-[13px] ${ocupado ? 'cursor-not-allowed bg-[#F8FAFC] text-[#94A3B8]' : 'cursor-pointer text-[#011140] hover:bg-[#F8FAFF]'}`}>
                  <input type="checkbox" disabled={ocupado} checked={elegidos.includes(p.idUsuario)} onChange={() => alternar(p.idUsuario)}
                    className="h-4 w-4 shrink-0 accent-[#0439D9]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{`${p.nombre} ${p.apellidos}`.trim()}</span>
                    <span className="block truncate text-[11px] text-[#627A9B]">{p.email}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ocupado ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#ECFDF3] text-[#05603A]'}`}>
                    {ocupado ? (p.conflictoHorario ?? 'Ocupado') : 'Disponible'}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
