interface EmptyStateProps {
  message?: string
}

export default function EmptyState({ message = 'No hay usuarios para mostrar.' }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[#B8CBEF] bg-[#E9F1FF] px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-[#011140]">Sin usuarios</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  )
}