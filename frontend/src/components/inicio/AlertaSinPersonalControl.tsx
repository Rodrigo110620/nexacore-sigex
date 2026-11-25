import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import { examenesSinPersonal, type ExamenSinPersonal } from '../../services/personalControlService'
import { formatFecha, horaCorta } from '../../utils/examenFormat'

/**
 * Inicio del ADMIN y del docente: los exámenes de esta semana que todavía no tienen personal de control, con un enlace
 * para asignarlo. Si no hay ninguno (o no se pudo consultar), no muestra nada.
 */
export default function AlertaSinPersonalControl() {
  const [examenes, setExamenes] = useState<ExamenSinPersonal[]>([])

  useEffect(() => {
    let vigente = true
    examenesSinPersonal(7).then((lista) => { if (vigente) setExamenes(Array.isArray(lista) ? lista : []) }).catch(() => undefined)
    return () => { vigente = false }
  }, [])

  if (examenes.length === 0) return null
  const visibles = examenes.slice(0, 5)
  return (
    <section role="status" aria-labelledby="sin-personal-control" className="rounded-xl border border-[#FEC84B] bg-[#FFFAEB] p-4 text-[#7A2E0E]">
      <h2 id="sin-personal-control" className="flex items-center gap-2 text-sm font-bold">
        <ShieldAlert size={17} aria-hidden="true" />
        {examenes.length === 1 ? '1 examen de esta semana no tiene' : `${examenes.length} exámenes de esta semana no tienen`} personal de control
      </h2>
      <p className="mt-0.5 text-xs">Asigna quién controlará el ingreso. Un día antes se avisa de nuevo si sigue sin nadie.</p>
      <ul className="mt-2 divide-y divide-[#FEDF89] overflow-hidden rounded-lg border border-[#FEDF89] bg-white">
        {visibles.map((e) => (
          <li key={e.idExamen}>
            <Link to={`/dashboard/examenes/${e.idExamen}/${e.idParalelo}`}
              className="flex items-center gap-3 px-3 py-2 text-xs text-[#011140] hover:bg-[#FFFCF5]">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.materia} · {e.grupo}</span>
                <span className="text-[#627A9B]">{formatFecha(e.fecha)} · {horaCorta(e.horaInicio)}{e.aulas > 1 ? ` · ${e.aulas} aulas` : ''}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-[#0439D9]">Asignar <ChevronRight size={14} aria-hidden="true" /></span>
            </Link>
          </li>
        ))}
      </ul>
      {examenes.length > visibles.length && (
        <p className="mt-1.5 text-[11px]">Y {examenes.length - visibles.length} más en Exámenes.</p>
      )}
    </section>
  )
}
