/** Piezas compartidas por los paneles de inicio (ADMIN y CONTROL). */

export function EnVivo({ texto, oscuro }: { texto: string; oscuro?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${oscuro ? 'bg-white/15 text-white' : 'bg-[#DCFCE7] text-[#15803D]'}`}>
      <span className={`h-2 w-2 rounded-full ${oscuro ? 'bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]' : 'bg-[#16A34A] shadow-[0_0_6px_rgba(22,163,74,0.6)]'}`} aria-hidden="true" />
      {texto}
    </span>
  )
}
