/**
 * Punto verde que late (con un anillo que se expande): marca lo que está «en vivo» o «en curso».
 * Igual en toda la app; sin animación si el sistema pide reducir movimiento.
 */
export default function PuntoVivo({ claro = false, tamano = 'h-2 w-2' }: { claro?: boolean; tamano?: string }) {
  const color = claro ? 'bg-[#4ADE80]' : 'bg-[#22C55E]'
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 ${tamano}`}>
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${color}`} />
      <span className={`relative inline-flex h-full w-full rounded-full ${claro ? 'bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]' : 'bg-[#16A34A]'}`} />
    </span>
  )
}
