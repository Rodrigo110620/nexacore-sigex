import { useState, type FormEvent } from 'react'
import { CircleAlert, Hash, Search } from 'lucide-react'
import type { TipoIdentificacion } from '../../services/identificacionService'
import { DIGITOS_IDENTIFICADOR, validarIdentificador } from '../../utils/identificacionValidators'

const ETIQUETAS: Record<TipoIdentificacion, string> = {
  codigo: 'Ingresa el Código Universitario:',
  ci: 'Ingresa el Carnet / CI:',
}

interface BusquedaEstudianteFormProps {
  tipo: TipoIdentificacion
  buscando?: boolean
  /** Valor con el que se monta el input (p. ej. el código que llega por ?codigo=). */
  valorInicial?: string
  onBuscar: (valor: string) => void
}

/**
 * Formulario de búsqueda por código universitario o CI. Enter también busca.
 * La página lo monta con key={tipo}: al cambiar de mecanismo se remonta y el input queda vacío.
 * Solo busca si el valor cumple el formato del mecanismo (BUG-A01); si no, muestra el motivo.
 */
export default function BusquedaEstudianteForm({ tipo, buscando = false, valorInicial = '', onBuscar }: BusquedaEstudianteFormProps) {
  const [valor, setValor] = useState(valorInicial)
  const [intento, setIntento] = useState(false)
  const error = validarIdentificador(tipo, valor)
  // Un carácter no permitido (escrito o pegado) se avisa al instante; el largo y los códigos
  // ficticios, al completar los dígitos, al salir del campo o al intentar buscar.
  const errorVisible =
    error && (intento || /[^0-9]/.test(valor) || valor.length >= DIGITOS_IDENTIFICADOR[tipo]) ? error : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIntento(true)
    if (!error && !buscando) onBuscar(valor)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#E7E9EE] bg-[#F4F4F5] p-4 sm:p-5">
      <label htmlFor="valor-identificacion" className="mb-2 block text-[11px] font-semibold text-[#303846] sm:text-xs">
        {ETIQUETAS[tipo]}
      </label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-md border bg-white px-3 ${errorVisible ? 'border-[#F87171]' : 'border-[#E2E5EB]'}`}>
          <Hash size={17} className="shrink-0 text-[#597197]" aria-hidden="true" />
          <input
            id="valor-identificacion"
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            onBlur={() => setIntento(valor !== '')}
            inputMode="numeric"
            aria-invalid={Boolean(errorVisible)}
            aria-describedby={errorVisible ? 'valor-identificacion-error' : undefined}
            autoComplete="off"
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-semibold text-[#073AA9] outline-none placeholder:font-normal sm:py-3 sm:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={!valor || Boolean(errorVisible) || buscando}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0439D9] px-3.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:px-4"
        >
          <Search size={17} aria-hidden="true" />
          Buscar
        </button>
      </div>
      {errorVisible && (
        <p id="valor-identificacion-error" className="mt-2 flex items-center gap-1 text-xs text-[#B91C1C]">
          <CircleAlert size={12} aria-hidden="true" /> {errorVisible}
        </p>
      )}
    </form>
  )
}
