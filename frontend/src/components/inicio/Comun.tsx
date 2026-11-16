import PuntoVivo from '../ui/PuntoVivo'
/** Piezas compartidas por los paneles de inicio (ADMIN y CONTROL). */

export function EnVivo({ texto, oscuro }: { texto: string; oscuro?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${oscuro ? 'bg-white/15 text-white' : 'bg-[#DCFCE7] text-[#15803D]'}`}>
      <PuntoVivo claro={oscuro} />
      {texto}
    </span>
  )
}
