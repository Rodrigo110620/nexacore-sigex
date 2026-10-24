import useTiempoExamen from '../../hooks/useTiempoExamen'
import { ETIQUETA_FASE, type FaseExamen, type HorarioExamen } from '../../utils/tiempoExamen'

const COLORES: Record<FaseExamen, { texto: string; punto: string; fondo: string }> = {
  programado: { texto: 'text-[#0439D9]', punto: 'bg-[#0439D9]', fondo: 'bg-[#E9F1FF]' },
  en_curso: { texto: 'text-[#15803D]', punto: 'bg-[#16A34A]', fondo: 'bg-[#DCFCE7]' },
  finalizado: { texto: 'text-[#627A9B]', punto: 'bg-[#94A3B8]', fondo: 'bg-[#F1F5F9]' },
  cancelado: { texto: 'text-[#B91C1C]', punto: 'bg-[#B91C1C]', fondo: 'bg-[#FDECEC]' },
}

interface Props {
  examen: HorarioExamen
  /** "punto" para listas; "pastilla" para encabezados. */
  variante?: 'punto' | 'pastilla'
  className?: string
}

/** Estado del examen según la hora del servidor; pasa solo de Programado a En curso y a Finalizado. */
export default function EstadoExamenBadge({ examen, variante = 'punto', className = '' }: Props) {
  // En listas basta con revisar cada 15 s: solo importa que la fase cambie a tiempo.
  const tiempo = useTiempoExamen(examen, 15_000)
  const fase: FaseExamen = tiempo?.fase ?? (examen.estado === 'cancelado' ? 'cancelado' : 'programado')
  const c = COLORES[fase]
  const enCurso = fase === 'en_curso'

  const punto = (
    <span aria-hidden="true" className="relative inline-flex h-2 w-2 shrink-0">
      {enCurso && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:hidden" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${c.punto}`} />
    </span>
  )

  if (variante === 'pastilla') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${c.fondo} ${c.texto} ${className}`}>
        {punto}
        {ETIQUETA_FASE[fase]}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${c.texto} ${className || 'text-[11px]'}`}>
      {punto}
      {ETIQUETA_FASE[fase]}
    </span>
  )
}
