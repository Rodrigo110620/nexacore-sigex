import type { MateriaDocenteInfo } from '../../types/estudiante'

export default function MateriasDocente({ materias, compacto = false }: { materias: MateriaDocenteInfo[]; compacto?: boolean }) {
  return <ul
    className={compacto
      ? 'flex h-[68px] min-w-0 flex-col gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]'
      : 'flex flex-wrap gap-1.5'}
    tabIndex={compacto && materias.length > 2 ? 0 : undefined}
    aria-label="Materias matriculadas con este docente"
  >
    {materias.map(m => <li key={`${m.idMateria}-${m.idParalelo}`}
      title={`${m.materia} · Paralelo ${m.paralelo}`}
      className={compacto
        ? 'flex h-8 min-h-8 min-w-0 items-center gap-1 rounded-md bg-[#E9F1FF] px-2 text-xs text-[#011140]'
        : 'rounded-md bg-[#E9F1FF] px-2 py-1 text-xs text-[#011140]'}>
      <span className={compacto ? 'min-w-0 truncate' : undefined}>{m.materia}</span>
      <span className={compacto ? 'shrink-0 whitespace-nowrap text-[#45628D]' : 'text-[#45628D]'}>· Paralelo {m.paralelo}</span>
    </li>)}
  </ul>
}
