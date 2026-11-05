import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Clock3, Database, DatabaseBackup, Download, HardDrive, Info, LoaderCircle, Lock, RotateCcw, UserRound } from 'lucide-react'
import { descargarRespaldo, obtenerEstadoRespaldo, type EstadoRespaldo } from '../../services/respaldoService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

/** 4 200 000 → "4,2 MB". */
function tamanoLegible(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const unidades = ['KB', 'MB', 'GB']
  let valor = bytes / 1024
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) { valor /= 1024; i++ }
  return `${valor.toLocaleString('es-BO', { maximumFractionDigits: 1 })} ${unidades[i]}`
}

function Dato({ icono: Icono, etiqueta, valor, detalle }: { icono: typeof Database; etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl bg-[#F8FAFF] p-3">
      <Icono size={16} className="mt-0.5 shrink-0 text-[#45628D]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] text-[#627A9B]">{etiqueta}</p>
        <p className="truncate text-sm font-semibold text-[#011140]" title={valor}>{valor}</p>
        {detalle && <p className="truncate text-[11px] text-[#627A9B]">{detalle}</p>}
      </div>
    </div>
  )
}

/**
 * Configuración → Respaldo de la base de datos (solo ADMIN, IMP-10): datos de la base, último respaldo,
 * descarga con su estado (generando o error), aviso de datos personales, cómo restaurar e historial.
 */
export default function RespaldoBase() {
  const [descargando, setDescargando] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [estado, setEstado] = useState<EstadoRespaldo>()

  const cargarEstado = useCallback(() => {
    obtenerEstadoRespaldo().then(setEstado).catch(() => undefined)
  }, [])
  useEffect(() => { cargarEstado() }, [cargarEstado])

  const descargar = async () => {
    setDescargando(true)
    setAviso(null)
    try {
      const nombre = await descargarRespaldo()
      setAviso({ ok: true, texto: `Respaldo descargado: ${nombre}` })
      cargarEstado()
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : 'No se pudo descargar el respaldo.' })
    } finally {
      setDescargando(false)
    }
  }

  const ultimo = estado?.historial[0]

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="respaldo-titulo" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[#E8EDF5] bg-white p-4 shadow-[0_4px_16px_rgba(13,26,77,0.07)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#4F46E5] text-white">
            <DatabaseBackup size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="respaldo-titulo" className="text-base font-bold text-[#011140]">Respaldo de la base de datos</h2>
            <p className="mt-0.5 text-sm text-[#627A9B]">
              Una copia completa de la base para guardarla fuera del servidor: el laboratorio no hace respaldos. Descárgala antes de
              cada despliegue con cambios en la base.
            </p>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <Dato icono={Database} etiqueta="Base" valor={estado?.baseDatos ?? '—'} />
          <Dato icono={Clock3} etiqueta="Último respaldo" valor={ultimo ? fechaHoraNumerica(ultimo.fecha) : 'Todavía no hay'} detalle={ultimo?.usuario ?? undefined} />
          <Dato icono={HardDrive} etiqueta="Tamaño de la base" valor={tamanoLegible(estado?.tamanoBytes)} />
        </div>

        {estado && !estado.automatico && (
          <p className="flex items-start gap-2 rounded-lg bg-[#F8FAFC] p-3 text-xs text-[#45628D]">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            El respaldo automático nocturno está apagado: necesita un volumen persistente del servidor. Mientras tanto, descárgalo a mano.
          </p>
        )}

        {descargando && (
          <div role="status" className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-[#0439D9]">Generando el respaldo… no cierres la página.</p>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F5F9]">
              <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#4F46E5]" />
            </div>
          </div>
        )}

        {aviso && (
          <p role="status" className={`flex items-start gap-2 rounded-lg p-3 text-sm ${aviso.ok ? 'bg-[#ECFDF3] text-[#15803D]' : 'border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'}`}>
            {aviso.ok ? <CircleCheck size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />}
            {aviso.texto}
          </p>
        )}

        <p className="flex items-start gap-2 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-3 text-xs leading-relaxed text-[#9A3412]">
          <Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          El archivo contiene datos personales de estudiantes y del personal: guárdalo en un lugar seguro y no lo compartas. Cada
          descarga queda registrada con tu nombre.
        </p>

        <details className="rounded-lg border border-[#E6EBF2] p-3 text-xs text-[#334E7A]">
          <summary className="cursor-pointer font-semibold text-[#0439D9]">Cómo restaurar un respaldo</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Crea una base vacía en PostgreSQL (la misma versión o una más nueva).</li>
            <li>Ejecuta: <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5">psql -h SERVIDOR -U USUARIO -d BASE -f sigex-respaldo-AAAAMMDD-HHMM.sql</code></li>
            <li>Apunta el backend a esa base y arráncalo: Flyway ve que ya tiene todas las migraciones.</li>
          </ol>
        </details>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => void descargar()} disabled={descargando}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-5 text-sm font-semibold text-white hover:bg-[#032DB0] disabled:opacity-60">
            {descargando ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              : aviso && !aviso.ok ? <RotateCcw size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
            {descargando ? 'Generando respaldo…' : aviso && !aviso.ok ? 'Reintentar' : 'Descargar respaldo'}
          </button>
        </div>
      </section>

      <section aria-labelledby="respaldos-descargados" className="min-w-0 rounded-2xl border border-[#E8EDF5] bg-white p-4 shadow-[0_4px_16px_rgba(13,26,77,0.07)] sm:p-5">
        <h2 id="respaldos-descargados" className="text-sm font-bold text-[#011140]">Respaldos descargados</h2>
        {!estado ? (
          <p className="mt-3 text-xs text-[#627A9B]">Cargando…</p>
        ) : estado.historial.length === 0 ? (
          <p className="mt-3 text-xs text-[#627A9B]">Todavía nadie descargó un respaldo.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#EEF2F7]">
            {estado.historial.map((r, i) => (
              <li key={`${r.fecha}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E0F2FE] text-[#0EA5E9]">
                  <Database size={15} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#011140]">{fechaHoraNumerica(r.fecha)}</span>
                  <span className="flex items-center gap-1 truncate text-[11px] text-[#627A9B]"><UserRound size={11} aria-hidden="true" />{r.usuario || '—'}</span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-[#45628D]">{tamanoLegible(r.bytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
