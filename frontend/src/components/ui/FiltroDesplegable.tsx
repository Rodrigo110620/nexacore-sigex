import { Check, ChevronDown, Search } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

export interface OpcionDesplegable {
  value: string
  label: string
  /** Encabezado bajo el que se agrupa la opción (p. ej. la facultad de una carrera). */
  grupo?: string
  /** Se muestra en gris con este motivo (p. ej. "Ocupada") y no se puede elegir. */
  deshabilitada?: string
}

interface FiltroDesplegableProps {
  id: string
  value: string
  onChange: (value: string) => void
  opciones: OpcionDesplegable[]
  /** Primera opción, de valor vacío: "Todas las facultades". */
  textoTodas: string
  placeholderBusqueda?: string
  disabled?: boolean
  /** Clases de alto, borde y texto del botón, para encajar en cada formulario. */
  className?: string
}

const MOSTRAR_BUSCADOR_DESDE = 8
const ANCHO_MINIMO = 288
const MARGEN = 8

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Desplegable de filtro con buscador y grupos. Reemplaza al <select> nativo, que corta los
 * nombres largos y no agrupa. La lista se abre en un portal con posición fija para que el
 * overflow de los modales no la recorte, y se abre hacia arriba si no hay espacio abajo.
 */
export default function FiltroDesplegable({
  id,
  value,
  onChange,
  opciones,
  textoTodas,
  placeholderBusqueda = 'Buscar…',
  disabled = false,
  className = '',
}: FiltroDesplegableProps) {
  const listaId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const buscadorRef = useRef<HTMLInputElement | null>(null)
  const listaRef = useRef<HTMLDivElement | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [activo, setActivo] = useState(0)
  const [estilo, setEstilo] = useState<CSSProperties>({})
  const [altoLista, setAltoLista] = useState(320)

  const buscable = opciones.length >= MOSTRAR_BUSCADOR_DESDE
  const seleccion = opciones.find((o) => o.value === value)
  const etiqueta = seleccion?.label ?? textoTodas

  const visibles = useMemo(() => {
    const todas: OpcionDesplegable = { value: '', label: textoTodas }
    const q = normalizar(busqueda.trim())
    if (!q) return [todas, ...opciones]
    return opciones.filter((o) => normalizar(o.label).includes(q) || normalizar(o.grupo ?? '').includes(q))
  }, [busqueda, opciones, textoTodas])

  const calcularPosicion = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const ancho = Math.min(Math.max(r.width, ANCHO_MINIMO), window.innerWidth - 2 * MARGEN)
    const left = Math.min(Math.max(r.left, MARGEN), window.innerWidth - ancho - MARGEN)
    const espacioAbajo = window.innerHeight - r.bottom - MARGEN
    const espacioArriba = r.top - MARGEN
    const haciaArriba = espacioAbajo < 240 && espacioArriba > espacioAbajo
    const disponible = (haciaArriba ? espacioArriba : espacioAbajo) - 4
    // El buscador ocupa ~52 px; el resto es para la lista.
    setAltoLista(Math.max(120, Math.min(320, disponible - (buscable ? 52 : 0))))
    setEstilo(haciaArriba
      ? { left, width: ancho, bottom: window.innerHeight - r.top + 4 }
      : { left, width: ancho, top: r.bottom + 4 })
  }, [buscable])

  const abrir = () => {
    if (disabled) return
    setBusqueda('')
    setActivo(Math.max(0, [{ value: '' }, ...opciones].findIndex((o) => o.value === value)))
    setAbierto(true)
  }

  const cerrar = (devolverFoco = false) => {
    setAbierto(false)
    if (devolverFoco) triggerRef.current?.focus()
  }

  const seleccionar = (opcion: OpcionDesplegable) => {
    if (opcion.deshabilitada) return
    onChange(opcion.value)
    cerrar(true)
  }

  useLayoutEffect(() => {
    if (!abierto) return
    calcularPosicion()
    window.addEventListener('resize', calcularPosicion)
    window.addEventListener('scroll', calcularPosicion, true)
    return () => {
      window.removeEventListener('resize', calcularPosicion)
      window.removeEventListener('scroll', calcularPosicion, true)
    }
  }, [abierto, calcularPosicion])

  useEffect(() => {
    if (!abierto) return
    ;(buscable ? buscadorRef.current : listaRef.current)?.focus()
    const alPresionarFuera = (event: MouseEvent) => {
      const objetivo = event.target as Node
      if (!panelRef.current?.contains(objetivo) && !triggerRef.current?.contains(objetivo)) cerrar()
    }
    document.addEventListener('mousedown', alPresionarFuera)
    return () => document.removeEventListener('mousedown', alPresionarFuera)
  }, [abierto, buscable])

  useEffect(() => {
    if (abierto) document.getElementById(`${listaId}-${activo}`)?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo, listaId])

  const alTeclearEnTrigger = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      abrir()
    }
  }

  const alTeclearEnPanel = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const paso = event.key === 'ArrowDown' ? 1 : -1
      setActivo((i) => Math.min(Math.max(i + paso, 0), visibles.length - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const opcion = visibles[activo]
      if (opcion) seleccionar(opcion)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cerrar(true)
    } else if (event.key === 'Tab') {
      cerrar()
    }
  }

  const activoId = visibles[activo] ? `${listaId}-${activo}` : undefined

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? listaId : undefined}
        disabled={disabled}
        title={etiqueta}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclearEnTrigger}
        className={`relative flex w-full min-w-0 items-center border border-[#B8CBEF] bg-white pl-3 pr-8 text-left text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-gray-100 ${abierto ? 'ring-2 ring-[#DCE7FF]' : ''} ${className}`}
      >
        <span className={`block min-w-0 truncate ${seleccion ? '' : 'text-[#45628D]'}`}>{etiqueta}</span>
        <ChevronDown
          aria-hidden="true"
          size={17}
          className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', ...estilo }}
          onKeyDown={alTeclearEnPanel}
          className="z-[70] overflow-hidden rounded-xl border border-[#D8E3F5] bg-white shadow-xl"
        >
          {buscable && (
            <div className="relative border-b border-[#E4E9F2] p-2">
              <Search aria-hidden="true" size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#627A9B]" />
              <input
                ref={buscadorRef}
                type="search"
                value={busqueda}
                maxLength={40}
                onChange={(e) => { setBusqueda(e.target.value); setActivo(0) }}
                placeholder={placeholderBusqueda}
                aria-label={placeholderBusqueda}
                aria-controls={listaId}
                aria-activedescendant={activoId}
                autoComplete="off"
                className="h-9 w-full rounded-lg border border-[#D8E3F5] bg-[#F8FAFD] pl-8 pr-2 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]"
              />
            </div>
          )}
          <div
            ref={listaRef}
            id={listaId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={id}
            aria-activedescendant={buscable ? undefined : activoId}
            style={{ maxHeight: altoLista }}
            className="overflow-y-auto overscroll-contain py-1 focus:outline-none"
          >
            {visibles.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-[#627A9B]">Sin coincidencias</p>
            )}
            {visibles.map((opcion, i) => {
              const nuevoGrupo = opcion.grupo && opcion.grupo !== visibles[i - 1]?.grupo
              const elegida = opcion.value === value
              return (
                <div key={`${opcion.grupo ?? ''}-${opcion.value}`}>
                  {nuevoGrupo && (
                    <p role="presentation" className="sticky top-0 z-10 bg-[#F3F7FD] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#45628D]">
                      {opcion.grupo}
                    </p>
                  )}
                  <div
                    id={`${listaId}-${i}`}
                    role="option"
                    aria-selected={elegida}
                    aria-disabled={opcion.deshabilitada ? true : undefined}
                    onMouseEnter={() => setActivo(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => seleccionar(opcion)}
                    className={`flex items-start gap-2 px-3 py-2 text-sm leading-snug ${
                      opcion.deshabilitada ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'
                    } ${i === activo && !opcion.deshabilitada ? 'bg-[#E9F1FF]' : ''} ${
                      opcion.deshabilitada ? '' : elegida ? 'font-semibold text-[#0439D9]' : 'text-[#011140]'
                    } ${opcion.grupo ? 'pl-5' : ''}`}
                  >
                    <span className="min-w-0 flex-1 whitespace-normal break-words">{opcion.label}</span>
                    {opcion.deshabilitada && (
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        {opcion.deshabilitada}
                      </span>
                    )}
                    {elegida && <Check aria-hidden="true" size={15} className="mt-0.5 shrink-0" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
