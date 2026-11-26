import api from './api'
import { guardarArchivo } from './descargas'
import { reporteIntentos, type IntentoReporte } from './intentoIngresoService'
import { listarExpulsionesExamen, listarExpulsionesTodas } from './expulsionService'
import { listarExcepcionesNoHabilitado, listarExcepcionesTodas } from './excepcionNoHabilitadoService'
import { listarFotosReportadas } from './fotoRevisionService'
import { reporteModificacionesInhabilitados } from './modificacionInhabilitadoService'
import { reporteIngresos } from './ingresoService'
import { reporteUsoAmbientes } from './usoAmbientesService'
import { contiene } from '../utils/textoBusqueda'
import { fechaHoraNumerica, formatFecha } from '../utils/examenFormat'

export type PestanaReporte = 'intentos' | 'expulsiones' | 'excepciones' | 'fotos' | 'modificaciones' | 'ingresos-qr' | 'ingresos-manual' | 'uso-ambientes'
export type FormatoReporte = 'xlsx' | 'pdf'

export interface FiltrosReporte {
  idExamen: number | null
  /** Nombre del examen elegido, para el encabezado («Todos los exámenes» si no hay). */
  examen?: string
  /** Texto del período («Este mes»), para el encabezado. */
  periodo?: string
  desde?: string
  buscar: string
  /** idExamen → «Cálculo I · G1 · 23/11/2026», para los reportes que solo traen el id. */
  nombresExamen: Map<number, string>
}

interface Tabla { titulo: string; columnas: string[]; filas: string[][] }

const TITULOS: Record<PestanaReporte, string> = {
  intentos: 'Intentos de ingreso incorrectos',
  expulsiones: 'Expulsiones',
  excepciones: 'Excepciones a no habilitados',
  fotos: 'Fotos reportadas',
  modificaciones: 'Modificaciones a inhabilitados',
  'ingresos-qr': 'Ingresos por QR',
  'ingresos-manual': 'Ingresos manuales',
  'uso-ambientes': 'Uso de ambientes',
}

const fh = (v?: string | null) => (v ? fechaHoraNumerica(v, true) : '')
const desdeOk = (fecha: string | null | undefined, desde?: string) => !desde || (fecha ?? '') >= desde
/** Lo mismo que se ve: la búsqueda se aplica sobre todo el texto de la fila. */
const conBusqueda = (filas: string[][], buscar: string) => (buscar.trim() ? filas.filter((f) => contiene(f.join(' '), buscar.trim())) : filas)

async function todosLosIntentos(idExamen: number | null, buscar: string, desde?: string): Promise<IntentoReporte[]> {
  const todos: IntentoReporte[] = []
  for (let pagina = 0; pagina < 50; pagina++) {
    const r = await reporteIntentos(idExamen, pagina, 100, buscar, desde)
    todos.push(...r.contenido)
    if (pagina + 1 >= r.totalPaginas) break
  }
  return todos
}

/** Todas las filas de la pestaña (no solo la página visible), con los filtros de la pantalla. */
async function tablaDe(pestana: PestanaReporte, f: FiltrosReporte): Promise<Tabla> {
  const titulo = TITULOS[pestana]
  const examenDe = (id: number | null | undefined) => (id != null ? f.nombresExamen.get(id) ?? `Examen ${id}` : '')
  switch (pestana) {
    case 'intentos': {
      const lista = await todosLosIntentos(f.idExamen, f.buscar, f.desde)
      return { titulo, columnas: ['Estudiante', 'Código / CI', 'Examen', 'Fecha y hora', 'Motivo', 'Detalle', 'Personal de control'],
        filas: lista.map((i) => [i.estudiante ?? `No identificado (${i.identificador})`, i.codigoSis ?? i.identificador,
          i.examen ?? examenDe(i.idExamen), fh(i.fechaHora), i.etiqueta || i.motivo, i.detalle ?? '', i.personalControl]) }
    }
    case 'expulsiones': {
      const lista = f.idExamen != null ? await listarExpulsionesExamen(f.idExamen) : await listarExpulsionesTodas()
      const filas = lista.filter((e) => desdeOk(e.fechaHora, f.desde)).map((e) => [e.estudiante ?? '', e.codigoSis ?? '', examenDe(e.idExamen),
        fh(e.fechaHora), e.motivo, e.responsable, e.anuladaEn ? `Anulada el ${fh(e.anuladaEn)}: ${e.motivoAnulacion ?? ''}` : 'Vigente'])
      return { titulo, columnas: ['Estudiante', 'Código', 'Examen', 'Fecha y hora', 'Motivo', 'Responsable', 'Estado'], filas: conBusqueda(filas, f.buscar) }
    }
    case 'excepciones': {
      const lista = f.idExamen != null ? await listarExcepcionesNoHabilitado(f.idExamen) : await listarExcepcionesTodas()
      const filas = lista.filter((e) => desdeOk(e.fechaHora, f.desde)).map((e) => [e.estudiante ?? '', e.codigoSis ?? '', examenDe(e.idExamen),
        fh(e.fechaHora), e.motivoInhabilitacion, e.accionTomada, e.ambiente ?? '', e.registradoPor ?? '', e.observaciones ?? ''])
      return { titulo, columnas: ['Estudiante', 'Código', 'Examen', 'Fecha y hora', 'Motivo de inhabilitación', 'Acción tomada', 'Aula', 'Registrado por', 'Observaciones'],
        filas: conBusqueda(filas, f.buscar) }
    }
    case 'fotos': {
      const lista = await listarFotosReportadas(f.idExamen)
      const filas = lista.filter((r) => desdeOk(r.reportadoEn, f.desde)).map((r) => [r.estudiante, r.codigoSis ?? '', r.examen ?? '',
        fh(r.reportadoEn), r.motivo, r.detalle ?? '', r.reportadoPor ?? '', r.estado.charAt(0) + r.estado.slice(1).toLowerCase()])
      return { titulo, columnas: ['Estudiante', 'Código', 'Examen', 'Reportada', 'Motivo', 'Detalle', 'Reportada por', 'Estado'], filas: conBusqueda(filas, f.buscar) }
    }
    case 'modificaciones': {
      const lista = await reporteModificacionesInhabilitados(f.idExamen, f.desde)
      const filas = lista.map((m) => [m.docente, m.accion, m.estudiante, m.codigoSis, m.examen, m.estadoAnterior, fh(m.fechaHora),
        m.esFallo ? `No se aplicó: ${m.motivoFallo ?? ''}` : 'Aplicada'])
      return { titulo, columnas: ['Docente', 'Acción', 'Estudiante', 'Código', 'Examen', 'Estado anterior', 'Fecha y hora', 'Resultado'],
        filas: conBusqueda(filas, f.buscar) }
    }
    case 'ingresos-qr':
    case 'ingresos-manual': {
      const tipo = pestana === 'ingresos-qr' ? 'NORMAL' : 'MANUAL'
      const lista = (await reporteIngresos(f.idExamen)).filter((i) => i.tipoIngreso === tipo)
      const filas = lista.map((i) => [i.estudiante, i.codigoSis, i.examen, fh(i.fechaHora), tipo === 'NORMAL' ? 'QR' : 'Manual', i.controlador])
      return { titulo, columnas: ['Estudiante', 'Código', 'Examen', 'Fecha y hora', 'Tipo', 'Personal de control'], filas: conBusqueda(filas, f.buscar) }
    }
    case 'uso-ambientes': {
      const lista = await reporteUsoAmbientes(f.idExamen)
      const estado = { UTILIZADO: 'Utilizado', SIN_USO: 'Sin uso', PENDIENTE: 'Pendiente' } as const
      const filas = lista.map((u) => [u.ambiente, u.materia, u.grupo, u.docente, formatFecha(u.fecha),
        `${u.horaInicio.slice(0, 5)} – ${u.horaFin.slice(0, 5)}`, u.estado === 'PENDIENTE' ? '' : `${u.ingresos}${u.capacidad ? ` / ${u.capacidad}` : ''}`,
        estado[u.estado] ?? u.estado])
      return { titulo, columnas: ['Ambiente', 'Materia', 'Grupo', 'Docente', 'Fecha', 'Horario', 'Ingresos', 'Estado'], filas: conBusqueda(filas, f.buscar) }
    }
  }
}

/** Descarga la pestaña de Reportes en Excel o PDF, con los filtros que se ven en pantalla. Devuelve cuántas filas tenía. */
export async function descargarReporte(pestana: PestanaReporte, formato: FormatoReporte, f: FiltrosReporte): Promise<number> {
  const tabla = await tablaDe(pestana, f)
  const filtros = [
    `Examen: ${f.examen ?? 'Todos los exámenes'}`,
    f.periodo && f.periodo !== 'Todo' ? `Periodo: ${f.periodo}` : '',
    f.buscar.trim() ? `Búsqueda: «${f.buscar.trim()}»` : '',
  ].filter(Boolean)
  const { data, headers } = await api.post<Blob>(`/reportes/exportar.${formato}`,
    { titulo: tabla.titulo, filtros, columnas: tabla.columnas, filas: tabla.filas.slice(0, 5000) },
    { responseType: 'blob', timeout: 2 * 60 * 1000 })
  const nombre = /filename="?([^";]+)"?/.exec(String(headers['content-disposition'] ?? ''))?.[1] ?? `reporte.${formato}`
  guardarArchivo({ blob: data, nombre })
  return tabla.filas.length
}

