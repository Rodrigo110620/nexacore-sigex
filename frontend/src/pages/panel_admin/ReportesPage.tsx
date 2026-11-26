import { useEffect, useState } from 'react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ExpulsionesReporte from '../../components/control/ExpulsionesReporte'
import ExcepcionesNoHabilitadoReporte from '../../components/control/ExcepcionesNoHabilitadoReporte'
import FotosReportadasReporte from '../../components/control/FotosReportadasReporte'
import TablePagination from '../../components/users/TablePagination'
import useEnVivo from '../../hooks/useEnVivo'
import useFilasNuevas, { CLASE_FILA_NUEVA } from '../../hooks/useFilasNuevas'
import useResumenReportes, { desdePeriodo, type Periodo } from '../../hooks/useResumenReportes'
import GraficoPorHora from '../../components/reportes/GraficoPorHora'
import ResumenReportes from '../../components/reportes/ResumenReportes'
import DescargarReporte from '../../components/reportes/DescargarReporte'
import EtiquetaNuevo from '../../components/reportes/EtiquetaNuevo'
import { listarExamenes, listarMisExamenes, type ExamenDto } from '../../services/examenService'
import { useAuth } from '../../context/AuthContext'
import { tienePermiso } from '../../utils/permisos'
import { listarRegistrosControlExamen, type RegistroControlIngresoExamen } from '../../services/controlIngresoService'
import { reporteIntentos, type IntentoReporte, type PaginaIntentos } from '../../services/intentoIngresoService'
import { fechaHoraNumerica, formatFecha, materiaYGrupo } from '../../utils/examenFormat'
import ReporteModificaciones from '../../components/reportes/ReporteModificaciones'
import ReporteIngresos from '../../components/reportes/ReporteIngresos'
import ReporteUsoAmbientes from '../../components/reportes/ReporteUsoAmbientes'


import { ChartColumn, ChevronDown, Download, Lock, Search, X } from 'lucide-react'
import ResultadoModal, { type Resultado } from '../../components/ui/ResultadoModal'
import VistaPreviaExamen from '../../components/examenes/VistaPreviaExamen'
import { TODOS_LOS_PERIODOS } from '../../services/periodoService'

type Pestana = 'intentos' | 'expulsiones' | 'excepciones' | 'fotos' | 'modificaciones' | 'ingresos-qr' | 'ingresos-manual'| 'uso-ambientes'
const PESTANAS: { id: Pestana; texto: string; corto: string }[] = [
  { id: 'intentos', texto: 'Intentos incorrectos', corto: 'Intentos' },
  { id: 'expulsiones', texto: 'Expulsiones', corto: 'Expulsiones' },
  { id: 'excepciones', texto: 'Excepciones', corto: 'Excepciones' },
  { id: 'fotos', texto: 'Fotos reportadas', corto: 'Fotos' },
  { id: 'modificaciones', texto: 'Modificaciones a inhabilitados', corto: 'Modificac.' },
  { id: 'ingresos-qr', texto: 'Ingresos QR', corto: 'Ing. QR' },
  { id: 'ingresos-manual', texto: 'Ingresos Manuales', corto: 'Ing. Manual' },
  { id: 'uso-ambientes', texto: 'Uso de Ambientes', corto: 'Ambientes' },
]
/** Las 8 pestañas en 3 grupos: se leen de un vistazo y la fila entra en cualquier pantalla. */
type Grupo = 'incidencias' | 'ingresos' | 'ambientes'
const GRUPOS: { id: Grupo; texto: string; pestanas: Pestana[] }[] = [
  { id: 'incidencias', texto: 'Incidencias', pestanas: ['intentos', 'expulsiones', 'excepciones', 'fotos', 'modificaciones'] },
  { id: 'ingresos', texto: 'Ingresos', pestanas: ['ingresos-qr', 'ingresos-manual'] },
  { id: 'ambientes', texto: 'Ambientes', pestanas: ['uso-ambientes'] },
]
const grupoDe = (p: Pestana): Grupo => GRUPOS.find((g) => g.pestanas.includes(p))?.id ?? 'incidencias'
const PERIODOS: [Periodo, string][] = [['todo', 'Todo'], ['hoy', 'Hoy'], ['7d', 'Últimos 7 días'], ['mes', 'Este mes']]
const TITULO_GRAFICO: Record<Pestana, string> = { intentos: 'Intentos incorrectos', expulsiones: 'Expulsiones', excepciones: 'Excepciones', fotos: 'Fotos reportadas', modificaciones: 'Modificaciones a inhabilitados', 'ingresos-qr': 'Ingresos QR', 'ingresos-manual': 'Ingresos Manuales','uso-ambientes': 'Uso de Ambientes'  }
const UNIDAD: Record<Pestana, [string, string]> = {
  intentos: ['intento', 'intentos'], expulsiones: ['expulsión', 'expulsiones'], excepciones: ['excepción', 'excepciones'], fotos: ['foto', 'fotos'], modificaciones: ['intento', 'intentos'], 'ingresos-qr': ['ingreso', 'ingresos'], 'ingresos-manual': ['ingreso', 'ingresos'], 'uso-ambientes': ['ambiente', 'ambientes'] 
}
// De 10 en 10, como Expulsiones, Excepciones y Fotos reportadas.
const TAMANO = 10

const nombreExamen = (e: ExamenDto) => `${materiaYGrupo(e)} · ${formatFecha(e.fecha)} · ${e.horaInicio.slice(0, 5)}`

/** BUG-G01: no inscrito (rojo), aula incorrecta (naranja) y no habilitado (gris) se distinguen, como en el mockup. */
const COLOR_TIPO: Record<IntentoReporte['tipo'], string> = {
  NO_CORRESPONDE: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]',
  AULA_INCORRECTA: 'bg-[#FFEDD5] text-[#9A3412] border border-[#FDBA74]',
  NO_HABILITADO: 'bg-[#E0E7FF] text-[#3730A3] border border-[#A5B4FC]',
  OTRO_EXAMEN: 'bg-[#F3E8FF] text-[#6B21A8] border border-[#D8B4FE]',
}
const TEXTO_TIPO: Record<IntentoReporte['tipo'], string> = {
  NO_CORRESPONDE: 'No inscrito en la materia', AULA_INCORRECTA: 'Aula incorrecta', NO_HABILITADO: 'No habilitado',
  OTRO_EXAMEN: 'Rinde otro examen a la misma hora',
}

/** envolver: en el celular el motivo puede ser largo; se parte en líneas en vez de cortarse o empujar al nombre. */
function EtiquetaTipo({ intento, envolver = false }: { intento: Pick<IntentoReporte, 'tipo' | 'etiqueta'>; envolver?: boolean }) {
  return (
    <span className={`inline-flex max-w-full ${envolver ? 'rounded-lg' : 'rounded-full'} px-2 py-0.5 text-[11px] font-semibold ${COLOR_TIPO[intento.tipo] ?? COLOR_TIPO.NO_CORRESPONDE}`}>
      <span className={envolver ? 'break-words [overflow-wrap:anywhere]' : 'truncate'}>{intento.etiqueta || TEXTO_TIPO[intento.tipo] || 'Intento incorrecto'}</span>
    </span>
  )
}

/** Lo que va debajo de la insignia: el detalle legible (sin el texto crudo «### Motivo: …»). */
const detalleDe = (i: IntentoReporte) => (i.etiqueta !== undefined ? i.detalle : i.motivo) ?? null

const quien = (i: IntentoReporte) => i.estudiante ?? `No identificado (${i.identificador})`
const examenDe = (i: IntentoReporte) =>
  `${i.examen ?? `Examen #${i.idExamen}`} · ${formatFecha(i.fechaExamen)} ${i.horaExamen?.slice(0, 5) ?? ''}`.trim()

/** DASH-06 / HU#7: intentos de ingreso incorrectos de todos los exámenes o de uno, paginados. */
function ReporteIntentos({ idExamen, examen, buscar, desde }: { idExamen: number | null; examen?: string; buscar: string; desde?: string }) {
  const [pagina, setPagina] = useState(0)
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<{ clave: string; contexto: string; datos?: PaginaIntentos; error?: string }>()
  // Una recarga en vivo no vuelve a «Consultando…»: se sigue viendo la lista hasta tener la nueva. Si el examen
  // cambió (p. ej. se reprogramó), lo anterior es de otra sesión y se oculta mientras consulta.
  const [sesion, setSesion] = useState(0)
  const clave = `${idExamen ?? 'todos'}|${pagina}|${recarga}|${buscar}|${sesion}|${desde ?? ''}`
  const contexto = `${idExamen ?? 'todos'}|${pagina}|${buscar}|${sesion}|${desde ?? ''}`
  useEnVivo((cambio) => {
    const afecta = idExamen == null || cambio.idExamen === idExamen
    if (afecta && idExamen != null && cambio.tipo === 'EXAMEN') setSesion((n) => n + 1)
    return afecta
  }, () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
      ; (desde ? reporteIntentos(idExamen, pagina, TAMANO, buscar, desde) : reporteIntentos(idExamen, pagina, TAMANO, buscar))
        .then((datos) => { if (vigente) setResultado({ clave, contexto, datos }) })
        .catch(() => { if (vigente) setResultado({ clave, contexto, error: 'No se pudo cargar el reporte de intentos.' }) })
    return () => { vigente = false }
  }, [idExamen, pagina, clave, contexto, buscar, desde])

  const actual = resultado?.contexto === contexto ? resultado : undefined
  const datos = actual?.datos
  const nuevas = useFilasNuevas(datos?.contenido.map((i) => i.idIntento), contexto)

  return (
    <section aria-label="Intentos de ingreso incorrectos" className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-[#011140]">Intentos de ingreso incorrectos</h2>
        {datos && <p className="text-sm font-semibold text-[#45628D]">{datos.totalRegistros} {datos.totalRegistros === 1 ? 'intento' : 'intentos'}</p>}
      </div>
      <p className="mt-1 text-xs text-[#627A9B]">
        {idExamen == null
          ? 'Estudiantes que intentaron ingresar a un examen que no les corresponde o en un aula equivocada, de todos los exámenes.'
          : `Solo los intentos de ${examen ?? 'este examen'} en su sesión actual.`}
      </p>

      {!actual && <p role="status" className="mt-4 text-sm text-[#627A9B]">Consultando intentos…</p>}
      {actual?.error && (
        <div role="alert" className="mt-4 text-sm text-[#B91C1C]">
          <p>{actual.error}</p>
          <button type="button" onClick={() => setRecarga((n) => n + 1)} className="mt-2 rounded-lg border px-3 py-2">Reintentar</button>
        </div>
      )}
      {datos && datos.contenido.length === 0 && (
        <p className="mt-6 rounded-lg bg-[#F8FAFC] p-6 text-center text-sm text-[#627A9B]">
          {buscar.trim() ? 'Ningún intento coincide con la búsqueda.' : idExamen == null ? 'No hay intentos de ingreso incorrectos registrados.' : 'No hubo intentos incorrectos en este examen.'}
        </p>
      )}
      {datos && datos.contenido.length > 0 && (
        <>
          <div className="mt-4 hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#627A9B]">
                <tr>
                  <th className="px-3 py-2">Estudiante</th>
                  <th className="px-3 py-2">Código SIS</th>
                  <th className="px-3 py-2">Examen</th>
                  <th className="px-3 py-2">Fecha y hora</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Controló</th>
                </tr>
              </thead>
              <tbody>
                {datos.contenido.map((i) => (
                  <tr key={i.idIntento} className={`border-b border-[#EDF1F7] align-top ${nuevas.has(i.idIntento) ? CLASE_FILA_NUEVA : ''}`}>
                    <td className="px-3 py-2.5 font-semibold text-[#011140]">{quien(i)}{nuevas.has(i.idIntento) && <EtiquetaNuevo />}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{i.codigoSis ?? i.identificador}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{examenDe(i)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#011140]">{fechaHoraNumerica(i.fechaHora, true)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-start gap-1">
                        <EtiquetaTipo intento={i} />
                        {detalleDe(i) && <span className="break-words text-xs text-[#45628D] [overflow-wrap:anywhere]">{detalleDe(i)}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">{i.personalControl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
                    <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {datos.contenido.map((i) => (
              <li key={i.idIntento} className={`relative flex flex-col min-w-0 rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm transition-all hover:shadow-md ${nuevas.has(i.idIntento) ? CLASE_FILA_NUEVA : ''}`}>
                
                {/* Cabecera: Estudiante y SIS */}
                {/* El nombre ocupa todo el ancho; el motivo (que puede ser largo) va debajo y se parte en líneas. */}
                <div className="min-w-0 border-b border-[#EDF1F7] pb-3">
                  <p className="break-words text-sm font-bold text-[#011140]">
                    {i.estudiante ?? 'No identificado'}
                    {nuevas.has(i.idIntento) && <EtiquetaNuevo />}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-[#E9F1FF] px-1.5 py-0.5 text-[11px] font-bold text-[#0439D9]">
                      {i.codigoSis ? `SIS ${i.codigoSis}` : `ID ${i.identificador}`}
                    </span>
                    <EtiquetaTipo intento={i} envolver />
                  </div>
                </div>

                {/* Detalle del error (más visible) */}
                {detalleDe(i) && (
                  <div className="mt-3 rounded-lg border-l-[3px] border-[#0439D9] bg-[#F4F8FF] px-3 py-2">
                    <p className="break-words text-xs font-medium text-[#1E3A8A] [overflow-wrap:anywhere]">{detalleDe(i)}</p>
                  </div>
                )}

                {/* Datos del examen y control */}
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                  <dt className="font-semibold text-[#627A9B]">Examen</dt>
                  <dd className="min-w-0 text-right">
                    <span className="block break-words font-bold text-[#011140]">{i.examen ?? `Examen #${i.idExamen}`}</span>
                    <span className="text-[#45628D]">{formatFecha(i.fechaExamen)} · {i.horaExamen?.slice(0, 5)}</span>
                  </dd>
                  
                  <dt className="font-semibold text-[#627A9B]">Intento</dt>
                  <dd className="min-w-0 break-words text-right font-bold text-[#B91C1C]">
                    {fechaHoraNumerica(i.fechaHora, true)}
                  </dd>
                  
                  <dt className="font-semibold text-[#627A9B]">Controló</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-[#334155]">
                    {i.personalControl}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <TablePagination
              page={datos.pagina}
              pageSize={datos.tamano}
              totalRecords={datos.totalRegistros}
              totalPages={datos.totalPaginas}
              onPageChange={setPagina}
              itemLabel="intentos"
            />
          </div>
        </>
      )}
    </section>
  )
}

/**
 * Reportes (Épica 5): intentos incorrectos de todos los exámenes; expulsiones y excepciones por examen. El ADMIN
 * (REPORTES_VER) ve todos; el DOCENTE y el CONTROL, solo sus exámenes: los suyos o donde está asignado (V53).
 */
export default function ReportesPage() {
  const auth = useAuth()
  const soloMios = !tienePermiso(auth, 'REPORTES_VER')
  const puedeExportar = tienePermiso(auth, 'REPORTES_EXPORTAR')

  const [pestana, setPestana] = useState<Pestana>('intentos')
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [idExamen, setIdExamen] = useState<number | null>(null)
  // Resumen en vivo: total, hoy y ayer de cada tipo (también da los números de las pestañas).
  const [periodo, setPeriodo] = useState<Periodo>('todo')
  const desde = desdePeriodo(periodo)
  const resumen = useResumenReportes(idExamen, desde, !soloMios)
  // BUG-G04: buscar por nombre o código SIS en las cuatro pestañas (los intentos, en el servidor).
  const [buscar, setBuscar] = useState('')
  const [buscarIntentos, setBuscarIntentos] = useState('')
  // El gráfico por hora va plegado: así la tabla aparece arriba.
  const [verGrafico, setVerGrafico] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setBuscarIntentos(buscar), 300)
    return () => clearTimeout(t)
  }, [buscar])

  useEffect(() => {
    let vigente = true
      ; (soloMios ? listarMisExamenes(TODOS_LOS_PERIODOS) : listarExamenes(TODOS_LOS_PERIODOS))
        .then((lista) => {
          if (!vigente) return
          setExamenes([...lista].sort((a, b) => `${b.fecha} ${b.horaInicio}`.localeCompare(`${a.fecha} ${a.horaInicio}`)))
        })
        .catch(() => { if (vigente) setExamenes([]) })
    return () => { vigente = false }
  }, [soloMios])

  const [controles, setControles] = useState<{ idExamen: number; registros: RegistroControlIngresoExamen[] }>()
  useEffect(() => {
    if (idExamen == null || pestana !== 'expulsiones') return
    let vigente = true
    listarRegistrosControlExamen(idExamen)
      .then((registros) => { if (vigente) setControles({ idExamen, registros }) })
      .catch(() => { if (vigente) setControles({ idExamen, registros: [] }) })
    return () => { vigente = false }
  }, [idExamen, pestana])

  const nombresExamen = new Map(examenes.map((e) => [e.idExamen, nombreExamen(e)]))
  const examen = examenes.find((e) => e.idExamen === idExamen)
  const etiqueta = examen ? nombreExamen(examen) : undefined

  // DASH-05: solo un examen que ya empezó; el Excel lleva el nombre del servidor y un error se avisa con el modal.
  const iniciado = ['en_curso', 'finalizado'].includes(examen?.estado?.toLowerCase() ?? '')
  const [resultadoDescarga, setResultadoDescarga] = useState<Resultado | null>(null)
  // Antes de descargar se ve la vista previa (el PDF tal cual; el Excel, sus primeras filas).
  const [previa, setPrevia] = useState<'pdf' | 'xlsx' | null>(null)
  const descargarExcel = () => {
    if (!idExamen || !iniciado) return
    setPrevia('xlsx')
  }
  const descargarPDF = () => {
    if (!idExamen || !iniciado) return
    setPrevia('pdf')
  }

  const descargarReporte = puedeExportar && (pestana !== 'uso-ambientes' || !soloMios) ? (
    <DescargarReporte pestana={pestana}
      filtros={{ idExamen, examen: etiqueta, periodo: PERIODOS.find(([id]) => id === periodo)?.[1], desde,
        buscar: pestana === 'intentos' ? buscarIntentos : buscar, nombresExamen }}
      onError={(mensaje) => setResultadoDescarga({ tipo: 'error', mensaje })} />
  ) : null

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}
      >
        <section aria-labelledby="reportes-titulo" className="px-3 py-4 sm:px-5">
          <div className="w-full">
            <h1 id="reportes-titulo" className="sr-only">Reportes</h1>
            <div className="mb-3 sm:mb-4">
              <ResumenReportes resumen={resumen} activa={pestana} onElegir={setPestana} />
            </div>

            {/* BUG-G05: el filtro Examen va resaltado (es el principal); BUG-G04: buscador por estudiante o código SIS. */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#D8E3F5] bg-white p-2.5 shadow-sm lg:flex-row lg:items-center lg:gap-3">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:contents">
                <label htmlFor="reportes-examen"
                  className="relative inline-flex h-11 w-full shrink-0 cursor-pointer items-center rounded-lg border-2 border-[#0439D9]/25 bg-[#F4F8FF] pl-3 pr-9 text-sm text-[#45628D] focus-within:border-[#0439D9] sm:h-10 sm:w-auto sm:max-w-[26rem]">
                  <span className="shrink-0">Examen:</span>
                  <select
                    id="reportes-examen"
                    aria-label="Examen"
                    value={idExamen ?? ''}
                    onChange={(e) => setIdExamen(e.target.value ? Number(e.target.value) : null)}
                    className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pl-1.5 text-sm font-bold text-[#011140] outline-none"
                  >
                    <option value="">{soloMios ? 'Todos mis exámenes' : 'Todos los exámenes'}</option>
                    {examenes.map((e) => <option key={`${e.idExamen}-${e.idParalelo}`} value={e.idExamen}>{nombreExamen(e)}</option>)}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 text-[#0439D9]" aria-hidden="true" />
                </label>
                <label className="relative block min-w-0 flex-1">
                  <span className="sr-only">Buscar estudiante o código SIS</span>
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA0BF]" aria-hidden="true" />
                  <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar estudiante o código SIS"
                    className="h-11 w-full rounded-lg border border-[#D8E3F5] bg-white pl-9 pr-9 text-sm text-[#011140] outline-none placeholder:text-[#8BA0BF] focus:border-[#0439D9] focus:ring-2 focus:ring-[#0439D9]/15 sm:h-10 [&::-webkit-search-cancel-button]:hidden" />
                  {buscar && (
                    <button type="button" onClick={() => setBuscar('')} aria-label="Borrar la búsqueda"
                      className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-[#627A9B] hover:bg-[#F1F6FF]"><X size={15} aria-hidden="true" /></button>
                  )}
                </label>
                {/* Período: en la misma barra que el examen y el buscador. */}
                <div role="radiogroup" aria-label="Período" className="flex shrink-0 gap-0.5 overflow-x-auto rounded-lg bg-[#E9EFF8] p-1 [scrollbar-width:none]">
                  {PERIODOS.map(([id, texto]) => (
                    <button key={id} type="button" role="radio" aria-checked={periodo === id} onClick={() => setPeriodo(id)}
                      className={`h-8 flex-1 whitespace-nowrap rounded-md px-2.5 text-xs font-semibold transition-colors sm:flex-none sm:text-[13px] ${periodo === id ? 'bg-white text-[#0439D9] shadow-sm' : 'text-[#627A9B] hover:text-[#011140]'}`}>
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                {descargarReporte && <div className="hidden sm:block">{descargarReporte}</div>}
                {idExamen != null && puedeExportar && (
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {puedeExportar && (
                      <button
                        type="button"
                        onClick={() => void descargarPDF()}
                        disabled={!iniciado}
                        className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-3 py-2.5 sm:flex-none sm:px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
                      >
                        <Download size={16} aria-hidden="true" />
                        Acta (PDF)
                      </button>
                    )}
                    {puedeExportar && (
                      <button
                        type="button"
                        onClick={() => void descargarExcel()}
                        disabled={!iniciado}
                        className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-[#B8CBEF] bg-white px-3 py-2.5 sm:flex-none sm:px-4 text-sm font-semibold text-[#0439D9] shadow-sm transition-colors hover:bg-[#F1F6FF] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
                      >
                        <Download size={16} aria-hidden="true" />
                        Asistencia (Excel)
                      </button>
                    )}
                    {!iniciado && (
                      <span className="flex basis-full items-center gap-1 text-[11px] font-semibold text-[#B45309] sm:basis-auto">
                        <Lock size={12} aria-hidden="true" /> El examen aún no ha iniciado
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {soloMios && (
              <p className="mt-2 text-xs text-[#627A9B]">
                {examenes.length === 0
                  ? 'Aún no tienes exámenes: aquí aparecen los tuyos y aquellos donde te asignaron como personal de control.'
                  : 'Solo ves tus exámenes: los tuyos y aquellos donde te asignaron como personal de control.'}
              </p>
            )}

            {resumen[pestana] && (
              <button type="button" onClick={() => setVerGrafico((v) => !v)} aria-expanded={verGrafico}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0439D9] hover:underline">
                <ChartColumn size={14} aria-hidden="true" /> {verGrafico ? 'Ocultar el gráfico por hora' : 'Ver el gráfico por hora y por motivo'}
              </button>
            )}
            {resumen[pestana] && verGrafico && (
              <div className="mt-2">
                <GraficoPorHora porHora={resumen[pestana]!.porHora} porHoraAyer={resumen[pestana]!.porHoraAyer} ultimoHoy={resumen[pestana]!.ultimoHoy}
                  horaActual={new Date().getHours()} porMotivo={resumen[pestana]!.porMotivo} periodo={PERIODOS.find(([id]) => id === periodo)?.[1]}
                  titulo={`${TITULO_GRAFICO[pestana]} · hoy y ayer, por hora`} unidad={UNIDAD[pestana]} />
              </div>
            )}

            {/* Pestañas y «Descargar» en la misma fila: el botón no ocupa una fila propia. */}
            <div className="mt-4 flex items-center gap-2 sm:block sm:border-b sm:border-[#D8E3F5]">
            <div role="tablist" aria-label="Tipo de reporte"
              className="flex min-w-0 flex-1 gap-1 rounded-xl bg-[#E9EFF8] p-1 sm:gap-6 sm:rounded-none sm:bg-transparent sm:p-0">
              {GRUPOS.filter((g) => g.id !== 'ambientes' || !soloMios).map((g) => {
                const total = g.pestanas.reduce((n, p) => n + (resumen[p]?.total ?? 0), 0)
                const activo = grupoDe(pestana) === g.id
                return (
                  <button key={g.id} type="button" role="tab" aria-selected={activo} onClick={() => { if (!activo) setPestana(g.pestanas[0]) }}
                    className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-2 text-[13px] transition-colors sm:min-h-0 sm:flex-none sm:rounded-none sm:border-b-2 sm:px-0 sm:pb-2.5 sm:text-sm ${activo
                      ? 'bg-white font-semibold text-[#0439D9] shadow-sm sm:border-[#0439D9] sm:bg-transparent sm:shadow-none'
                      : 'font-medium text-[#627A9B] sm:border-transparent'}`}>
                    {g.texto}
                    <span className={`ml-1.5 inline-grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${activo ? 'bg-[#0439D9] text-white' : 'bg-[#E1E8F5] text-[#45628D]'}`}>{total}</span>
                  </button>
                )
              })}
            </div>
            {/* En el celular, «Descargar» va junto a las pestañas (solo el ícono); en escritorio, en la barra de filtros. */}
            {descargarReporte && <div className="shrink-0 sm:hidden">{descargarReporte}</div>}
            </div>
            {(() => {
              const grupo = GRUPOS.find((g) => g.id === grupoDe(pestana))!
              if (grupo.pestanas.length < 2) return null
              return (
                <div role="radiogroup" aria-label={`Reportes de ${grupo.texto.toLowerCase()}`} className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {grupo.pestanas.map((id) => {
                    const p = PESTANAS.find((x) => x.id === id)!
                    const activo = pestana === id
                    return (
                      <button key={id} type="button" role="radio" aria-checked={activo} onClick={() => setPestana(id)}
                        aria-label={resumen[id] ? `${p.texto} (${resumen[id]!.total})` : p.texto}
                        className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors ${activo ? 'border-[#0439D9] bg-[#EEF3FF] text-[#0439D9]' : 'border-[#D8E3F5] bg-white text-[#45628D] hover:bg-[#F8FAFF]'}`}>
                        {p.texto}
                        {resumen[id] && <span className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${activo ? 'bg-[#0439D9] text-white' : 'bg-[#EDF2FE] text-[#45628D]'}`}>{resumen[id]!.total}</span>}
                      </button>
                    )
                  })}
                </div>
              )
            })()}
            <div className="mt-4">
              {pestana === 'intentos' && <ReporteIntentos key={idExamen ?? 'todos'} idExamen={idExamen} examen={etiqueta} buscar={buscarIntentos} desde={desde} />}
              {pestana === 'fotos' && <FotosReportadasReporte idExamen={idExamen} examen={etiqueta} buscar={buscar} desde={desde} />}
              {/* BUG-G02/G03: con «Todos los exámenes» también se ven las expulsiones y las excepciones de todos. */}
              {pestana === 'expulsiones' && <ExpulsionesReporte idExamen={idExamen} examen={etiqueta} nombresExamen={nombresExamen} buscar={buscar} desde={desde}
                controles={idExamen != null && controles?.idExamen === idExamen ? controles.registros : []} />}
              {pestana === 'excepciones' && <ExcepcionesNoHabilitadoReporte idExamen={idExamen} nombresExamen={nombresExamen} buscar={buscar} desde={desde} />}
              {pestana === 'modificaciones' && <ReporteModificaciones idExamen={idExamen} buscar={buscar} desde={desde} />}
              {pestana === 'ingresos-qr' && <ReporteIngresos idExamen={idExamen} buscar={buscar} tipo="QR" />}
              {pestana === 'ingresos-manual' && <ReporteIngresos idExamen={idExamen} buscar={buscar} tipo="MANUAL" />}
              {pestana === 'uso-ambientes' && !soloMios && <ReporteUsoAmbientes idExamen={idExamen} buscar={buscar} />}
            </div>
          </div>
        </section>
      </div>
      <ResultadoModal resultado={resultadoDescarga} onClose={() => setResultadoDescarga(null)} />
      <VistaPreviaExamen idExamen={idExamen ?? null} formato={previa} onClose={() => setPrevia(null)} />
      <MobileBottomNav />
    </PanelLayout>
  )
}