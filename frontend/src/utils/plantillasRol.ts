/**
 * Sugerencias al crear un rol extra en Configuración: plantillas para empezar y avisos cuando a un permiso
 * le falta otro que necesita para funcionar (por ejemplo, controlar el ingreso sin ver los exámenes).
 */

export interface PlantillaRol {
  id: string
  titulo: string
  nombre: string
  descripcion: string
  permisos: string[]
}

export const PLANTILLAS_ROL: PlantillaRol[] = [
  {
    id: 'control',
    titulo: 'Auxiliar de control',
    nombre: 'AUXILIAR_CONTROL',
    descripcion: 'Apoya al control de ingreso en la puerta del aula',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'CONTROL_INGRESO_TODOS', 'ESTUDIANTES_VER', 'FOTOS_REPORTAR'],
  },
  {
    id: 'reportes',
    titulo: 'Secretaría de reportes',
    nombre: 'SECRETARIA',
    descripcion: 'Consulta los reportes y descarga actas y asistencia',
    permisos: ['EXAMENES_VER_TODOS', 'REPORTES_VER', 'REPORTES_EXPORTAR', 'ESTUDIANTES_VER', 'NOTIFICACIONES_TODAS'],
  },
  {
    id: 'registro',
    titulo: 'Apoyo de registro',
    nombre: 'APOYO_REGISTRO',
    descripcion: 'Registra e importa estudiantes y revisa sus fotos',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'ESTUDIANTES_VER', 'ESTUDIANTES_GESTIONAR', 'FOTOS_REVISAR'],
  },
  {
    id: 'examenes',
    titulo: 'Coordinación de exámenes',
    nombre: 'COORDINADOR',
    descripcion: 'Programa los exámenes, sus aulas y asocia estudiantes',
    permisos: ['EXAMENES_VER_TODOS', 'EXAMENES_GESTIONAR_TODOS', 'AMBIENTES_GESTIONAR', 'HABILITACION_VER', 'HABILITACION_GESTIONAR'],
  },
]

/** [permiso, requiere alguno de estos (el primero es el que se sugiere agregar), para qué]. */
const DEPENDENCIAS: [string, string[], string][] = [
  ['CONTROL_INGRESO_TODOS', ['EXAMENES_VER_TODOS'], 'ver la lista de exámenes que va a controlar'],
  ['CONTROL_INGRESO_PROPIOS', ['EXAMENES_VER_PROPIOS', 'EXAMENES_VER_TODOS'], 'ver sus exámenes para controlarlos'],
  ['EXPULSAR_TODOS', ['CONTROL_INGRESO_TODOS'], 'llegar a la pantalla del control, donde se expulsa'],
  ['EXPULSAR_PROPIOS', ['CONTROL_INGRESO_PROPIOS', 'CONTROL_INGRESO_TODOS'], 'llegar a la pantalla del control, donde se expulsa'],
  ['EXAMENES_GESTIONAR_TODOS', ['EXAMENES_VER_TODOS'], 'ver los exámenes que va a programar y editar'],
  ['EXAMENES_GESTIONAR_PROPIOS', ['EXAMENES_VER_PROPIOS', 'EXAMENES_VER_TODOS'], 'ver los exámenes que va a programar y editar'],
  ['EXAMENES_CANCELAR', ['EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS'], 'abrir el examen que va a cancelar'],
  ['AMBIENTES_GESTIONAR', ['EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS'], 'elegir el aula al programar un examen'],
  ['HABILITACION_VER', ['EXAMENES_VER_TODOS', 'EXAMENES_VER_PROPIOS'], 'abrir el examen y ver a sus estudiantes'],
  ['HABILITACION_GESTIONAR', ['HABILITACION_VER'], 'ver a los estudiantes que va a asociar'],
  ['HABILITACION_GESTIONAR_PROPIOS', ['HABILITACION_VER'], 'ver a los estudiantes que va a asociar'],
  ['ESTUDIANTES_GESTIONAR', ['ESTUDIANTES_VER'], 'entrar a la pantalla de Estudiantes'],
  ['REPORTES_EXPORTAR', ['EXAMENES_VER_TODOS'], 'abrir el examen cuya acta va a descargar'],
]

export interface PermisoFaltante {
  permiso: string
  sugerido: string
  para: string
}

/** Permisos marcados a los que les falta otro para funcionar. Solo sugiere los que existen en el catálogo. */
export function permisosFaltantes(elegidos: Set<string>, disponibles: Set<string>): PermisoFaltante[] {
  return DEPENDENCIAS
    .filter(([permiso, requiere]) => elegidos.has(permiso) && !requiere.some((r) => elegidos.has(r)))
    .map(([permiso, requiere, para]) => ({ permiso, sugerido: requiere.find((r) => disponibles.has(r)) ?? requiere[0], para }))
    .filter((f) => disponibles.has(f.sugerido))
}
