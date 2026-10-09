interface Props {
  visible: boolean
  onAccept: () => void
}

export default function EmailDomainSuggest({ visible, onAccept }: Props) {
  if (!visible) return null
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onAccept() }}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[#E1ECFF] px-2 py-1 text-[10px] font-bold text-[#0439D9] hover:bg-[#D0E2FF]"
    >
      @est.umss.edu
    </button>
  )
}