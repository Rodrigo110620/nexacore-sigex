import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, BookCheck, CalendarDays, CircleCheck, ClipboardCheck, Clock3, GraduationCap, Hourglass, ImageIcon,
  MapPin, QrCode, ScanLine, Settings, TriangleAlert, UserRound, UserX, UsersRound, type LucideIcon,
} from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import { Anillo, BarraDegradado, GraficaAsistenciaDias, GraficaIngresosHora, Sparkline } from '../../components/inicio/Graficas'
import { useAuth } from '../../context/AuthContext'
import useEnVivo from '../../hooks/useEnVivo'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { obtenerInicioAdmin, type InicioAdmin } from '../../services/inicioService'
import { alRecibirNotificacion, listarNotificaciones, type Notificacion } from '../../services/notificacionService'
import { ahoraServidorMs } from '../../services/tiempoService'
import { addMinutes, estadoDelExamen, etiquetaAulas, etiquetaDocente, fechaHoraNumerica, fechaLocal, formatFecha, horaCorta } from '../../utils/examenFormat'
import { tienePermiso } from '../../utils/permisos'

const TARJETA = 'rounded-2xl border border-[#E8EDF5] bg-white shadow-[0_4px_16px_rgba(13,26,77,0.07)]'
const CAMBIOS = new Set(['INGRESO', 'HABILITACION', 'EXAMEN', 'FOTO'])
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const COLORES_MOTIVOS: [string, string, string, string][] = [
  ['#F43F5E', '#E11D48', '#FFE4E6', 'text-[#E11D48]'],
  ['#FB923C', '#EA580C', '#FFEDD5', 'text-[#EA580C]'],
  ['#FBBF24', '#D97706', '#FEF3C7', 'text-[#D97706]'],
  ['#A78BFA', '#7C3AED', '#EDE9FE', 'text-[#7C3AED]'],
  ['#94A3B8', '#64748B', '#F1F5F9', 'text-[#64748B]'],
]

const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0)
const formatoPct = (valor: number) => `${valor.toLocaleString('es-BO', { maximumFractionDigits: 1 })} %`

function saludo(hora: number) {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaDe(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

interface ExamenDeHoy {
  examen: ExamenDto
  aulas: string
  fase: ReturnType<typeof estadoDelExamen>['fase']
  texto: string
  asociados: number
  habilitados: number
  ingresados: number
}

/**
 * Inicio del ADMIN: el día en vivo (asociados, ingresos, por ingresar, ausentes e incidencias), los ingresos
 * por hora, el estado de los asociados, la asistencia y los intentos incorrectos de la semana, los exámenes de
 * hoy, el próximo examen, lo pendiente por revisar, la actividad reciente y los accesos rápidos.
 * Se recarga con cada cambio en vivo y cada minuto (cambia qué examen está en curso).
 */
export default function InicioAdminPage() {
  const auth = useAuth()
  const { nombre } = auth
  const [datos, setDatos] = useState<InicioAdmin>()
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [actividad, setActividad] = useState<Notificacion[]>([])
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)
  const [ahora, setAhora] = useState(() => new Date(ahoraServidorMs()))

  useEnVivo((c) => CAMBIOS.has(c.tipo), () => setRecarga((n) => n + 1))
  useEffect(() => alRecibirNotificacion(() => setRecarga((n) => n + 1)), [])
  useEffect(() => {
    const id = window.setInterval(() => {
      setAhora(new Date(ahoraServidorMs()))
      setRecarga((n) => n + 1)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let vigente = true
    Promise.allSettled([obtenerInicioAdmin(), listarExamenes(), listarNotificaciones()]).then(([resumen, lista, avisos]) => {
      if (!vigente) return
      if (resumen.status === 'fulfilled') {
        setDatos(resumen.value)
        setError('')
      } else {
        setError('No se pudo cargar el resumen del día. Se reintentará en un minuto.')
      }
      if (lista.status === 'fulfilled') setExamenes(lista.value)
      if (avisos.status === 'fulfilled') setActividad(avisos.value)
    })
    return () => { vigente = false }
  }, [recarga])

  const hoy = fechaLocal(ahora)
  const deHoy = useMemo<ExamenDeHoy[]>(() => {
    const conteos = new Map(datos?.examenes.map((e) => [e.idExamen, e]) ?? [])
    const unicos = new Map<number, ExamenDto>()
    for (const e of examenes) {
      if (e.fecha === hoy && e.estado?.toLowerCase() !== 'cancelado' && !unicos.has(e.idExamen)) unicos.set(e.idExamen, e)
    }
    return [...unicos.values()]
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .map((examen) => {
        const c = conteos.get(examen.idExamen)
        const estado = estadoDelExamen(examen, ahora)
        const aulas = etiquetaAulas(examen)
        return { examen, aulas, fase: estado.fase, texto: estado.texto, asociados: c?.asociados ?? 0, habilitados: c?.habilitados ?? 0, ingresados: c?.ingresados ?? 0 }
      })
  }, [datos, examenes, hoy, ahora])

  const proximo = useMemo(() => {
    const deHoyProximo = deHoy.find((e) => e.fase === 'proximo')
    if (deHoyProximo) return deHoyProximo
    const futuro = examenes
      .filter((e) => e.fecha > hoy && e.estado?.toLowerCase() !== 'cancelado')
      .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))[0]
    return futuro ? { examen: futuro, aulas: etiquetaAulas(futuro), texto: 'Programado', habilitados: null } : null
  }, [deHoy, examenes, hoy])

  const primerNombre = nombre?.trim().split(/\s+/)[0]
  const fechaTexto = `${DIAS_LARGOS[ahora.getDay()]} ${formatFecha(hoy)}`

  return (
    <PanelLayout compactDesktop title="INICIO" description="Resumen del día">
      <div className="min-h-full bg-[#F5F7FB] px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 min-[960px]:pb-8 xl:px-8">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 sm:gap-5">
          {error && <p role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">{error}</p>}
          <Banner nombre={primerNombre} fecha={fechaTexto} datos={datos} hora={ahora} />
          {!datos ? (
            <p className="py-16 text-center text-sm text-[#627A9B]">Cargando el resumen del día…</p>
          ) : (
            <>
              <Indicadores datos={datos} />
              <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <TarjetaIngresosHora datos={datos} ahora={ahora} />
                <TarjetaEstado datos={datos} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <TablaExamenesHoy examenes={deHoy} />
                <ProximoExamen proximo={proximo} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
                <TarjetaSemana datos={datos} />
                <TarjetaMotivos datos={datos} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
                <Pendientes datos={datos} />
                <ActividadReciente actividad={actividad} />
                <AccesosRapidos auth={auth} />
              </div>
            </>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

function EnVivo({ texto, oscuro }: { texto: string; oscuro?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${oscuro ? 'bg-white/15 text-white' : 'bg-[#DCFCE7] text-[#15803D]'}`}>
      <span className={`h-2 w-2 rounded-full ${oscuro ? 'bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]' : 'bg-[#16A34A] shadow-[0_0_6px_rgba(22,163,74,0.6)]'}`} aria-hidden="true" />
      {texto}
    </span>
  )
}

function Banner({ nombre, fecha, datos, hora }: { nombre?: string; fecha: string; datos?: InicioAdmin; hora: Date }) {
  const h = datos?.hoy
  const total = h ? h.ingresados + h.porIngresar + h.ausentes : 0
  const pct = h ? porcentaje(h.ingresados, total) : 0
  const resumen = h
    ? h.examenes === 0
      ? 'No hay exámenes programados para hoy.'
      : `${h.examenes} ${h.examenes === 1 ? 'examen' : 'exámenes'} hoy · ${h.enCurso} en curso. Todo se actualiza en vivo.`
    : 'Cargando el resumen del día…'
  return (
    <section aria-label="Bienvenida" className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#0B2FB8] via-[#2563EB] to-[#6D28D9] p-5 text-white shadow-[0_10px_28px_-6px_rgba(37,64,217,0.45)] sm:p-7">
      <span className="pointer-events-none absolute -right-10 -top-28 h-64 w-64 rounded-full bg-white/[0.08]" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-24 right-40 h-44 w-44 rounded-full bg-white/[0.07]" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">{fecha}</span>
          <h1 className="mt-2.5 text-2xl font-bold sm:text-[30px]">¡{saludo(hora.getHours())}{nombre ? `, ${nombre}` : ''}!</h1>
          <p className="mt-1.5 text-sm text-[#DBE6FF]">{resumen}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Link to="/dashboard/control" className="inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-bold text-[#0439D9] hover:bg-[#EEF3FF]">
              <ScanLine size={16} aria-hidden="true" /> Controlar ingreso
            </Link>
            <EnVivo oscuro texto={`En vivo · ${horaCorta(`${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`)}`} />
          </div>
        </div>
        {h && total > 0 && (
          <div className="flex items-center gap-5">
            <Anillo tam={124} grosor={12} pista="#FFFFFF" pistaOpacidad={0.18} etiqueta={`Ingresó el ${formatoPct(pct)} de los habilitados de hoy`}
              partes={[{ valor: h.ingresados, desde: '#6EE7B7', hasta: '#FFFFFF' }, { valor: total - h.ingresados, desde: 'transparent', hasta: 'transparent' }]}>
              <span className="text-[22px] font-bold leading-none">{formatoPct(pct)}</span>
              <span className="mt-1 text-[11px] text-[#C7D7FF]">ingresó</span>
            </Anillo>
            <ul className="space-y-2 text-xs text-[#C7D7FF]">
              {[['bg-[#6EE7B7]', h.ingresados, 'ingresaron'], ['bg-[#93C5FD]', h.porIngresar, 'por ingresar'], ['bg-[#FCD34D]', h.ausentes, 'ausentes']].map(([c, v, t]) => (
                <li key={t as string} className="flex items-center gap-2">
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

interface Indicador {
  titulo: string
  valor: number
  icono: LucideIcon
  color: string
  fondo: string
  serie: number[]
  linea: [string, string]
  pie: string
  alerta?: boolean
}

function Indicadores({ datos }: { datos: InicioAdmin }) {
  const { hoy, dias } = datos
  const ayer = dias[dias.length - 2]
  const items: Indicador[] = [
    { titulo: 'Asociados hoy', valor: hoy.asociados, icono: UsersRound, color: 'text-[#4F46E5]', fondo: 'from-[#EEF2FF] to-[#E0E7FF]',
      serie: dias.map((d) => d.asociados), linea: ['#818CF8', '#4F46E5'], pie: `En ${hoy.examenes} ${hoy.examenes === 1 ? 'examen' : 'exámenes'} · ayer ${ayer?.asociados ?? 0}` },
    { titulo: 'Ingresaron', valor: hoy.ingresados, icono: CircleCheck, color: 'text-[#059669]', fondo: 'from-[#ECFDF5] to-[#D1FAE5]',
      serie: dias.map((d) => d.ingresados), linea: ['#34D399', '#059669'], pie: `${formatoPct(porcentaje(hoy.ingresados, hoy.ingresados + hoy.porIngresar + hoy.ausentes))} de los habilitados` },
    { titulo: 'Por ingresar', valor: hoy.porIngresar, icono: Clock3, color: 'text-[#2563EB]', fondo: 'from-[#EFF6FF] to-[#DBEAFE]',
      serie: datos.esperadosPorHora.slice(7, 22), linea: ['#60A5FA', '#2563EB'], pie: 'En exámenes que aún no empiezan' },
    { titulo: 'Ausentes', valor: hoy.ausentes, icono: Hourglass, color: 'text-[#D97706]', fondo: 'from-[#FFFBEB] to-[#FEF3C7]',
      serie: dias.map((d) => d.ausentes), linea: ['#FBBF24', '#D97706'], pie: `En exámenes iniciados · ayer ${ayer?.ausentes ?? 0}` },
    { titulo: 'Incidencias', valor: hoy.incidencias, icono: TriangleAlert, color: 'text-[#E11D48]', fondo: 'from-[#FFF1F2] to-[#FFE4E6]',
      serie: dias.map((d) => d.incidencias), linea: ['#FB7185', '#E11D48'], pie: `Ayer ${ayer?.incidencias ?? 0}`, alerta: hoy.incidencias > 0 },
  ]
  return (
    <section aria-label="Resumen de hoy" className="grid grid-cols-2 gap-3 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-5">
      {items.map(({ titulo, valor, icono: Icono, color, fondo, serie, linea, pie, alerta }, i) => (
        <article key={titulo} aria-label={titulo} className={`${TARJETA} flex min-w-0 flex-col gap-2 p-3.5 sm:p-4 ${i === items.length - 1 ? 'max-md:col-span-2' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br ${fondo} ${color}`}>
              <Icono size={18} aria-hidden="true" />
            </span>
            {alerta && (
              <Link to="/dashboard/reportes" aria-label="Revisar las incidencias en Reportes"
                className="inline-flex items-center gap-1 rounded-full bg-[#FFE4E6] px-2 py-0.5 text-[10px] font-bold text-[#BE123C] hover:bg-[#FECDD3]">
                Revisar <ArrowRight size={11} aria-hidden="true" />
              </Link>
            )}
          </div>
          <p className="text-[26px] font-bold leading-none tabular-nums text-[#011140] sm:text-[30px]">{valor}</p>
          <div>
            <h2 className="text-xs font-semibold text-[#011140]">{titulo}</h2>
            <p className="mt-0.5 truncate text-[11px] text-[#627A9B]">{pie}</p>
          </div>
          <Sparkline valores={serie} desde={linea[0]} hasta={linea[1]} etiqueta={titulo === 'Por ingresar' ? 'Por ingresar: por hora de inicio' : `${titulo}: últimos 7 días`} />
        </article>
      ))}
    </section>
  )
}

function Cabecera({ titulo, detalle, derecha }: { titulo: string; detalle?: string; derecha?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-[#011140]">{titulo}</h2>
        {detalle && <p className="mt-0.5 text-xs text-[#627A9B]">{detalle}</p>}
      </div>
      {derecha}
    </div>
  )
}

function TarjetaIngresosHora({ datos, ahora }: { datos: InicioAdmin; ahora: Date }) {
  const horaActual = ahora.getHours()
  const conDatos = datos.ingresosPorHora.map((v, i) => (v || datos.esperadosPorHora[i] ? i : -1)).filter((i) => i >= 0)
  const desde = Math.min(7, horaActual, ...conDatos)
  const hasta = Math.max(21, horaActual, ...conDatos)
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
  const total = datos.ingresosPorHora.reduce((a, b) => a + b, 0)
  const pico = datos.ingresosPorHora.reduce((m, v, i) => (v > datos.ingresosPorHora[m] ? i : m), 0)
  return (
    <section aria-label="Ingresos por hora" className={`${TARJETA} min-w-0 p-4 sm:p-[22px]`}>
      <Cabecera titulo="Ingresos por hora" detalle={total ? `Hoy · pico a las ${String(pico).padStart(2, '0')}:00 (${datos.ingresosPorHora[pico]})` : 'Hoy todavía no hay ingresos'}
        derecha={<div className="text-right"><p className="text-2xl font-bold leading-none text-[#011140]">{total}</p><p className="mt-1 text-[11px] text-[#627A9B]">ingresos</p></div>} />
      <div className="mt-4">
        <GraficaIngresosHora horas={horas} horaActual={horaActual}
          reales={horas.map((hh) => datos.ingresosPorHora[hh] ?? 0)} esperados={horas.map((hh) => datos.esperadosPorHora[hh] ?? 0)} />
      </div>
    </section>
  )
}

function TarjetaEstado({ datos }: { datos: InicioAdmin }) {
  const { ingresados, porIngresar, ausentes, asociados } = datos.hoy
  const total = ingresados + porIngresar + ausentes
  const filas: [string, string, string, number][] = [
    ['Ingresaron', '#4ADE80', '#059669', ingresados],
    ['Por ingresar', '#93C5FD', '#4F46E5', porIngresar],
    ['Ausentes', '#FCD34D', '#F97316', ausentes],
  ]
  return (
    <section aria-label="Estado de los asociados" className={`${TARJETA} min-w-0 p-4 sm:p-[22px]`}>
      <Cabecera titulo="Estado de los asociados" detalle={`${asociados} ${asociados === 1 ? 'estudiante asociado' : 'estudiantes asociados'} a los exámenes de hoy`} />
      <div className="mt-4 flex flex-col items-center gap-4 max-xl:sm:flex-row">
        <Anillo tam={168} grosor={22} etiqueta={`Asistencia de hoy: ${formatoPct(porcentaje(ingresados, total))}`}
          partes={filas.map(([, desde, hasta, valor]) => ({ valor, desde, hasta }))}>
          <span className="text-2xl font-bold leading-none text-[#011140]">{formatoPct(porcentaje(ingresados, total))}</span>
          <span className="mt-1 text-[11px] font-medium text-[#627A9B]">asistencia</span>
        </Anillo>
        <ul className="w-full space-y-2">
          {filas.map(([t, desde, hasta, v]) => (
            <li key={t} className="flex items-center gap-2 rounded-[10px] bg-[#F8FAFF] px-2.5 py-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `linear-gradient(135deg, ${desde}, ${hasta})` }} aria-hidden="true" />
              <span className="flex-1 font-medium text-[#011140]">{t}</span>
              <span className="text-[13px] font-bold tabular-nums text-[#011140]">{v}</span>
              <span className="w-14 rounded-full bg-[#EEF2F7] px-2 py-0.5 text-center text-[10px] font-semibold text-[#45628D]">{formatoPct(porcentaje(v, total))}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const FASES: Record<ExamenDeHoy['fase'], [string, string]> = {
  'en-curso': ['EN CURSO', 'bg-[#DCFCE7] text-[#15803D]'],
  proximo: ['PRÓXIMO', 'bg-[#E0E9FF] text-[#0439D9]'],
  finalizado: ['FINALIZADO', 'bg-[#EEF2F6] text-[#475569]'],
}

function TablaExamenesHoy({ examenes }: { examenes: ExamenDeHoy[] }) {
  return (
    <section aria-label="Exámenes de hoy" className={`${TARJETA} min-w-0 p-4 sm:p-5`}>
      <Cabecera titulo="Exámenes de hoy" derecha={
        <Link to="/dashboard/examenes" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0439D9] hover:underline">
          Ver todos <ArrowRight size={14} aria-hidden="true" />
        </Link>} />
      {examenes.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#C7D7F5] px-4 py-8 text-center text-sm text-[#627A9B]">No hay exámenes programados para hoy.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#EEF2F7]">
          {examenes.map((e) => {
            const [etiqueta, clase] = FASES[e.fase]
            const avance = e.fase === 'proximo' ? e.texto : `${e.ingresados} de ${e.habilitados} ingresaron`
            const colores = e.fase === 'finalizado' ? ['#CBD5E1', '#94A3B8'] : e.fase === 'en-curso' ? ['#34D399', '#059669'] : ['#60A5FA', '#4F46E5']
            const horario = `${horaCorta(e.examen.horaInicio)} – ${addMinutes(e.examen.horaInicio, e.examen.duracionMinutos)}`
            const docente = etiquetaDocente(e.examen.docente)
            const detalle = `/dashboard/examenes/${e.examen.idExamen}/${e.examen.idParalelo}`
            return (
              <li key={e.examen.idExamen}>
                {/* Celular: 4 líneas y toda la fila abre el detalle. */}
                <Link to={detalle} aria-label={`Ver detalle de ${e.examen.asignatura}`} className="block py-2.5 sm:hidden">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#011140]">{e.examen.asignatura}</span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${clase}`}>{etiqueta}</span>
                  </span>
                  <span className="block truncate text-[11px] text-[#627A9B]">{docente}</span>
                  <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-[#011140]">
                    <Clock3 size={12} className="shrink-0 text-[#45628D]" aria-hidden="true" />{horario}
                    <MapPin size={12} className="ml-2 shrink-0 text-[#45628D]" aria-hidden="true" /><span className="truncate">{e.aulas}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    {e.fase === 'proximo'
                      ? <span className="text-[11px] font-medium text-[#0439D9]">{e.texto}</span>
                      : <>
                          <span className="min-w-0 flex-1"><BarraDegradado valor={e.ingresados} max={e.habilitados} desde={colores[0]} hasta={colores[1]} etiqueta={`Avance de ${e.examen.asignatura}`} /></span>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#011140]">{e.ingresados} de {e.habilitados}</span>
                        </>}
                  </span>
                </Link>
                {/* Escritorio: tabla. */}
                <div className="hidden gap-3 py-3 sm:grid sm:grid-cols-[96px_minmax(0,1fr)_112px_minmax(0,120px)_150px_auto] sm:items-center">
                  <span className={`w-fit rounded-md px-2.5 py-1 text-[10px] font-bold ${clase}`}>{etiqueta}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#011140]">{e.examen.asignatura}</p>
                    <p className="truncate text-[11px] text-[#627A9B]">{docente}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-[#011140]">
                    <Clock3 size={14} className="shrink-0 text-[#45628D]" aria-hidden="true" />
                    <span><span className="sr-only">Horario: </span>{horario}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-[#011140]" title={e.aulas}>
                    <MapPin size={14} className="shrink-0 text-[#45628D]" aria-hidden="true" />
                    <span className="truncate">{e.aulas}</span>
                  </p>
                  <div className="min-w-0">
                    <p className="mb-1.5 truncate text-[11px] font-medium text-[#011140]">{avance}</p>
                    <BarraDegradado valor={e.ingresados} max={e.habilitados} desde={colores[0]} hasta={colores[1]} etiqueta={`Avance de ${e.examen.asignatura}`} />
                  </div>
                  <Link to={detalle} className="w-fit rounded-lg border border-[#CFDAF0] px-2.5 py-1.5 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
                    Ver detalle
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function ProximoExamen({ proximo }: { proximo: { examen: ExamenDto; aulas: string; texto: string; habilitados: number | null } | null }) {
  if (!proximo) {
    return (
      <section aria-label="Próximo examen" className={`${TARJETA} flex flex-col items-center justify-center gap-2 p-6 text-center`}>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF3FF] text-[#0439D9]"><CalendarDays size={22} aria-hidden="true" /></span>
        <p className="text-sm font-semibold text-[#011140]">No hay más exámenes programados</p>
      </section>
    )
  }
  const { examen } = proximo
  const fecha = fechaDe(examen.fecha)
  const datos: [LucideIcon, string][] = [
    [CalendarDays, `${DIAS_LARGOS[fecha.getDay()]} ${formatFecha(examen.fecha)} · ${horaCorta(examen.horaInicio)} – ${addMinutes(examen.horaInicio, examen.duracionMinutos)}`],
    [MapPin, proximo.aulas],
    [UserRound, proximo.habilitados != null ? `${etiquetaDocente(examen.docente)} · ${proximo.habilitados} habilitados` : etiquetaDocente(examen.docente)],
  ]
  return (
    <section aria-label="Próximo examen" className={`${TARJETA} flex min-w-0 flex-col gap-3 p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#0439D9]">Próximo examen</h2>
        <span className="rounded-md bg-[#E0E9FF] px-2 py-1 text-[10px] font-bold uppercase text-[#0439D9]">{proximo.texto}</span>
      </div>
      <p className="text-xl font-bold text-[#011140]">{examen.asignatura}</p>
      <ul className="space-y-2">
        {datos.map(([Icono, texto]) => (
          <li key={texto} className="flex items-center gap-2.5 text-[13px] text-[#011140]"><Icono size={16} className="shrink-0 text-[#45628D]" aria-hidden="true" />{texto}</li>
        ))}
      </ul>
      <Link to={`/dashboard/examenes/${examen.idExamen}/${examen.idParalelo}`}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#CFDAF0] px-4 py-2.5 text-[13px] font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
        Ver detalle del examen <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  )
}

function TarjetaSemana({ datos }: { datos: InicioAdmin }) {
  const ingresados = datos.dias.reduce((s, d) => s + d.ingresados, 0)
  const ausentes = datos.dias.reduce((s, d) => s + d.ausentes, 0)
  const columnas = datos.dias.map((d, i) => {
    const fecha = fechaDe(d.fecha)
    return { etiqueta: i === datos.dias.length - 1 ? 'Hoy' : `${DIAS_SEMANA[fecha.getDay()]} ${fecha.getDate()}`, ingresados: d.ingresados, ausentes: d.ausentes, hoy: i === datos.dias.length - 1 }
  })
  return (
    <section aria-label="Asistencia de los últimos 7 días" className={`${TARJETA} min-w-0 p-4 sm:p-[22px]`}>
      <Cabecera titulo="Asistencia · últimos 7 días" detalle={`${ingresados} ingresos y ${ausentes} ausencias`}
        derecha={<div className="text-right"><p className="text-2xl font-bold leading-none text-[#059669]">{formatoPct(porcentaje(ingresados, ingresados + ausentes))}</p><p className="mt-1 text-[11px] text-[#627A9B]">asistencia</p></div>} />
      <div className="mt-5"><GraficaAsistenciaDias dias={columnas} /></div>
    </section>
  )
}

function TarjetaMotivos({ datos }: { datos: InicioAdmin }) {
  const total = datos.motivos.reduce((s, m) => s + m.cantidad, 0)
  const max = Math.max(1, ...datos.motivos.map((m) => m.cantidad))
  return (
    <section aria-label="Intentos incorrectos por motivo" className={`${TARJETA} min-w-0 p-4 sm:p-[22px]`}>
      <Cabecera titulo="Intentos incorrectos por motivo" detalle="Últimos 7 días"
        derecha={<div className="text-right"><p className="text-2xl font-bold leading-none text-[#E11D48]">{total}</p><p className="mt-1 text-[11px] text-[#627A9B]">intentos</p></div>} />
      {datos.motivos.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#C7D7F5] px-4 py-8 text-center text-sm text-[#627A9B]">Sin intentos incorrectos en la última semana.</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {datos.motivos.map((m, i) => {
            const [desde, hasta, fondo, texto] = COLORES_MOTIVOS[Math.min(i, COLORES_MOTIVOS.length - 1)]
            const Icono = m.motivo === 'Aula incorrecta' ? MapPin : i === 0 ? UserX : TriangleAlert
            return (
              <li key={m.motivo} className="flex items-center gap-3">
                <span className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${texto}`} style={{ background: fondo }}>
                  <Icono size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-[#011140]" title={m.motivo}>{m.motivo}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-[#011140]">{m.cantidad} · {Math.round((m.cantidad / total) * 100)} %</span>
                  </div>
                  <BarraDegradado valor={m.cantidad} max={max} desde={desde} hasta={hasta} etiqueta={m.motivo} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Link to="/dashboard/reportes" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0439D9] hover:underline">
        Ir a Reportes <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  )
}

function Pendientes({ datos }: { datos: InicioAdmin }) {
  const { fotos, qrDuplicados, intentosHoy } = datos.pendientes
  const filas: [LucideIcon, string, string, number, string][] = [
    [ImageIcon, 'Fotos por revisar', 'Cambios de foto y fotos reportadas', fotos, '/dashboard/estudiantes/fotos'],
    [QrCode, 'QR duplicados reportados', 'Pendientes de revisión', qrDuplicados, '/dashboard/reportes'],
    [UserX, 'Intentos de ingreso incorrectos', 'Hoy', intentosHoy, '/dashboard/reportes'],
  ]
  const total = fotos + qrDuplicados + intentosHoy
  return (
    <section aria-label="Incidencias por revisar" className={`${TARJETA} flex min-w-0 flex-col p-4 sm:p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#011140]">Incidencias por revisar</h2>
        <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-bold text-[#DC2626]">{total}</span>
      </div>
      <ul className="mt-2 flex-1 divide-y divide-[#EEF2F7]">
        {filas.map(([Icono, t1, t2, n, a]) => (
          <li key={t1}>
            <Link to={a} className="flex items-center gap-3 py-3 hover:opacity-80">
              <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]"><Icono size={15} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#011140]">{t1}</span>
                <span className="block text-[11px] text-[#627A9B]">{t2}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${n ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#EEF2F7] text-[#627A9B]'}`}>{n}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

const ICONOS_AVISO: Record<string, [LucideIcon, string]> = {
  FOTO_REPORTADA: [ImageIcon, 'bg-[#FEE2E2] text-[#DC2626]'],
  QR_DUPLICADO: [QrCode, 'bg-[#FFF1D6] text-[#D97706]'],
  INTENTO_INGRESO: [UserX, 'bg-[#FEE2E2] text-[#DC2626]'],
  AULA_INCORRECTA: [MapPin, 'bg-[#FFEDD5] text-[#EA580C]'],
  EXPULSION: [UserX, 'bg-[#FEE2E2] text-[#DC2626]'],
  INGRESO_MANUAL: [CircleCheck, 'bg-[#DCFCE7] text-[#16A34A]'],
  TRASLADO_AMBIENTE: [MapPin, 'bg-[#E0E9FF] text-[#0439D9]'],
}

function ActividadReciente({ actividad }: { actividad: Notificacion[] }) {
  const recientes = [...actividad].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)).slice(0, 4)
  return (
    <section aria-label="Actividad reciente" className={`${TARJETA} flex min-w-0 flex-col p-4 sm:p-5`}>
      <h2 className="text-xs font-bold uppercase tracking-wide text-[#011140]">Actividad reciente</h2>
      {recientes.length === 0 ? (
        <p className="mt-4 flex-1 text-sm text-[#627A9B]">Sin actividad reciente.</p>
      ) : (
        <ul className="mt-2 flex-1 divide-y divide-[#EEF2F7]">
          {recientes.map((n) => {
            const [Icono, clase] = ICONOS_AVISO[n.tipo] ?? [TriangleAlert, 'bg-[#FFF1D6] text-[#D97706]']
            return (
              <li key={n.id} className="flex items-center gap-3 py-3">
                <span className={`inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${clase}`}><Icono size={15} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#011140]">{n.titulo}</span>
                  {n.detalle && <span className="block truncate text-[11px] text-[#627A9B]">{n.detalle}</span>}
                </span>
                <span className="shrink-0 text-[11px] font-medium text-[#45628D]">{fechaHoraNumerica(n.creadaEn).slice(-5)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function AccesosRapidos({ auth }: { auth: Parameters<typeof tienePermiso>[0] }) {
  const accesos: [LucideIcon, string, string, string, string, boolean][] = [
    [BookCheck, 'Exámenes', 'Programar y editar', '/dashboard/examenes', 'bg-[#EEF3FF] text-[#0439D9]', tienePermiso(auth, 'EXAMENES_GESTIONAR_TODOS')],
    [ClipboardCheck, 'Control', 'Registrar ingresos', '/dashboard/control', 'bg-[#ECFDF3] text-[#16A34A]', tienePermiso(auth, 'CONTROL_INGRESO_TODOS')],
    [GraduationCap, 'Estudiantes', 'Registrar e importar', '/dashboard/estudiantes', 'bg-[#FFF1E7] text-[#EA580C]', tienePermiso(auth, 'ESTUDIANTES_VER')],
    [BarChart3, 'Reportes', 'Intentos y excepciones', '/dashboard/reportes', 'bg-[#F3EEFF] text-[#7C3AED]', tienePermiso(auth, 'REPORTES_VER')],
    [ImageIcon, 'Revisión de fotos', 'Cambios y reportes', '/dashboard/estudiantes/fotos', 'bg-[#E0F5FA] text-[#0891B2]', tienePermiso(auth, 'FOTOS_REVISAR')],
    [Settings, 'Configuración', 'Roles y respaldo', '/dashboard/configuracion', 'bg-[#EEF2F6] text-[#475569]', tienePermiso(auth, 'ROLES_GESTIONAR')],
  ]
  return (
    <section aria-label="Accesos rápidos" className={`${TARJETA} min-w-0 p-4 sm:p-5`}>
      <h2 className="text-xs font-bold uppercase tracking-wide text-[#011140]">Accesos rápidos</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2.5">
        {accesos.filter((a) => a[5]).map(([Icono, t1, t2, a, clase]) => (
          <li key={t1}>
            <Link to={a} className="flex h-full flex-col gap-2 rounded-[10px] border border-[#E6EBF2] p-3 hover:border-[#B8CBEF] hover:bg-[#F8FAFF]">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${clase}`}><Icono size={16} aria-hidden="true" /></span>
              <span className="text-xs font-semibold text-[#011140]">{t1}</span>
              <span className="text-[11px] text-[#627A9B]">{t2}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
