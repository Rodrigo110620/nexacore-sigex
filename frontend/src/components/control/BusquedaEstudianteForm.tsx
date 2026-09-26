import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import type { TipoIdentificacion } from '../../services/identificacionService'

const ETIQUETAS: Record<TipoIdentificacion, string> = {
  codigo: 'Ingresa el Código Universitario:',
  ci: 'Ingresa el Carnet / CI:',
}

interface BusquedaEstudianteFormProps {
  tipo: TipoIdentificacion
  buscando?: boolean
  onBuscar: (valor: string) => void
}

/**
 * Formulario de búsqueda por código universitario o CI. Enter también busca.
 * La página lo monta con key={tipo}: al cambiar de mecanismo se remonta y el input queda vacío.
 */
export default function BusquedaEstudianteForm({ tipo, buscando = false, onBuscar }: BusquedaEstudianteFormProps) {
  const [valor, setValor] = useState('')
  const valorLimpio = valor.trim()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (valorLimpio && !buscando) onBuscar(valorLimpio)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#D8E3F5] bg-[#F8FBFF] p-4">
      <label htmlFor="valor-identificacion" className="mb-1 block text-xs font-semibold text-gray-700">
        {ETIQUETAS[tipo]}
      </label>
      <div className="flex gap-3">
        <input
          id="valor-identificacion"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          autoComplete="off"
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/30"
        />
        <button
          type="submit"
          disabled={!valorLimpio || buscando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#032db0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search size={16} aria-hidden="true" />
          Buscar
        </button>
      </div>
    </form>
  )
}
