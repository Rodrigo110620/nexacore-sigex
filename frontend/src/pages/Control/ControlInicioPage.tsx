import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Ban, CircleCheck, Clock3, Copy, Hourglass, IdCard, ImageUp, KeyRound, List, MapPin, ScanLine, ShieldAlert,
  UserRoundX, UsersRound, type LucideIcon,
} from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import { Anillo, BarraDegradado, GraficaIngresosHora, Sparkline } from '../../components/inicio/Graficas'
import { EnVivo } from '../../components/inicio/Comun'
import { DIAS_LARGOS, TARJETA, formatoPct, horaMinutos, horasDelDia, porcentaje, saludo } from '../../utils/inicio'
import ErrorCarga from '../../components/ui/ErrorCarga'
import { useAuth } from '../../context/AuthContext'
import useEnVivo from '../../hooks/useEnVivo'
import usePanelControl from '../../hooks/usePanelControl'
import useResumenesExamenes from '../../hooks/useResumenesExamenes'
import type { ResumenEstudiantes } from '../../services/controlExamenService'
import type { ExamenDto } from '../../services/examenService'
import { obtenerInicioControl, type InicioControl } from '../../services/inicioService'
import { addMinutes, estadoDelExamen, etiquetaAulas, fechaLocal, formatFecha, horaCorta, materiaYGrupo } from '../../utils/examenFormat'
import { aperturaControl } from '../../utils/tiempoExamen'

type Resumenes = Record<number, ResumenEstudiantes | 'error'>
type Registro = InicioControl['recientes'][number]
const MIS_CAMBIOS = new Set(['INGRESO', 'HABILITACION', 'FOTO', 'RECONECTADO'])
const VISIBLES = 6

const REGISTRO: Record<Registro['tipo'], { texto: string; clase: string; icono: LucideIcon; circulo: string }> = {
  INGRESO: { texto: 'Ingreso', clase: 'bg-[#DCFCE7] text-[#15803D]', icono: CircleCheck, circulo: 'bg-[#DCFCE7] text-[#15803D]' },
  INGRESO_MANUAL: { texto: 'Ingreso manual', clase: 'bg-[#FEF3C7] text-[#B45309]', icono: KeyRound, circulo: 'bg-[#FEF3C7] text-[#B45309]' },
  INTENTO: { texto: 'Intento incorrecto', clase: 'bg-[#FFE4E6] text-[#E11D48]', icono: UserRoundX, circulo: 'bg-[#FFE4E6] text-[#E11D48]' },
  FOTO_REPORTADA: { texto: 'Foto reportada', clase: 'bg-[#EDE9FE] text-[#7C3AED]', icono: ImageUp, circulo: 'bg-[#EDE9FE] text-[#7C3AED]' },
  QR_DUPLICADO: { texto: 'QR duplicado', clase: 'bg-[#FFEDD5] text-[#C2410C]', icono: Copy, circulo: 'bg-[#FFEDD5] text-[#C2410C]' },
  EXPULSION: { texto: 'Expulsión', clase: 'bg-[#FFE4E6] text-[#BE123C]', icono: Ban, circulo: 'bg-[#FFE4E6] text-[#BE123C]' },
}

const datosDe = (r: Resumenes, id: number) => (r[id] && r[id] !== 'error' ? (r[id] as ResumenEstudiantes) : null)

/**
 * Inicio de CONTROL (y de quien controla el ingreso): el resumen del día, sus propios registros (no los de
 * otros controles), el examen en curso con sus contadores en vivo y los exámenes de hoy.
 */
export default function ControlInicioPage() {
  const { nombre } = useAuth()
  const { examenes, error, ahora, recargar } = usePanelControl()
  const [mios, setMios] = useState<InicioControl | null>(null)
  const [errorMios, setErrorMios] = useState(false)
  const [recargaMios, setRecargaMios] = useState(0)

  const hoy = fechaLocal(ahora)
  const deHoy = useMemo(() => {
    const unicos = new Map<number, ExamenDto>()
    for (const e of examenes ?? []) if (e.fecha === hoy && !unicos.has(e.idExamen)) unicos.set(e.idExamen, e)
    return [...unicos.values()].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  }, [examenes, hoy])
  const enCurso = deHoy.filter((e) => estadoDelExamen(e, ahora).fase === 'en-curso')
  const { resumenes, recargar: recargarResumenes } = useResumenesExamenes(deHoy.map((e) => e.idExamen), ahora)

  useEnVivo((c) => MIS_CAMBIOS.has(c.tipo), () => setRecargaMios((n) => n + 1))
  useEffect(() => {
    const id = window.setInterval(() => setRecargaMios((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    let vigente = true
    obtenerInicioControl()
      .then((d) => { if (vigente) { setMios(d); setErrorMios(false) } })
      .catch(() => { if (vigente) setErrorMios(true) })
    return () => { vigente = false }
  }, [recargaMios])

  const primerNombre = nombre?.trim().split(/\s+/)[0]

  return (
    <PanelLayout compactDesktop topBarVariant="controlMinimal" title="PANEL DE CONTROL" description="Monitoreo de tu aula y tus registros">
      <div className="flex w-full flex-col gap-3.5 px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:gap-5 sm:px-5 sm:py-6 min-[960px]:pb-8">
        {error ? (
          <ErrorCarga mensaje={error} onReintentar={recargar} />
        ) : !examenes ? (
          <p role="status" className="py-10 text-center text-sm text-[#627A9B]">Cargando tu panel…</p>
        ) : (
          <>
            <Banner nombre={primerNombre} ahora={ahora} deHoy={deHoy} enCurso={enCurso} resumenes={resumenes} mios={mios} />
            {errorMios && !mios ? (
              <ErrorCarga mensaje="No se pudieron cargar tus registros." onReintentar={() => setRecargaMios((n) => n + 1)} />
            ) : mios ? (
              <Indicadores datos={mios} horaActual={ahora.getHours()} />
            ) : (
              <p role="status" className="py-4 text-center text-sm text-[#627A9B]">Cargando tus registros…</p>
            )}

            {/* Dos columnas que crecen por separado: sin huecos entre filas (desde 1360 px; antes, una debajo de otra). */}
            <div className="grid items-start gap-3.5 sm:gap-5 min-[1360px]:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-w-0 flex-col gap-3.5 sm:gap-5">
                <section aria-labelledby="examenes-en-curso" className="flex min-w-0 flex-col gap-3.5">
                  <h2 id="examenes-en-curso" className="sr-only">Exámenes activos ahora</h2>
                  {enCurso.length === 0 ? (
                    <SinExamenEnCurso deHoy={deHoy} ahora={ahora} />
                  ) : enCurso.map((e) => (
                    <ExamenEnCurso key={e.idExamen} examen={e} resumen={resumenes[e.idExamen]} onReintentar={recargarResumenes} />
                  ))}
                </section>
                {mios && <MisRegistros registros={mios.recientes} />}
              </div>
              <div className="flex min-w-0 flex-col gap-3.5 sm:gap-5">
                {mios && <IngresosPorHora datos={mios} horaActual={ahora.getHours()} />}
                <ExamenesDeHoy deHoy={deHoy} ahora={ahora} resumenes={resumenes} />
              </div>
            </div>
          </>
        )}
      </div>
      <MobileBottomNav variant="controlHome" />
    </PanelLayout>
  )
}

function Banner({ nombre, ahora, deHoy, enCurso, resumenes, mios }: {
  nombre?: string; ahora: Date; deHoy: ExamenDto[]; enCurso: ExamenDto[]; resumenes: Resumenes; mios: InicioControl | null
}) {
  // El anillo resume los exámenes en curso; si no hay, los de hoy.
  const base = enCurso.length ? enCurso : deHoy
  const suma = base.reduce((t, e) => {
    const d = datosDe(resumenes, e.idExamen)
    return d ? { habilitados: t.habilitados + d.habilitados, ingresados: t.ingresados + d.ingresados } : t
  }, { habilitados: 0, ingresados: 0 })
  const faltan = Math.max(0, suma.habilitados - suma.ingresados)
  const pct = porcentaje(suma.ingresados, suma.habilitados)
  const resumen = deHoy.length === 0
    ? 'Hoy no hay exámenes programados.'
    : `Hoy hay ${deHoy.length} ${deHoy.length === 1 ? 'examen' : 'exámenes'} · ${enCurso.length} en curso. Tus registros se guardan con tu nombre.`
  const escanear = enCurso[0] ? `/dashboard/control/${enCurso[0].idExamen}/identificar` : '/dashboard/control'
  return (
    <section aria-label="Bienvenida" className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#0B2FB8] via-[#2563EB] to-[#6D28D9] p-5 text-white shadow-[0_10px_28px_-6px_rgba(37,64,217,0.45)] sm:p-7">
      <span className="pointer-events-none absolute -right-10 -top-28 h-64 w-64 rounded-full bg-white/[0.08]" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-24 right-40 h-44 w-44 rounded-full bg-white/[0.07]" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">{DIAS_LARGOS[ahora.getDay()]} {formatFecha(fechaLocal(ahora))}</span>
          <h1 className="mt-2.5 text-2xl font-bold sm:text-[30px]">¡{saludo(ahora.getHours())}{nombre ? `, ${nombre}` : ''}!</h1>
          <p className="mt-1.5 text-sm text-[#DBE6FF]">{resumen}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Link to={escanear} className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-bold text-[#0439D9] hover:bg-[#EEF3FF] max-sm:flex-1">
              <ScanLine size={16} aria-hidden="true" /> Escanear QR
            </Link>
            <EnVivo oscuro texto={`En vivo · ${horaMinutos(ahora)}`} />
          </div>
        </div>
        {suma.habilitados > 0 && (
          <div className="flex items-center gap-5">
            <Anillo tam={124} grosor={12} pista="#FFFFFF" pistaOpacidad={0.18} etiqueta={`Ingresó el ${formatoPct(pct)} de los habilitados`}
              partes={[{ valor: suma.ingresados, desde: '#6EE7B7', hasta: '#FFFFFF' }, { valor: faltan, desde: 'transparent', hasta: 'transparent' }]}>
              <span className="text-[22px] font-bold leading-none">{formatoPct(pct)}</span>
              <span className="mt-1 text-[11px] text-[#C7D7FF]">ingresó</span>
            </Anillo>
            <ul className="space-y-2 text-xs text-[#C7D7FF]">
              {([['bg-[#6EE7B7]', suma.ingresados, 'ingresaron'], ['bg-[#FCD34D]', faltan, 'faltan'],
                ['bg-[#93C5FD]', mios?.ingresos ?? 0, 'registros tuyos']] as const).map(([c, v, t]) => (
                <li key={t} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${c}`} aria-hidden="true" />
                  <span className="text-base font-bold text-white">{v}</span> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function Indicadores({ datos, horaActual }: { datos: InicioControl; horaActual: number }) {
  const horas = horasDelDia([datos.ingresosPorHora, datos.intentosPorHora, datos.fotosPorHora, datos.qrPorHora], horaActual)
  const serie = (s: number[]) => horas.map((h) => s[h] ?? 0)
  const porQr = datos.ingresos - datos.ingresosManuales
  const items: { titulo: string; valor: number; icono: LucideIcon; color: string; fondo: string; serie: number[]; linea: [string, string]; pie: string }[] = [
    { titulo: 'Ingresos que registré', valor: datos.ingresos, icono: CircleCheck, color: 'text-[#059669]', fondo: 'from-[#ECFDF5] to-[#D1FAE5]',
      serie: serie(datos.ingresosPorHora), linea: ['#34D399', '#059669'],
      pie: datos.ingresos ? `Hoy · ${porQr} por QR o CI y ${datos.ingresosManuales} ${datos.ingresosManuales === 1 ? 'manual' : 'manuales'}` : 'Aún no registraste ingresos hoy' },
    { titulo: 'Intentos incorrectos', valor: datos.intentosIncorrectos, icono: UserRoundX, color: 'text-[#E11D48]', fondo: 'from-[#FFF1F2] to-[#FFE4E6]',
      serie: serie(datos.intentosPorHora), linea: ['#FB7185', '#E11D48'], pie: 'Registrados por ti hoy' },
    { titulo: 'Fotos reportadas', valor: datos.fotosReportadas, icono: ImageUp, color: 'text-[#7C3AED]', fondo: 'from-[#F5F3FF] to-[#EDE9FE]',
      serie: serie(datos.fotosPorHora), linea: ['#A78BFA', '#7C3AED'], pie: 'Pendientes de revisión del ADMIN' },
    { titulo: 'QR duplicados', valor: datos.qrDuplicados, icono: Copy, color: 'text-[#D97706]', fondo: 'from-[#FFFBEB] to-[#FEF3C7]',
      serie: serie(datos.qrPorHora), linea: ['#FBBF24', '#EA580C'], pie: datos.qrDuplicados ? 'Reportados por ti hoy' : 'Ninguno reportado hoy' },
  ]
  return (
    <section aria-label="Mis indicadores de hoy" className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
      {items.map(({ titulo, valor, icono: Icono, color, fondo, serie: s, linea, pie }) => (
        <article key={titulo} aria-label={titulo} className={`${TARJETA} flex min-w-0 flex-col gap-2 p-3.5 sm:p-4`}>
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br ${fondo} ${color}`}>
            <Icono size={18} aria-hidden="true" />
          </span>
          <p className="text-[26px] font-bold leading-none tabular-nums text-[#011140] sm:text-[30px]">{valor}</p>
          <div>
            <h2 className="text-xs font-semibold text-[#011140]">{titulo}</h2>
            <p className="mt-0.5 text-[11px] text-[#627A9B] sm:truncate">{pie}</p>
          </div>
          <Sparkline valores={s} desde={linea[0]} hasta={linea[1]} etiqueta={`${titulo}: por hora`} />
        </article>
      ))}
    </section>
  )
}

function ExamenEnCurso({ examen, resumen, onReintentar }: { examen: ExamenDto; resumen?: ResumenEstudiantes | 'error'; onReintentar: () => void }) {
  const datos = resumen && resumen !== 'error' ? resumen : null
  const habilitados = datos?.habilitados ?? 0
  const ingresados = datos?.ingresados ?? 0
  const ausentes = Math.max(0, habilitados - ingresados)
  const pct = porcentaje(ingresados, habilitados)
  const base = `/dashboard/control/${examen.idExamen}`
  return (
    <article aria-label={`Examen en curso: ${examen.asignatura}`} className={`${TARJETA} min-w-0 p-4 sm:p-[22px]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">EN CURSO</span>
            <EnVivo texto="En vivo" />
          </div>
          <h3 className="mt-2 text-lg font-bold text-[#011140] sm:text-xl">{materiaYGrupo(examen)}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#011140]">
            <span className="inline-flex items-center gap-1"><Clock3 size={14} className="text-[#45628D]" aria-hidden="true" />{horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={14} className="text-[#45628D]" aria-hidden="true" />{etiquetaAulas(examen)}</span>
          </p>
        </div>
        {datos && habilitados > 0 && (
          <Anillo tam={88} grosor={9} etiqueta={`Ingresó el ${formatoPct(pct)} de ${examen.asignatura}`}
            partes={[{ valor: ingresados, desde: '#22C55E', hasta: '#0EA5E9' }, { valor: ausentes, desde: 'transparent', hasta: 'transparent' }]}>
            <span className="text-base font-bold leading-none text-[#011140]">{formatoPct(pct)}</span>
            <span className="mt-0.5 text-[10px] text-[#627A9B]">ingresó</span>
          </Anillo>
        )}
      </div>

      {resumen === 'error' ? (
        <ErrorCarga className="mt-3" mensaje="No se pudieron cargar los contadores de este examen." onReintentar={onReintentar} />
      ) : !datos ? (
        <p role="status" className="mt-3 text-xs text-[#627A9B]">Cargando contadores…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {([
              ['Habilitados', habilitados, UsersRound, 'border-[#C7D7FE] bg-[#EEF3FF] text-[#0439D9]'],
              ['Ingresados', ingresados, CircleCheck, 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'],
              ['Ausentes', ausentes, Hourglass, 'border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]'],
            ] as const).map(([t, v, Icono, c]) => (
              <div key={t} className={`rounded-xl border p-2.5 sm:p-3 ${c}`}>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-[#011140]"><Icono size={13} aria-hidden="true" />{t}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums sm:text-[28px]">{v}</p>
              </div>
            ))}
          </div>
          {(datos.expulsados || datos.trasladados) ? (
            <p className="mt-2 text-[11px] text-[#627A9B]">
              {datos.expulsados ? `${datos.expulsados} ${datos.expulsados === 1 ? 'expulsado' : 'expulsados'}: cuentan como ingresados. ` : ''}
              {datos.trasladados ? `${datos.trasladados} ${datos.trasladados === 1 ? 'trasladado' : 'trasladados'} de aula.` : ''}
            </p>
          ) : null}
          <div className="mt-3"><BarraDegradado valor={ingresados} max={habilitados} desde="#22C55E" hasta="#0EA5E9" etiqueta={`Avance de ingreso de ${examen.asignatura}`} /></div>
        </>
      )}

      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:[&>*]:flex-1 sm:[&>*]:whitespace-nowrap">
        <Link to={`${base}/identificar`} aria-label={`Escanear QR en ${examen.asignatura}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[#0439D9] px-4 text-sm font-bold text-white hover:bg-[#0C41E1]">
          <ScanLine size={16} aria-hidden="true" /> Escanear QR
        </Link>
        <Link to={`${base}/identificar`} aria-label={`Buscar por CI o código en ${examen.asignatura}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D8E3F5] bg-white px-4 text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
          <IdCard size={16} aria-hidden="true" /> Buscar por CI o código
        </Link>
        <Link to={base} aria-label={`Ver ingresos de ${examen.asignatura}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D8E3F5] bg-white px-4 text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF] max-sm:hidden">
          <List size={16} aria-hidden="true" /> Ver ingresos
        </Link>
      </div>
    </article>
  )
}

function SinExamenEnCurso({ deHoy, ahora }: { deHoy: ExamenDto[]; ahora: Date }) {
  const proximo = deHoy.find((e) => estadoDelExamen(e, ahora).fase === 'proximo')
  return (
    <div className={`${TARJETA} p-5 text-center`}>
      <p className="text-sm font-semibold text-[#011140]">No hay exámenes en curso en este momento.</p>
      {proximo && (
        <p className="mt-1 text-xs text-[#627A9B]">
          El próximo es {proximo.asignatura} a las {horaCorta(proximo.horaInicio)}; el control abre a las {aperturaControl(proximo.fecha, proximo.horaInicio).hora}.
        </p>
      )}
    </div>
  )
}

function IngresosPorHora({ datos, horaActual }: { datos: InicioControl; horaActual: number }) {
  const horas = horasDelDia([datos.ingresosPorHora], horaActual)
  return (
    <section aria-label="Mis ingresos por hora" className={`${TARJETA} min-w-0 p-4 max-lg:hidden sm:p-[22px]`}>
      <h2 className="text-[15px] font-bold text-[#011140]">Mis ingresos por hora</h2>
      <p className="mt-0.5 text-xs text-[#627A9B]">{datos.ingresos ? `Hoy · ${datos.ingresos} registrados por ti` : 'Hoy todavía no registraste ingresos'}</p>
      <div className="mt-4">
        <GraficaIngresosHora horas={horas} horaActual={horaActual} reales={horas.map((h) => datos.ingresosPorHora[h] ?? 0)} esperados={horas.map(() => 0)} compacta />
      </div>
    </section>
  )
}

function MisRegistros({ registros }: { registros: Registro[] }) {
  const [todos, setTodos] = useState(false)
  const visibles = todos ? registros : registros.slice(0, VISIBLES)
  const quien = (r: Registro) => r.estudiante ?? r.codigo ?? 'Sin identificar'
  return (
    <section aria-labelledby="mis-registros" className={`${TARJETA} min-w-0 p-4 sm:p-[22px]`}>
      <h2 id="mis-registros" className="text-[15px] font-bold text-[#011140]">Mis registros de hoy</h2>
      <p className="mt-0.5 text-xs text-[#627A9B]">Solo lo que registraste tú, el más reciente primero</p>
      {registros.length === 0 ? (
        <p className="mt-4 rounded-lg bg-[#F8FAFF] p-3 text-sm text-[#627A9B]">Aún no registraste nada hoy.</p>
      ) : (
        <>
          <table className="mt-4 w-full text-left text-sm max-md:hidden" aria-label="Mis registros de hoy">
            <thead>
              <tr className="bg-[#F4F7FC] text-[11px] font-semibold uppercase text-[#45628D]">
                <th className="rounded-l-lg px-3 py-2">Hora</th><th className="px-3 py-2">Estudiante</th><th className="px-3 py-2">Código</th><th className="rounded-r-lg px-3 py-2">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {visibles.map((r, i) => (
                <tr key={`${r.fecha}-${r.tipo}-${i}`}>
                  <td className="px-3 py-3 tabular-nums text-[#011140]">{r.fecha.slice(11, 19)}</td>
                  <td className="px-3 py-3 font-semibold text-[#011140]">{quien(r)}{r.examen && <span className="block text-[11px] font-normal text-[#627A9B]">{r.examen}</span>}</td>
                  <td className="px-3 py-3 tabular-nums text-[#45628D]">{r.codigo ?? '—'}</td>
                  <td className="px-3 py-3"><span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${REGISTRO[r.tipo]?.clase ?? REGISTRO.INGRESO.clase}`}>{REGISTRO[r.tipo]?.texto ?? r.tipo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-3 divide-y divide-[#EEF2F7] md:hidden" aria-label="Mis registros de hoy (lista)">
            {visibles.map((r, i) => {
              const t = REGISTRO[r.tipo] ?? REGISTRO.INGRESO
              const Icono = t.icono
              return (
                <li key={`${r.fecha}-${r.tipo}-${i}`} className="flex items-center gap-3 py-2.5">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.circulo}`}><Icono size={16} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#011140]">{quien(r)}</span>
                    <span className="block truncate text-[11px] text-[#627A9B]">{[r.estudiante ? r.codigo : null, t.texto].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[#45628D]">{r.fecha.slice(11, 16)}</span>
                </li>
              )
            })}
          </ul>
          {registros.length > VISIBLES && (
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => setTodos((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9] hover:underline">
                {todos ? 'Ver menos' : 'Ver todos mis registros'} <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

const ESTADO = {
  'en-curso': ['EN CURSO', 'bg-[#DCFCE7] text-[#15803D]'],
  proximo: ['PRÓXIMO', 'bg-[#E0E9FF] text-[#0439D9]'],
  finalizado: ['FINALIZADO', 'bg-[#EEF2F6] text-[#475569]'],
} as const

function ExamenesDeHoy({ deHoy, ahora, resumenes }: { deHoy: ExamenDto[]; ahora: Date; resumenes: Resumenes }) {
  return (
    <section aria-labelledby="examenes-de-hoy" className={`${TARJETA} min-w-0 p-4 sm:p-[22px]`}>
      <h2 id="examenes-de-hoy" className="text-[15px] font-bold text-[#011140]">Exámenes de hoy</h2>
      <p className="mt-0.5 text-xs text-[#627A9B]">Los que puedes controlar</p>
      {deHoy.length === 0 ? (
        <p className="mt-4 text-sm text-[#627A9B]">Hoy no hay exámenes programados.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#EEF2F7]">
          {deHoy.map((e) => {
            const fase = estadoDelExamen(e, ahora).fase
            const [etiqueta, clase] = ESTADO[fase]
            const d = datosDe(resumenes, e.idExamen)
            return (
              <li key={e.idExamen} aria-label={`Examen de hoy: ${e.asignatura}`} className="py-3">
                <Link to={`/dashboard/control/${e.idExamen}`} className="block rounded-md hover:bg-[#F8FAFF]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#011140]">{materiaYGrupo(e)}</p>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${clase}`}>{etiqueta}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <p className="flex min-w-0 items-center gap-3 text-[#011140]">
                      <span className="inline-flex shrink-0 items-center gap-1"><Clock3 size={13} className="text-[#45628D]" aria-hidden="true" />{horaCorta(e.horaInicio)} – {addMinutes(e.horaInicio, e.duracionMinutos)}</span>
                      <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0 text-[#45628D]" aria-hidden="true" /><span className="truncate">{etiquetaAulas(e)}</span></span>
                    </p>
                    <span className={`shrink-0 font-semibold ${fase === 'proximo' ? 'text-[#0439D9]' : 'text-[#011140]'}`}>
                      {fase === 'proximo' ? `Abre a las ${aperturaControl(e.fecha, e.horaInicio).hora}` : d ? `${d.ingresados} de ${d.habilitados}` : ''}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {deHoy.some((e) => estadoDelExamen(e, ahora).fase !== 'finalizado') && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-[#627A9B]"><ShieldAlert size={12} aria-hidden="true" />Toca un examen para abrir su control.</p>
      )}
    </section>
  )
}
