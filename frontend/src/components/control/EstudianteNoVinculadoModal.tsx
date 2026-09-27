import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'
import type { EstudianteIdentificado } from '../../services/identificacionService'

interface EstudianteNoVinculadoModalProps {
  estudiante: EstudianteIdentificado
  materia?: string
  aula?: string
  onCerrar: () => void
}

/** Aviso para un estudiante que existe pero no está registrado en el examen. Escape también cierra. */
export default function EstudianteNoVinculadoModal({
  estudiante,
  materia,
  aula,
  onCerrar,
}: EstudianteNoVinculadoModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCerrar])

  const datos: [string, string | undefined][] = [
    ['Código', estudiante.codigoSis],
    ['CI', estudiante.ci],
    ['Materia', materia],
    ['Aula', aula],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-vinculado-title"
      aria-describedby="no-vinculado-descripcion"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#D8E3F5] bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FDE68A] bg-[#FFF8E7] text-[#D97706]">
            <TriangleAlert size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="no-vinculado-title" className="text-base font-bold text-[#011140]">
              Estudiante no vinculado
            </h2>
            <p id="no-vinculado-descripcion" className="mt-1 text-sm text-gray-600">
              <span className="font-semibold text-[#011140]">
                {estudiante.nombre} {estudiante.apellidos}
              </span>{' '}
              no está registrado en este examen.
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-[#FDE68A] bg-[#FFF8E7] p-3 text-xs">
          {datos
            .filter(([, valor]) => valor)
            .map(([label, valor]) => (
              <div key={label} className="flex gap-1">
                <dt className="text-[#627A9B]">{label}:</dt>
                <dd className="font-semibold text-[#011140]">{valor}</dd>
              </div>
            ))}
        </dl>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onCerrar}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#011140] hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
