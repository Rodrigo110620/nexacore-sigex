import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { MateriaDocenteInfo } from '../../types/estudiante'

function Lista({ materias }: { materias: MateriaDocenteInfo[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Materias matriculadas con este docente">
      {materias.map((m) => (
        <li key={`${m.idMateria}-${m.idParalelo}`} title={`${m.materia} · ${m.paralelo}`}
          className="rounded-md bg-[#E9F1FF] px-2 py-1 text-[13px] font-medium text-[#011140]">
          {m.materia} <span className="font-semibold text-[#0439D9]">· {m.paralelo}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Materias del estudiante con el docente. En la lista (compacto) se pliega: con una sola materia la muestra; con
 * más, un botón "N materias" que las despliega al tocarlo, para no llenar la fila de chips.
 */
export default function MateriasDocente({ materias, compacto = false }: { materias: MateriaDocenteInfo[]; compacto?: boolean }) {
  const [abierta, setAbierta] = useState(false)
  if (!compacto || materias.length <= 1) return <Lista materias={materias} />
  return (
    <div>
      <button type="button" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)}
        className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[#D8E3F5] bg-white px-2.5 text-[13px] font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
        {materias.length} materias
        <ChevronDown size={14} className={`transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {abierta && <div className="mt-1.5"><Lista materias={materias} /></div>}
    </div>
  )
}
