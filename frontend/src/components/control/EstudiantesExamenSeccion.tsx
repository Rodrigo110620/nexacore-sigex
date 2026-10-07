import UserPagination from '../users/TablePagination'
import EstudiantesExamenLista from './EstudiantesExamenLista'
import type { EstudianteAsignado, FiltroEstado, ResumenEstudiantes } from '../../services/controlExamenService'
import type { PageResponse } from '../../types/userApi'

const PESTANAS: { valor: FiltroEstado; label: string; cuenta: keyof ResumenEstudiantes }[] = [
  { valor: 'TODOS', label: 'Todos', cuenta: 'total' },
  { valor: 'HABILITADOS', label: 'Habilitados', cuenta: 'habilitados' },
  { valor: 'NO_HABILITADOS', label: 'No habilitados', cuenta: 'noHabilitados' },
]

interface EstudiantesExamenSeccionProps {
  idExamen: number
  resumen?: ResumenEstudiantes
  estado: FiltroEstado
  cambiarEstado: (estado: FiltroEstado) => void
  setPage: (page: number) => void
  pagina?: PageResponse<EstudianteAsignado>
  error?: string
  cargando: boolean
}

/** Lista "Estudiantes del examen" con pestañas por estado, carga, vacío, error y paginación. */
export default function EstudiantesExamenSeccion({
  idExamen,
  resumen,
  estado,
  cambiarEstado,
  setPage,
  pagina,
  error,
  cargando,
}: EstudiantesExamenSeccionProps) {
  return (
    <section aria-labelledby="estudiantes-examen" className="rounded-xl bg-transparent md:border md:border-[#D8E3F5] md:bg-white md:p-3 md:shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 md:mb-4">
        <h2 id="estudiantes-examen" className="text-[11px] font-bold uppercase text-[#011140] sm:text-base">
          Estudiantes del examen
        </h2>
        <span className="shrink-0 text-[10px] text-[#627A9B] md:hidden">Total: {resumen?.total ?? '—'}</span>
        <div role="group" aria-label="Filtrar por estado" className="hidden gap-1 rounded-lg bg-[#F1F6FF] p-1 md:flex md:gap-0">
          {PESTANAS.map(({ valor, label, cuenta }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={estado === valor}
              onClick={() => cambiarEstado(valor)}
              className={`flex-1 rounded-md px-1 py-1.5 text-xs font-semibold sm:whitespace-nowrap sm:px-3 ${
                estado === valor ? 'bg-white text-[#011140] shadow-sm' : 'text-[#627A9B] hover:text-[#011140]'
              }`}
            >
              {label}
              {resumen ? ` (${resumen[cuenta]})` : ''}
            </button>
          ))}
        </div>
      </div>
      <div role="group" aria-label="Filtrar por estado en móvil" className="mb-2 grid grid-cols-3 gap-1 rounded-lg bg-[#F1F3F6] p-1 md:hidden">
        {PESTANAS.map(({ valor, cuenta }) => (
          <button
            key={valor}
            type="button"
            aria-pressed={estado === valor}
            onClick={() => cambiarEstado(valor)}
            className={`min-w-0 rounded-md px-1 py-1.5 text-[10px] font-semibold ${estado === valor ? 'bg-white text-[#011140] shadow-sm' : 'text-[#627A9B]'}`}
          >
            {valor === 'TODOS' ? 'Todos' : valor === 'HABILITADOS' ? 'Habilitados' : 'Bloqueados'}
            {resumen ? ` (${resumen[cuenta]})` : ''}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
          {error}
        </p>
      ) : cargando || !pagina ? (
        <p className="py-10 text-center text-sm text-gray-500">Cargando estudiantes…</p>
      ) : pagina.contenido.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          {estado === 'TODOS' ? 'No hay estudiantes asignados a este examen' : 'No hay estudiantes con este estado.'}
        </p>
      ) : (
        <>
          <EstudiantesExamenLista idExamen={idExamen} estudiantes={pagina.contenido} />
          <div className="mt-3">
            <UserPagination
              compact
              page={pagina.pagina}
              totalPages={pagina.totalPaginas}
              totalRecords={pagina.totalRegistros}
              pageSize={pagina.tamano}
              onPageChange={setPage}
              itemLabel="estudiantes asignados"
            />
          </div>
        </>
      )}
    </section>
  )
}
