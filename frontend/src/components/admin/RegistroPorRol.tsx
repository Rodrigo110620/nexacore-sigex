import { BookOpen, Check, Info, ScanLine, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { MateriaDto } from '../../services/materiaService'
import type { RegisterUserFormState } from '../../types/usuario.types'
import SelectorMaterias from './SelectorMaterias'
import DatosDocenteCampos from './DatosDocenteCampos'
import { textoCategoria, type DatosDocente } from '../../utils/datosDocente'

function Titulo({ icono: Icono, titulo, detalle }: { icono: typeof BookOpen; titulo: string; detalle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
        <Icono size={18} aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-[#011140]">{titulo}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-[#627A9B]">{detalle}</p>
      </div>
    </div>
  )
}

interface PasoDelRolProps {
  rol: string
  materias: MateriaDto[]
  onMaterias: (m: MateriaDto[]) => void
  datosDocente: DatosDocente
  onDatosDocente: (d: DatosDocente) => void
  confirmaAdmin: boolean
  onConfirmaAdmin: (v: boolean) => void
  errores: Record<string, string | undefined>
}

/** Paso 3: DOCENTE elige sus materias; ADMIN confirma el acceso total; CONTROL y los roles extra, sus permisos. */
export function PasoDelRol({ rol, materias, onMaterias, datosDocente, onDatosDocente, confirmaAdmin, onConfirmaAdmin, errores }: PasoDelRolProps) {
  if (rol === 'DOCENTE') {
    return (
      <div className="flex flex-col gap-4">
        <DatosDocenteCampos value={datosDocente} onChange={onDatosDocente} />
        <Titulo icono={BookOpen} titulo="Materias del docente"
          detalle="Elige al menos una. Solo podrá programar exámenes y ver estudiantes de estas materias. Después se pueden cambiar desde Usuarios." />
        <SelectorMaterias value={materias} onChange={onMaterias} error={errores.materias} />
      </div>
    )
  }
  if (rol === 'ADMIN') {
    return (
      <div className="flex flex-col gap-4">
        <Titulo icono={ShieldCheck} titulo="Acceso de administrador" detalle="El administrador tiene todos los permisos del sistema." />
        <p className="flex items-start gap-2 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-3 text-xs leading-relaxed text-[#9A3412]">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Gestiona usuarios, roles y permisos, el respaldo de la base y todos los exámenes. Registra solo a quien necesite este acceso.
        </p>
        <label className="flex cursor-pointer items-start gap-2.5 text-xs font-medium text-[#011140]">
          <input type="checkbox" name="confirmaAdmin" checked={confirmaAdmin} onChange={(e) => onConfirmaAdmin(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#0439D9]" />
          Confirmo que esta persona debe tener acceso total al sistema.
        </label>
        {errores.confirmaAdmin && <p role="alert" className="text-xs font-medium text-[#B91C1C]">{errores.confirmaAdmin}</p>}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <Titulo icono={ScanLine} titulo={rol === 'CONTROL' ? 'Control de ingreso' : `Rol ${rol}`}
        detalle={rol === 'CONTROL'
          ? 'Registra el ingreso de los estudiantes y las incidencias en la puerta del aula, en cualquier examen.'
          : 'Este rol tiene los permisos que se le asignaron en Configuración › Roles y permisos.'} />
      <p className="flex items-start gap-2 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-3 text-xs leading-relaxed text-[#1E3A8A]">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {rol === 'CONTROL'
          ? 'En su inicio verá el examen en curso de su aula y solo sus propios registros.'
          : 'Para cambiar lo que puede hacer, edita el rol en Configuración.'}
      </p>
    </div>
  )
}

interface ResumenProps {
  form: RegisterUserFormState
  materias: MateriaDto[]
  datosDocente?: DatosDocente
  onActivo: (v: boolean) => void
  onEditar: (paso: 1 | 2 | 3) => void
}

/** Paso 4: resumen de lo ingresado, estado de la cuenta y aviso de credenciales. */
export function ResumenRegistro({ form, materias, datosDocente, onActivo, onEditar }: ResumenProps) {
  const filas: [string, string, 1 | 2 | 3][] = [
    ['Rol', form.rol, 1],
    ['Nombre', `${form.nombre.trim()} ${form.apellidos.trim()}`, 2],
    ['CI', form.documento.trim(), 2],
    ['Correo', form.email.trim().toLowerCase(), 2],
  ]
  if (form.rol === 'DOCENTE' && datosDocente) {
    filas.push(['Docente', [datosDocente.titulo.trim(), datosDocente.especialidad.trim(), textoCategoria(datosDocente.categoria)].filter(Boolean).join(' · '), 3])
  }
  if (form.rol === 'DOCENTE') filas.push(['Materias', materias.map((m) => `${m.nombre} (${m.sigla})`).join(', '), 3])
  if (form.rol === 'ADMIN') filas.push(['Acceso', 'Total, confirmado', 3])
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-2.5 rounded-xl border border-[#E6EBF2] bg-[#F8FAFF] p-4">
        {filas.map(([etiqueta, valor, paso]) => (
          <div key={etiqueta} className="flex items-start gap-3 text-xs">
            <dt className="w-20 shrink-0 text-[#627A9B]">{etiqueta}</dt>
            <dd className="min-w-0 flex-1 break-words font-semibold text-[#011140]">{valor}</dd>
            <button type="button" onClick={() => onEditar(paso)} className="shrink-0 text-[11px] font-semibold text-[#0439D9] hover:underline">
              Cambiar<span className="sr-only"> {etiqueta.toLowerCase()}</span>
            </button>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E6EBF2] p-4">
        <div>
          <p className="text-xs font-semibold text-[#011140]">Cuenta activa</p>
          <p className="text-xs text-gray-500">Puede iniciar sesión apenas se registre</p>
        </div>
        <button type="button" role="switch" aria-label="Estado de cuenta activo" aria-checked={form.activo} onClick={() => onActivo(!form.activo)}
          className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${form.activo ? 'bg-green-500' : 'bg-gray-300'}`}>
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.activo ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
      <p className="flex items-start gap-2 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-3 text-xs leading-relaxed text-[#1E3A8A]">
        <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        La contraseña provisional se envía al correo institucional del usuario. No se muestra en pantalla y toda acción queda en el historial.
      </p>
    </div>
  )
}
