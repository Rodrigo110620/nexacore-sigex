import { useId, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import {
  CATEGORIAS_DOCENTE, ESPECIALIDAD_MAX, errorEspecialidad, filtrarEspecialidad, normalizarEspecialidad, type DatosDocente,
} from '../../utils/datosDocente'

const TITULOS = ['Lic.', 'Ing.', 'M.Sc.', 'Mgr.', 'Ph.D.', 'Dr.']
const campo = 'h-10 w-full rounded-md border border-[#D8E3F5] bg-white px-3 text-sm text-[#011140] outline-none focus:ring-2 focus:ring-[#0439D9]'

/**
 * Título, especialidad y categoría del docente, al registrarlo o editarlo (solo el ADMIN). La especialidad solo admite
 * letras con un espacio entre palabras (10 a 100 caracteres), muestra su contador y se guarda en formato oración.
 */
export default function DatosDocenteCampos({ value, onChange, error }: {
  value: DatosDocente
  onChange: (v: DatosDocente) => void
  /** Error que marca el formulario al intentar avanzar o guardar. */
  error?: string
}) {
  const id = useId()
  const [tocado, setTocado] = useState(false)
  // Aviso breve cuando se escribió algo que no se admite (un número, un símbolo, dos espacios).
  const [aviso, setAviso] = useState('')
  const mensaje = aviso || error || (tocado ? errorEspecialidad(value.especialidad) : null)
  const largo = value.especialidad.trim().length
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#011140]">
        <GraduationCap size={15} className="text-[#0439D9]" aria-hidden="true" />DATOS DEL DOCENTE
      </legend>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="text-xs font-semibold text-[#45628D]">Título
          <input className={`${campo} mt-1`} list="titulos-docente" maxLength={40} value={value.titulo} placeholder="Lic., Ing., M.Sc.…"
            onChange={(e) => onChange({ ...value, titulo: e.target.value })} />
          <datalist id="titulos-docente">{TITULOS.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <div>
          <label htmlFor={`${id}-especialidad`} className="text-xs font-semibold text-[#45628D]">Especialidad</label>
          <input id={`${id}-especialidad`} className={`${campo} mt-1 ${mensaje ? 'border-[#DC2626] focus:ring-[#DC2626]' : ''}`}
            maxLength={ESPECIALIDAD_MAX} value={value.especialidad} placeholder="Por ejemplo: Bases de datos"
            aria-invalid={mensaje ? true : undefined} aria-describedby={`${id}-especialidad-ayuda`}
            onChange={(e) => {
              const limpio = filtrarEspecialidad(e.target.value)
              setAviso(limpio !== e.target.value.slice(0, ESPECIALIDAD_MAX) ? 'Solo se admiten letras y un espacio entre palabras.' : '')
              onChange({ ...value, especialidad: limpio })
            }}
            onBlur={() => {
              setTocado(true)
              setAviso('')
              const normal = normalizarEspecialidad(value.especialidad)
              if (normal !== value.especialidad) onChange({ ...value, especialidad: normal })
            }} />
          <div id={`${id}-especialidad-ayuda`} className="mt-1 flex items-start justify-between gap-2 text-[11px]">
            <span role={mensaje ? 'alert' : undefined} className={mensaje ? 'font-medium text-[#B91C1C]' : 'text-[#627A9B]'}>
              {mensaje ?? 'Opcional. Solo letras, entre 10 y 100 caracteres.'}
            </span>
            <span className={`shrink-0 tabular-nums ${largo > 0 && largo < 10 ? 'text-[#B91C1C]' : 'text-[#8BA0BF]'}`} aria-label={`${largo} de ${ESPECIALIDAD_MAX} caracteres`}>
              {largo}/{ESPECIALIDAD_MAX}
            </span>
          </div>
        </div>
      </div>
      <label className="text-xs font-semibold text-[#45628D] sm:w-60">Categoría
        <select className={`${campo} mt-1`} value={value.categoria} onChange={(e) => onChange({ ...value, categoria: e.target.value as DatosDocente['categoria'] })}>
          {CATEGORIAS_DOCENTE.map((c) => <option key={c.id} value={c.id}>{c.texto}</option>)}
        </select>
      </label>
      <p className="text-[11px] text-[#627A9B]">El título y la especialidad son opcionales. Solo el administrador los puede cambiar.</p>
    </fieldset>
  )
}
