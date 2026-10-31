import { useState } from 'react'
import { DatabaseBackup, Download, LoaderCircle } from 'lucide-react'
import { descargarRespaldo } from '../../services/respaldoService'

/** Configuración → Respaldo de la base de datos (solo ADMIN, IMP-10). */
export default function RespaldoBase() {
  const [descargando, setDescargando] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)

  const descargar = async () => {
    setDescargando(true)
    setAviso(null)
    try {
      const nombre = await descargarRespaldo()
      setAviso({ ok: true, texto: `Respaldo descargado: ${nombre}` })
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : 'No se pudo descargar el respaldo.' })
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section aria-labelledby="respaldo-titulo" className="mt-6 rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FF] text-[#0439D9]">
            <DatabaseBackup size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="respaldo-titulo" className="text-base font-bold text-[#011140]">Respaldo de la base de datos</h2>
            <p className="mt-0.5 text-sm text-[#627A9B]">
              Descarga una copia completa de la base. Hazlo antes de cada despliegue con cambios en la base y guárdala fuera del
              servidor: el laboratorio no hace respaldos.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void descargar()} disabled={descargando}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white disabled:opacity-60">
          {descargando ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          {descargando ? 'Generando respaldo…' : 'Descargar respaldo'}
        </button>
      </div>
      {aviso && (
        <p role="status" className={`mt-3 rounded-lg p-3 text-sm ${aviso.ok ? 'bg-[#ECFDF3] text-[#15803D]' : 'bg-[#FEF2F2] text-[#B91C1C]'}`}>{aviso.texto}</p>
      )}
    </section>
  )
}
