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
    <section aria-labelledby="estudiantes-examen" className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="estudiantes-examen" className="text-sm font-bold uppercase text-[#011140] sm:text-base">
          Estudiantes del examen
        </h2>
        <div role="group" aria-label="Filtrar por estado" className="grid grid-cols-3 gap-1 rounded-lg bg-[#F1F6FF] p-1 sm:flex sm:gap-0">
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
