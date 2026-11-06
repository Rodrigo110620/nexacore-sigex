import { GraduationCap } from 'lucide-react'
import { CATEGORIAS_DOCENTE, type DatosDocente } from '../../utils/datosDocente'

const TITULOS = ['Lic.', 'Ing.', 'M.Sc.', 'Mgr.', 'Ph.D.', 'Dr.']
const campo = 'h-10 w-full rounded-md border border-[#D8E3F5] bg-white px-3 text-sm text-[#011140] outline-none focus:ring-2 focus:ring-[#0439D9]'

/** Título, especialidad y categoría del docente, al registrarlo o editarlo (solo el ADMIN). */
export default function DatosDocenteCampos({ value, onChange }: { value: DatosDocente; onChange: (v: DatosDocente) => void }) {
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
        <label className="text-xs font-semibold text-[#45628D]">Especialidad
          <input className={`${campo} mt-1`} maxLength={100} value={value.especialidad} placeholder="Por ejemplo: Bases de datos"
            onChange={(e) => onChange({ ...value, especialidad: e.target.value })} />
        </label>
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
