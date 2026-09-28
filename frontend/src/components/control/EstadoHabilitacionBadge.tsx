/** Badge de habilitación con los colores de StatusBadge; DESHABILITADO se muestra como "NO HABILITADO". */
export default function EstadoHabilitacionBadge({ habilitado }: { habilitado: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        habilitado ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FDECEC] text-[#B91C1C]'
      }`}
    >
      {habilitado ? 'HABILITADO' : 'NO HABILITADO'}
    </span>
  )
}
