import { Eye } from 'lucide-react'
import type { EstudianteListItem } from '../../types/estudiante'

interface EstudianteTableProps {
  estudiantes: EstudianteListItem[]
  onViewClick?: (estudiante: EstudianteListItem) => void
}

function getInitials(nombre: string, apellidos: string): string {
  const n = nombre?.charAt(0)?.toUpperCase() ?? ''
  const a = apellidos?.charAt(0)?.toUpperCase() ?? ''
  return `${n}${a}` || 'E'
}

function formatCarreras(carreras: EstudianteListItem['carreras']): string {
  if (!carreras || carreras.length === 0) return 'Sin carrera'
  return carreras.map((c) => c.nombreCarrera).join(', ')
}

function formatFacultad(carreras: EstudianteListItem['carreras']): string {
  if (!carreras || carreras.length === 0) return ''
  return carreras.map((c) => c.nombreFacultad).join(', ')
}

export default function EstudianteTable({ estudiantes, onViewClick }: EstudianteTableProps) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-[#D8E3F5] bg-white">
      <table className="w-full min-w-[860px] text-left">
        <caption className="sr-only">Lista de estudiantes registrados</caption>
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627A9B]">
          <tr>
            <th scope="col" className="px-5 py-3 font-bold">Estudiante / Código</th>
            <th scope="col" className="px-5 py-3 font-bold">CI</th>
            <th scope="col" className="px-5 py-3 font-bold">Carrera Profesional</th>
            <th scope="col" className="px-5 py-3 text-center font-bold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDF1F7] bg-white text-sm text-[#011140]">
          {estudiantes.map((e) => (
            <tr key={e.id}>
              <th scope="row" className="px-5 py-3 font-normal">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1ECFF] text-xs font-bold text-[#0439D9]">
                    {getInitials(e.nombre, e.apellidos)}
                  </span>
                  <span>
                    <span className="block font-semibold">{e.nombre} {e.apellidos}</span>
                    <span className="mt-1 block text-xs text-gray-500">Cód: {e.codigoSis}</span>
                  </span>
                </div>
              </th>
              <td className="whitespace-nowrap px-5 py-3 text-gray-600">{e.ci}</td>
              <td className="px-5 py-3">
                <span className="block font-semibold text-[#011140]">{formatCarreras(e.carreras)}</span>
                <span className="block text-xs text-gray-500">{formatFacultad(e.carreras)}</span>
              </td>
              <td className="px-5 py-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => onViewClick?.(e)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#E1ECFF] px-3 py-1.5 text-xs font-semibold text-[#0439D9] hover:bg-[#D0E2FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2"
                  >
                    <Eye size={14} aria-hidden="true" />
                    Ver Ficha
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
