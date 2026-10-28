import { useEffect, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import ExpulsionesReporte from '../../components/control/ExpulsionesReporte'
import ExcepcionesNoHabilitadoReporte from '../../components/control/ExcepcionesNoHabilitadoReporte'
import useEnVivo from '../../hooks/useEnVivo'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { listarRegistrosControlExamen, type RegistroControlIngresoExamen } from '../../services/controlIngresoService'
import { reporteIntentos, type IntentoReporte, type PaginaIntentos } from '../../services/intentoIngresoService'
import { fechaHoraNumerica, formatFecha } from '../../utils/examenFormat'

type Pestana = 'intentos' | 'expulsiones' | 'excepciones'
const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'intentos', texto: 'Intentos incorrectos' },
  { id: 'expulsiones', texto: 'Expulsiones' },
  { id: 'excepciones', texto: 'Excepciones' },
]
const TAMANO = 20

const nombreExamen = (e: ExamenDto) => `${e.asignatura} · ${formatFecha(e.fecha)} · ${e.horaInicio.slice(0, 5)}`

function EtiquetaTipo({ tipo }: { tipo: IntentoReporte['tipo'] }) {
  return tipo === 'AULA_INCORRECTA'
    ? <span className="inline-flex shrink-0 rounded-full bg-[#FFF7E6] px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">Aula incorrecta</span>
    : <span className="inline-flex shrink-0 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">No le corresponde</span>
}

const quien = (i: IntentoReporte) => i.estudiante ?? `No identificado (${i.identificador})`
const examenDe = (i: IntentoReporte) =>
  `${i.examen ?? `Examen #${i.idExamen}`} · ${formatFecha(i.fechaExamen)} ${i.horaExamen?.slice(0, 5) ?? ''}`.trim()

/** DASH-06 / HU#7: intentos de ingreso incorrectos de todos los exámenes o de uno, paginados. */
function ReporteIntentos({ idExamen, examen }: { idExamen: number | null; examen?: string }) {
  const [pagina, setPagina] = useState(0)
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<{ clave: string; datos?: PaginaIntentos; error?: string }>()
  const clave = `${idExamen ?? 'todos'}|${pagina}|${recarga}`
  useEnVivo((cambio) => idExamen == null || cambio.idExamen === idExamen, () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    reporteIntentos(idExamen, pagina, TAMANO)
      .then((datos) => { if (vigente) setResultado({ clave, datos }) })
      .catch(() => { if (vigente) setResultado({ clave, error: 'No se pudo cargar el reporte de intentos.' }) })
    return () => { vigente = false }
  }, [idExamen, pagina, clave])

  const actual = resultado?.clave === clave ? resultado : undefined
  const datos = actual?.datos

  return (
    <section aria-label="Intentos de ingreso incorrectos" className="rounded-xl border border-[#D8E3F5] bg-white p-4 sm:p-5">
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
          {idExamen == null ? 'No hay intentos de ingreso incorrectos registrados.' : 'No hubo intentos incorrectos en este examen.'}
        </p>
      )}
      {datos && datos.contenido.length > 0 && (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
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
                  <tr key={i.idIntento} className="border-b border-[#EDF1F7] align-top">
                    <td className="px-3 py-2.5 font-semibold text-[#011140]">{quien(i)}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{i.codigoSis ?? i.identificador}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{examenDe(i)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#011140]">{fechaHoraNumerica(i.fechaHora, true)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-start gap-1">
                        <EtiquetaTipo tipo={i.tipo} />
                        <span className="break-words text-xs text-[#45628D] [overflow-wrap:anywhere]">{i.motivo}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">{i.personalControl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 space-y-3 md:hidden">
            {datos.contenido.map((i) => (
              <li key={i.idIntento} className="rounded-lg border border-[#E4E9F2] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#011140]">{quien(i)}</p>
                  <EtiquetaTipo tipo={i.tipo} />
                </div>
                <p className="mt-1 text-xs text-[#627A9B]">SIS {i.codigoSis ?? i.identificador} · {examenDe(i)}</p>
                <p className="mt-1 break-words text-xs text-[#45628D] [overflow-wrap:anywhere]">{i.motivo}</p>
                <p className="mt-1 text-xs text-[#627A9B]">{fechaHoraNumerica(i.fechaHora, true)} · Controló: {i.personalControl}</p>
              </li>
            ))}
          </ul>
          {datos.totalPaginas > 1 && (
            <nav aria-label="Páginas del reporte" className="mt-4 flex items-center justify-between gap-2 text-sm">
              <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D8E3F5] px-3 py-2 font-semibold text-[#0439D9] disabled:opacity-40">
                <ChevronLeft size={16} aria-hidden="true" /> Anterior
              </button>
              <span className="text-[#627A9B]">Página {pagina + 1} de {datos.totalPaginas}</span>
              <button type="button" disabled={pagina + 1 >= datos.totalPaginas} onClick={() => setPagina((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D8E3F5] px-3 py-2 font-semibold text-[#0439D9] disabled:opacity-40">
                Siguiente <ChevronRight size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}

/** Reportes del ADMIN (Épica 5): intentos incorrectos de todos los exámenes; expulsiones y excepciones por examen. */
export default function ReportesPage() {
  const [pestana, setPestana] = useState<Pestana>('intentos')
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [idExamen, setIdExamen] = useState<number | null>(null)

  useEffect(() => {
    let vigente = true
    listarExamenes()
      .then((lista) => {
        if (!vigente) return
        setExamenes([...lista].sort((a, b) => `${b.fecha} ${b.horaInicio}`.localeCompare(`${a.fecha} ${a.horaInicio}`)))
      })
      .catch(() => { if (vigente) setExamenes([]) })
    return () => { vigente = false }
  }, [])

  // Registros del control del examen elegido: dan el nombre y el código SIS de los expulsados.
  const [controles, setControles] = useState<{ idExamen: number; registros: RegistroControlIngresoExamen[] }>()
  useEffect(() => {
    if (idExamen == null || pestana !== 'expulsiones') return
    let vigente = true
    listarRegistrosControlExamen(idExamen)
      .then((registros) => { if (vigente) setControles({ idExamen, registros }) })
      .catch(() => { if (vigente) setControles({ idExamen, registros: [] }) })
    return () => { vigente = false }
  }, [idExamen, pestana])

  const examen = examenes.find((e) => e.idExamen === idExamen)
  const etiqueta = examen ? nombreExamen(examen) : undefined

  return (
    <PanelLayout compactDesktop>
      <div
        className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}
      >
        <section aria-labelledby="reportes-titulo" className="px-3 py-4 sm:px-6 min-[960px]:px-4 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3 size={22} className="text-[#0439D9]" aria-hidden="true" />
              <h1 id="reportes-titulo" className="text-xl font-bold text-[#011140]">Reportes</h1>
              <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[11px] font-semibold text-[#0439D9]">Solo ADMIN</span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="reportes-examen" className="text-xs font-semibold text-[#011140]">Examen</label>
              <select
                id="reportes-examen"
                value={idExamen ?? ''}
                onChange={(e) => setIdExamen(e.target.value ? Number(e.target.value) : null)}
                className="h-10 w-full rounded-lg border border-[#B8CBEF] bg-white px-3 text-sm text-[#011140] sm:max-w-md"
              >
                <option value="">Todos los exámenes</option>
                {examenes.map((e) => <option key={`${e.idExamen}-${e.idParalelo}`} value={e.idExamen}>{nombreExamen(e)}</option>)}
              </select>
            </div>

            <div role="tablist" aria-label="Tipo de reporte" className="mt-4 flex gap-5 overflow-x-auto border-b border-[#D8E3F5]">
              {PESTANAS.map((p) => (
                <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
                  className={`shrink-0 border-b-2 pb-2.5 text-sm ${pestana === p.id ? 'border-[#0439D9] font-semibold text-[#0439D9]' : 'border-transparent font-medium text-[#627A9B]'}`}>
                  {p.texto}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {pestana === 'intentos' && <ReporteIntentos key={idExamen ?? 'todos'} idExamen={idExamen} examen={etiqueta} />}
              {pestana !== 'intentos' && idExamen == null && (
                <p className="rounded-xl border border-dashed border-[#B8CBEF] bg-white/70 p-8 text-center text-sm text-[#627A9B]">
                  Elige un examen para ver sus {pestana === 'expulsiones' ? 'expulsiones' : 'excepciones de no habilitados'}.
                </p>
              )}
              {pestana === 'expulsiones' && idExamen != null && <ExpulsionesReporte idExamen={idExamen} examen={etiqueta}
                controles={controles?.idExamen === idExamen ? controles.registros : []} />}
              {pestana === 'excepciones' && idExamen != null && <ExcepcionesNoHabilitadoReporte idExamen={idExamen} />}
            </div>
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}
