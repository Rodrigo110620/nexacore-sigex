import { useState } from 'react'
import { razonesInhabilitacion } from '../../utils/razonesInhabilitacion'

/** Razones que se muestran sin "Ver todo"; las demás quedan ocultas hasta pedirlas. */
const VISIBLES = 2
/** Una razón más larga que esto se recorta a dos líneas hasta presionar "Ver todo". */
const LARGO_RECORTE = 90

interface Props {
  motivo: string | null | undefined
  /** Texto cuando el estudiante no tiene ninguna razón registrada. */
  sinRazon?: string
  className?: string
}

/** Lista de razones de inhabilitación del estudiante en el examen, con "Ver todo" si no caben (ACCS HU#4). */
export default function RazonesInhabilitacion({ motivo, sinRazon = 'Sin motivo registrado', className = '' }: Props) {
  const razones = razonesInhabilitacion(motivo)
  const [completo, setCompleto] = useState(false)

  if (razones.length === 0) return <p className={className}>{sinRazon}</p>

  const recortar = razones.length > VISIBLES || razones.some((r) => r.length > LARGO_RECORTE)
  const mostradas = completo ? razones : razones.slice(0, VISIBLES)

  return (
    <div className={className}>
      <ul aria-label="Razones de inhabilitación" className="space-y-1">
        {mostradas.map((razon, i) => (
          <li key={`${i}-${razon}`} className={`break-words ${completo ? '' : 'line-clamp-2'}`}>
            {razones.length > 1 ? `${i + 1}. ` : ''}{razon}
          </li>
        ))}
      </ul>
      {recortar && (
        <button
          type="button"
          onClick={() => setCompleto((v) => !v)}
          aria-expanded={completo}
          className="mt-1 text-[11px] font-semibold text-[#0439D9] hover:underline"
        >
          {completo ? 'Ver menos' : `Ver todo${razones.length > VISIBLES ? ` (${razones.length})` : ''}`}
        </button>
      )}
    </div>
  )
}
