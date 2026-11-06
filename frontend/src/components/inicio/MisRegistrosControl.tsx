import { useEffect, useState } from 'react'
import { Ban, Camera, Copy, KeyRound, ShieldAlert, UserCheck, type LucideIcon } from 'lucide-react'
import { Sparkline } from './Graficas'
import ErrorCarga from '../ui/ErrorCarga'
import useEnVivo from '../../hooks/useEnVivo'
import { obtenerInicioControl, type InicioControl } from '../../services/inicioService'

const CAMBIOS = new Set(['INGRESO', 'HABILITACION', 'FOTO', 'RECONECTADO'])
type Tipo = InicioControl['recientes'][number]['tipo']
const TIPO: Record<Tipo, { texto: string; icono: LucideIcon; clase: string }> = {
  INGRESO: { texto: 'Ingreso', icono: UserCheck, clase: 'bg-[#DCFCE7] text-[#15803D]' },
  INGRESO_MANUAL: { texto: 'Ingreso manual', icono: KeyRound, clase: 'bg-[#E0E9FF] text-[#0439D9]' },
  INTENTO: { texto: 'Intento incorrecto', icono: ShieldAlert, clase: 'bg-[#FEF3C7] text-[#B45309]' },
  FOTO_REPORTADA: { texto: 'Foto reportada', icono: Camera, clase: 'bg-[#F3E8FF] text-[#7E22CE]' },
  QR_DUPLICADO: { texto: 'QR duplicado', icono: Copy, clase: 'bg-[#FDECEC] text-[#B91C1C]' },
  EXPULSION: { texto: 'Expulsión', icono: Ban, clase: 'bg-[#FDECEC] text-[#B91C1C]' },
}
const hora = (fecha: string) => fecha.slice(11, 16)

function Indicador({ valor, texto, detalle, color }: { valor: number; texto: string; detalle?: string; color: string }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
      <p className={`text-xl font-extrabold tabular-nums ${color}`}>{valor}</p>
      <p className="text-[11px] font-semibold text-[#011140]">{texto}</p>
      {detalle && <p className="text-[10px] text-[#627A9B]">{detalle}</p>}
    </div>
  )
}

/**
 * Inicio de CONTROL: lo que registró hoy quien inició sesión (no lo de otros controles). Se actualiza
 * con cada ingreso o cambio en vivo y, por los intentos y reportes, cada minuto.
 */
export default function MisRegistrosControl() {
  const [datos, setDatos] = useState<InicioControl | null>(null)
  const [error, setError] = useState(false)
  const [recarga, setRecarga] = useState(0)

  useEnVivo((c) => CAMBIOS.has(c.tipo), () => setRecarga((n) => n + 1))

  useEffect(() => {
    const id = window.setInterval(() => setRecarga((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let vigente = true
    obtenerInicioControl()
      .then((d) => { if (vigente) { setDatos(d); setError(false) } })
      .catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [recarga])

  const horaActual = datos ? Number(datos.ahora.slice(11, 13)) : 0
  const desde = Math.max(0, Math.min(horaActual - 5, (datos?.ingresosPorHora.findIndex((n) => n > 0) ?? -1) >= 0 ? datos!.ingresosPorHora.findIndex((n) => n > 0) : horaActual))
  const tramo = datos ? datos.ingresosPorHora.slice(desde, horaActual + 1) : []
  const incidencias = datos ? datos.intentosIncorrectos + datos.fotosReportadas + datos.qrDuplicados + datos.expulsiones : 0

  return (
    <section aria-labelledby="mis-registros" className="rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm">
      <h2 id="mis-registros" className="text-[11px] font-bold uppercase text-[#011140] sm:text-sm">Mis registros de hoy</h2>
      <p className="text-[11px] text-[#627A9B]">Solo lo que registraste tú.</p>

      {error && !datos ? (
        <ErrorCarga className="mt-3" mensaje="No se pudieron cargar tus registros." onReintentar={() => setRecarga((n) => n + 1)} />
      ) : !datos ? (
        <p role="status" className="py-6 text-center text-sm text-[#627A9B]">Cargando tus registros…</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Indicador valor={datos.ingresos} texto="Ingresos" color="text-[#15803D]"
              detalle={datos.ingresosManuales ? `${datos.ingresosManuales} ${datos.ingresosManuales === 1 ? 'manual' : 'manuales'}` : undefined} />
            <Indicador valor={datos.intentosIncorrectos} texto="Intentos incorrectos" color="text-[#B45309]" />
            <Indicador valor={datos.fotosReportadas} texto="Fotos reportadas" color="text-[#7E22CE]" />
            <Indicador valor={datos.qrDuplicados + datos.expulsiones} texto="QR duplicados y expulsiones" color="text-[#B91C1C]" />
          </div>

          {datos.ingresos > 0 && tramo.length > 1 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-[#45628D]">Mis ingresos por hora ({String(desde).padStart(2, '0')}:00 – ahora)</p>
              <Sparkline valores={tramo} desde="#22C55E" hasta="#0EA5E9" etiqueta={`Mis ingresos por hora: ${tramo.join(', ')}`} />
            </div>
          )}

          <h3 className="mt-3 text-[11px] font-bold uppercase text-[#45628D]">Mis últimos registros</h3>
          {datos.recientes.length === 0 ? (
            <p className="mt-1 text-xs text-[#627A9B]">Aún no registraste nada hoy.</p>
          ) : (
            <ul className="mt-1 divide-y divide-[#EEF2F7]" aria-label="Mis últimos registros">
              {datos.recientes.map((r, i) => {
                const t = TIPO[r.tipo] ?? TIPO.INGRESO
                const Icono = t.icono
                return (
                  <li key={`${r.fecha}-${r.tipo}-${i}`} className="flex items-center gap-2 py-2 text-xs">
                    <span className="w-10 shrink-0 font-semibold tabular-nums text-[#011140]">{hora(r.fecha)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[#011140]">{r.estudiante ?? r.codigo ?? 'Sin identificar'}</span>
                      <span className="block truncate text-[10px] text-[#627A9B]">{[r.estudiante ? r.codigo : null, r.examen].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${t.clase}`}>
                      <Icono size={11} aria-hidden="true" /><span className="max-sm:sr-only">{t.texto}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {incidencias === 0 && datos.ingresos > 0 && <p className="mt-2 text-[11px] text-[#15803D]">Sin incidencias en tus registros de hoy.</p>}
        </>
      )}
    </section>
  )
}
