import { useEffect, useState } from 'react'
import { getMateriasDocente } from '../../services/estudianteService'
import type { EstudianteFilterParams, MateriaDocenteInfo } from '../../types/estudiante'
import { BUSQUEDA_MAX, sanearBusqueda } from '../../utils/habilitacionValidators'

export default function EstudianteDocenteFilters({ value, onChange, disabled }: {
  value: EstudianteFilterParams
  onChange: (value: EstudianteFilterParams) => void
  disabled?: boolean
}) {
  const [opciones, setOpciones] = useState<MateriaDocenteInfo[]>([])
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getMateriasDocente(controller.signal).then(data => {
      if (!controller.signal.aborted) { setOpciones(data); setEstado('listo') }
    }).catch(() => { if (!controller.signal.aborted) setEstado('error') })
    return () => controller.abort()
  }, [intento])
  const materias = [...new Map(opciones.map(m => [m.idMateria, m])).values()]
  const paralelos = opciones.filter(m => String(m.idMateria) === value.idMateria)
  const clase = 'h-11 w-full min-w-0 rounded-md border border-[#B8CBEF] bg-white px-3 text-sm text-[#011140] disabled:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]'
  return <div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-semibold text-[#45628D]">Buscar estudiante
        <input className={clase} value={value.search} maxLength={BUSQUEDA_MAX} disabled={disabled}
          placeholder="Nombre, CI o código SIS" onChange={e => onChange({ ...value, search: sanearBusqueda(e.target.value) })} />
      </label>
      <label className="text-xs font-semibold text-[#45628D]">Materia
        <select className={clase} value={value.idMateria || ''} disabled={disabled || estado !== 'listo'}
          onChange={e => onChange({ ...value, idMateria: e.target.value, idParalelo: '' })}>
          <option value="">{estado === 'cargando' ? 'Cargando materias...' : 'Todas mis materias'}</option>
          {materias.map(m => <option key={m.idMateria} value={m.idMateria}>{m.materia}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-[#45628D]">Paralelo
        <select className={clase} value={value.idParalelo || ''} disabled={disabled || estado !== 'listo' || !value.idMateria}
          onChange={e => onChange({ ...value, idParalelo: e.target.value })}>
          <option value="">{value.idMateria ? 'Todos los paralelos' : 'Selecciona una materia'}</option>
          {paralelos.map(m => <option key={m.idParalelo} value={m.idParalelo}>{m.paralelo}</option>)}
        </select>
      </label>
    </div>
    {estado === 'error' && <p role="alert" className="mt-2 text-sm text-red-700">No se pudieron cargar las materias. <button type="button" className="underline" onClick={() => { setEstado('cargando'); setIntento(i => i + 1) }}>Reintentar</button></p>}
    {estado === 'listo' && !materias.length && <p className="mt-2 text-sm text-[#45628D]">No tienes materias con paralelos asignados.</p>}
  </div>
}
