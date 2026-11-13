import { coincide } from '../../utils/buscar'
import { useEffect, useState } from 'react'
import useEnVivo from '../../hooks/useEnVivo'
import TablePagination from '../users/TablePagination'
import ErrorCarga from '../ui/ErrorCarga'
import { Link } from 'react-router-dom'
import { listarFotosReportadas, textoMotivoReporte, type FilaFotoReportada } from '../../services/fotoRevisionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

const TAMANO_PAGINA = 10
const ESTADO: Record<string, [string, string]> = {
  PENDIENTE: ['Pendiente', 'bg-[#FEF3C7] text-[#B45309]'],
  APROBADA: ['Foto nueva aprobada', 'bg-[#DCFCE7] text-[#15803D]'],
  DESCARTADO: ['La foto estaba bien', 'bg-[#E0E9FF] text-[#0439D9]'],
}

/**
 * Fotos reportadas en el control de ingreso, pendientes y resueltas, para que quede constancia en el examen. El ADMIN
 * ve todas; el DOCENTE y el CONTROL, las de sus exámenes, y pueden revisar las pendientes. Se actualiza en vivo.
 */
export default function FotosReportadasReporte({ idExamen, examen, buscar = '' }: { idExamen: number | null; examen?: string; buscar?: string }) {
  const [recarga, setRecarga] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [resultado, setResultado] = useState<{ clave: string; filas?: FilaFotoReportada[]; error?: boolean }>()
  const clave = `${idExamen ?? 'todos'}|${recarga}`
  useEnVivo((c) => c.tipo === 'FOTO' || c.tipo === 'FOTO_REPORTADA' || (idExamen != null && c.idExamen === idExamen), () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    listarFotosReportadas(idExamen)
      .then((filas) => { if (vigente) setResultado({ clave, filas }) })
      .catch(() => { if (vigente) setResultado({ clave, error: true }) })
    return () => { vigente = false }
  }, [idExamen, clave])

  const actual = resultado?.clave === clave ? resultado : resultado?.filas ? resultado : undefined
  // BUG-G04: por nombre o código SIS del estudiante.
  const filas = (actual?.filas ?? []).filter((f) => coincide(buscar, f.estudiante, f.codigoSis))
  const totalPaginas = Math.ceil(filas.length / TAMANO_PAGINA)
  const paginaActual = Math.min(pagina, Math.max(totalPaginas - 1, 0))
  const visibles = filas.slice(paginaActual * TAMANO_PAGINA, (paginaActual + 1) * TAMANO_PAGINA)
  const pendientes = filas.filter((f) => f.estado === 'PENDIENTE').length

  return (
    <section aria-label="Fotos reportadas" className="rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-4">
      <h3 className="font-semibold text-[#011140]">
        Fotos reportadas{examen ? ` · ${examen}` : ''} ({actual?.filas ? filas.length : '…'})
        {pendientes > 0 && <span className="ml-2 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-bold text-[#B45309]">{pendientes} {pendientes === 1 ? 'pendiente' : 'pendientes'}</span>}
      </h3>
      {!actual && <p role="status" className="mt-2 text-sm text-[#627A9B]">Consultando fotos reportadas…</p>}
      {actual?.error && !actual.filas && <ErrorCarga className="mt-2" mensaje="No se pudieron cargar las fotos reportadas." onReintentar={() => setRecarga((n) => n + 1)} />}
      {actual?.filas?.length === 0 && <p className="mt-2 text-sm text-[#627A9B]">No hay fotos reportadas{idExamen ? ' en este examen' : ''}.</p>}
      {(actual?.filas?.length ?? 0) > 0 && filas.length === 0 && <p className="mt-2 text-sm text-[#627A9B]">Ninguna foto reportada coincide con la búsqueda.</p>}
      {filas.length > 0 && (
        <>
          <div className="mt-3 overflow-x-auto max-md:hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#F4F7FC] text-[11px] font-semibold uppercase text-[#45628D]">
                  <th className="px-3 py-2">Fecha y hora</th><th className="px-3 py-2">Estudiante</th><th className="px-3 py-2">Examen</th>
                  <th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Reportada por</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {visibles.map((f) => {
                  const [texto, clase] = ESTADO[f.estado] ?? [f.estado, 'bg-[#EEF2F6] text-[#475569]']
                  return (
                    <tr key={f.idReporte}>
                      <td className="px-3 py-2.5 tabular-nums text-[#011140]">{fechaHoraNumerica(f.reportadoEn)}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#011140]">{f.estudiante}<span className="block text-[11px] font-normal text-[#627A9B]">{f.codigoSis ?? '—'}</span></td>
                      <td className="px-3 py-2.5 text-[#45628D]">{f.examen ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#011140]">{textoMotivoReporte(f.motivo)}{f.detalle && <span className="block text-[11px] text-[#627A9B]">{f.detalle}</span>}</td>
                      <td className="px-3 py-2.5 text-[#45628D]">{f.reportadoPor ?? '—'}</td>
                      <td className="px-3 py-2.5"><span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${clase}`}>{texto}</span></td>
                      <td className="px-3 py-2.5 text-right">
                        {f.estado === 'PENDIENTE' && (
                          <Link to={`/dashboard/estudiantes/fotos?estudiante=${f.idEstudiante}`} aria-label={`Revisar la foto de ${f.estudiante}`}
                            className="rounded-md border border-[#D8E3F5] px-3 py-1.5 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">Revisar</Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-2 md:hidden" aria-label="Fotos reportadas (lista)">
            {visibles.map((f) => {
              const [texto, clase] = ESTADO[f.estado] ?? [f.estado, 'bg-[#EEF2F6] text-[#475569]']
              return (
                <li key={f.idReporte} className="rounded-lg border border-[#E2E8F0] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold text-[#011140]">{f.estudiante}<span className="block text-[11px] font-normal text-[#627A9B]">{[f.codigoSis, f.examen].filter(Boolean).join(' · ')}</span></p>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${clase}`}>{texto}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#45628D]">{textoMotivoReporte(f.motivo)}{f.detalle ? `: ${f.detalle}` : ''}</p>
                  <p className="mt-0.5 text-[11px] text-[#627A9B]">{fechaHoraNumerica(f.reportadoEn)}{f.reportadoPor ? ` · ${f.reportadoPor}` : ''}</p>
                  {f.estado === 'PENDIENTE' && (
                    <Link to={`/dashboard/estudiantes/fotos?estudiante=${f.idEstudiante}`} className="mt-2 flex min-h-10 w-full items-center justify-center rounded-md border border-[#D8E3F5] text-sm font-semibold text-[#0439D9]">Revisar</Link>
                  )}
                </li>
              )
            })}
          </ul>
          {totalPaginas > 1 && (
            <div className="mt-3">
              <TablePagination page={paginaActual} pageSize={TAMANO_PAGINA} totalRecords={filas.length} totalPages={totalPaginas}
                onPageChange={setPagina} itemLabel="fotos reportadas" />
            </div>
          )}
        </>
      )}
    </section>
  )
}
