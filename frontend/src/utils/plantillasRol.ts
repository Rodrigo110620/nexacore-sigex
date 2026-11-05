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
  /** Palabras (o su comienzo) que, escritas en el nombre o la descripción, sugieren esta plantilla. */
  claves: string[]
}

export const PLANTILLAS_ROL: PlantillaRol[] = [
  {
    id: 'control',
    titulo: 'Auxiliar de control',
    nombre: 'AUXILIAR_CONTROL',
    descripcion: 'Apoya al control de ingreso en la puerta del aula',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'CONTROL_INGRESO_TODOS', 'ESTUDIANTES_VER', 'FOTOS_REPORTAR'],
    claves: ['aux', 'control', 'ingreso', 'puerta', 'portero', 'vigil', 'apoyo control', 'seguridad'],
  },
  {
    id: 'reportes',
    titulo: 'Secretaría de reportes',
    nombre: 'SECRETARIA',
    descripcion: 'Consulta los reportes y descarga actas y asistencia',
    permisos: ['EXAMENES_VER_TODOS', 'REPORTES_VER', 'REPORTES_EXPORTAR', 'ESTUDIANTES_VER', 'NOTIFICACIONES_TODAS'],
    claves: ['secre', 'report', 'acta', 'asisten', 'export', 'kardex', 'archiv', 'estadist'],
  },
  {
    id: 'registro',
    titulo: 'Apoyo de registro',
    nombre: 'APOYO_REGISTRO',
    descripcion: 'Registra e importa estudiantes y revisa sus fotos',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'ESTUDIANTES_VER', 'ESTUDIANTES_GESTIONAR', 'FOTOS_REVISAR'],
    claves: ['regist', 'estudiant', 'foto', 'matric', 'inscri', 'import', 'apoyo'],
  },
  {
    id: 'examenes',
    titulo: 'Coordinación de exámenes',
    nombre: 'COORDINADOR',
    descripcion: 'Programa los exámenes, sus aulas y asocia estudiantes',
    permisos: ['EXAMENES_VER_TODOS', 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_CANCELAR', 'AMBIENTES_GESTIONAR', 'HABILITACION_VER', 'HABILITACION_GESTIONAR'],
    claves: ['coord', 'exam', 'program', 'planific', 'horario', 'calendar'],
  },
  {
    id: 'supervisor',
    titulo: 'Supervisión de control',
    nombre: 'SUPERVISOR_CONTROL',
    descripcion: 'Supervisa el control de ingreso, expulsa y atiende las incidencias',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'CONTROL_INGRESO_TODOS', 'EXPULSAR_TODOS', 'ESTUDIANTES_VER',
      'FOTOS_REPORTAR', 'REPORTES_VER', 'NOTIFICACIONES_TODAS'],
    claves: ['supervis', 'jefe control', 'encargad', 'responsab', 'incidenc', 'expuls'],
  },
  {
    id: 'ayudante',
    titulo: 'Ayudante de cátedra',
    nombre: 'AYUDANTE',
    descripcion: 'Ayuda al docente a controlar el ingreso en sus exámenes',
    permisos: ['EXAMENES_VER_PROPIOS', 'HABILITACION_VER', 'CONTROL_INGRESO_PROPIOS', 'ESTUDIANTES_VER', 'FOTOS_REPORTAR'],
    claves: ['ayudant', 'catedr', 'auxiliar docente', 'tutor', 'practicant', 'asistente'],
  },
  {
    id: 'invitado',
    titulo: 'Docente invitado',
    nombre: 'DOCENTE_INVITADO',
    descripcion: 'Programa y controla solo sus propios exámenes',
    permisos: ['EXAMENES_VER_PROPIOS', 'EXAMENES_GESTIONAR_PROPIOS', 'HABILITACION_VER', 'HABILITACION_GESTIONAR_PROPIOS',
      'CONTROL_INGRESO_PROPIOS', 'EXPULSAR_PROPIOS', 'ESTUDIANTES_VER'],
    claves: ['invitad', 'docent', 'profesor', 'licenciad', 'ingenier', 'catedratic', 'visitant'],
  },
  {
    id: 'habilitacion',
    titulo: 'Habilitación de estudiantes',
    nombre: 'HABILITACION',
    descripcion: 'Asocia estudiantes a los exámenes y marca quién está habilitado',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'HABILITACION_GESTIONAR', 'ESTUDIANTES_VER'],
    claves: ['habilit', 'kardex', 'caja', 'deuda', 'bibliotec', 'tesorer', 'asocia'],
  },
  {
    id: 'fotos',
    titulo: 'Revisión de fotos',
    nombre: 'REVISOR_FOTOS',
    descripcion: 'Revisa, aprueba y rechaza las fotos de los estudiantes',
    permisos: ['ESTUDIANTES_VER', 'FOTOS_REVISAR'],
    claves: ['foto', 'revis', 'identidad', 'biometr', 'rostro', 'imagen'],
  },
  {
    id: 'aulas',
    titulo: 'Logística de aulas',
    nombre: 'LOGISTICA',
    descripcion: 'Registra las aulas, su capacidad y las asigna a los exámenes',
    permisos: ['EXAMENES_VER_TODOS', 'EXAMENES_GESTIONAR_TODOS', 'AMBIENTES_GESTIONAR'],
    claves: ['logist', 'aula', 'ambient', 'infraestruct', 'espacio', 'capacidad', 'laborator'],
  },
  {
    id: 'monitor',
    titulo: 'Monitoreo en vivo',
    nombre: 'MONITOR',
    descripcion: 'Sigue los exámenes en curso y recibe todos los avisos',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'REPORTES_VER', 'NOTIFICACIONES_TODAS'],
    claves: ['monitor', 'vivo', 'central', 'operador', 'vigila', 'seguimient', 'aviso'],
  },
  {
    id: 'direccion',
    titulo: 'Dirección de carrera',
    nombre: 'DIRECCION',
    descripcion: 'Consulta exámenes, reportes y actas de toda la carrera',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'ESTUDIANTES_VER', 'REPORTES_VER', 'REPORTES_EXPORTAR', 'NOTIFICACIONES_TODAS'],
    claves: ['direc', 'decan', 'carrera', 'jefatur', 'facultad', 'autoridad', 'vicedec'],
  },
  {
    id: 'auditor',
    titulo: 'Consulta (solo lectura)',
    nombre: 'CONSULTA',
    descripcion: 'Ve exámenes, estudiantes y reportes sin cambiar nada',
    permisos: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'ESTUDIANTES_VER', 'REPORTES_VER'],
    claves: ['audit', 'consult', 'lector', 'lectura', 'observ', 'veedor', 'solo ver', 'invitado lectura'],
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

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/_/g, ' ')

/**
 * Plantillas que coinciden con lo escrito en el nombre o la descripción del rol (sin tildes ni mayúsculas).
 * Con menos de 2 letras no sugiere nada: las sugerencias aparecen recién al escribir.
 */
export function sugerirPlantillas(...textos: string[]): PlantillaRol[] {
  const escrito = normalizar(textos.join(' ')).trim()
  if (escrito.replace(/\s/g, '').length < 2) return []
  const palabras = escrito.split(/\s+/).filter((p) => p.length >= 2)
  return PLANTILLAS_ROL.filter((x) => x.claves.some((clave) =>
    escrito.includes(clave) || palabras.some((p) => clave.startsWith(p) && p.length >= 3)))
}

