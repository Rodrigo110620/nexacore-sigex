/** Estado de la cuenta del estudiante: queda pendiente hasta que él mismo la activa (CTA-01). */
export default function EstadoCuentaBadge({ tieneCuenta, compacto = false }: { tieneCuenta?: boolean; compacto?: boolean }) {
  return tieneCuenta
    ? <span className={`inline-flex shrink-0 items-center rounded-full bg-[#E9F1FF] px-2 py-0.5 font-semibold text-[#0439D9] ${compacto ? 'text-[9px]' : 'text-[10px]'}`}>Cuenta activa</span>
    : <span className={`inline-flex shrink-0 items-center rounded-full bg-[#FFF7E6] px-2 py-0.5 font-semibold text-[#B45309] ${compacto ? 'text-[9px]' : 'text-[10px]'}`}>Pendiente de activación</span>
}
