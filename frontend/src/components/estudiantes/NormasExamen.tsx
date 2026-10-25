import { Accessibility, ScrollText } from 'lucide-react'
import type { MiExamen } from '../../services/panelEstudianteService'

/**
 * Normas del examen para el estudiante: las generales (iguales para todos) y sus adaptaciones (las
 * normas particulares, solo las suyas). Así no se entera recién en la puerta. Se actualiza en vivo
 * si el docente las cambia. Sin normas no muestra nada.
 */
export default function NormasExamen({ examen, className = '' }: { examen: MiExamen; className?: string }) {
  const generales = examen.normasGenerales ?? []
  const particulares = examen.normasParticulares ?? []
  if (generales.length === 0 && particulares.length === 0) return null

  return (
    <section aria-label="Normas del examen" className={`rounded-xl border border-[#D8E3F5] bg-[#F8FAFF] p-4 text-sm text-[#011140] ${className}`}>
      {generales.length > 0 && (
        <>
          <p className="flex items-center gap-2 font-bold text-[#092068]">
            <ScrollText size={18} className="shrink-0 text-[#0439D9]" aria-hidden="true" /> Normas del examen
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-9 marker:text-[#7C93B8]">
            {generales.map((norma, i) => <li key={i} className="break-words">{norma}</li>)}
          </ul>
        </>
      )}
      {particulares.length > 0 && (
        <div className={generales.length > 0 ? 'mt-3 border-t border-[#D8E3F5] pt-3' : ''}>
          <p className="flex items-center gap-2 font-bold text-[#092068]">
            <Accessibility size={18} className="shrink-0 text-[#0439D9]" aria-hidden="true" /> Tus adaptaciones
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-9 marker:text-[#7C93B8]">
            {particulares.map((norma, i) => <li key={i} className="break-words">{norma}</li>)}
          </ul>
          <p className="mt-2 text-xs text-[#627A9B]">Solo tú las ves. El personal de control también las tiene al identificarte.</p>
        </div>
      )}
    </section>
  )
}
