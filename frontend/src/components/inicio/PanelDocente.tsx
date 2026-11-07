import { Link } from 'react-router-dom'
import { ArrowRight, Ban, BookOpen, CalendarDays, CircleCheck, Clock3, MapPin, Plus, TriangleAlert, UsersRound, type LucideIcon } from 'lucide-react'
import { Anillo, Sparkline } from './Graficas'
import { EnVivo } from './Comun'
import { TARJETA, formatoPct, horasDelDia, porcentaje } from '../../utils/inicio'
import type { InicioDocente } from '../../services/inicioService'
import { addMinutes, etiquetaAulas, formatFecha, horaCorta, materiaYGrupo } from '../../utils/examenFormat'
import { aperturaControl, controlSinAbrir, type TiempoExamen } from '../../utils/tiempoExamen'
import type { ExamenDto } from '../../services/examenService'
import type { ResumenEstudiantes } from '../../services/controlExamenService'

/** Sección 18: banner con el saludo, el resumen del día y el avance de ingreso de sus exámenes de hoy. */
export function BannerDocente({ nombre, fecha, horaActual, saludo, materias, examenesHoy, enCurso, ingresados, habilitados, puedeProgramar }: {
  nombre?: string; fecha: string; horaActual: string; saludo: string; materias: number; examenesHoy: number; enCurso: number
  ingresados: number; habilitados: number; puedeProgramar: boolean
}) {
  const pct = porcentaje(ingresados, habilitados)
  const faltan = Math.max(0, habilitados - ingresados)
  return (
    <section aria-label="Bienvenida" className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#0B2FB8] via-[#2563EB] to-[#6D28D9] p-5 text-white shadow-[0_10px_28px_-6px_rgba(37,64,217,0.45)] sm:p-7">
      <span className="pointer-events-none absolute -right-10 -top-28 h-64 w-64 rounded-full bg-white/[0.08]" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">{fecha}</span>
          <h1 className="mt-2.5 text-2xl font-bold sm:text-[30px]">¡{saludo}{nombre ? `, ${nombre}` : ''}!</h1>
          <p className="mt-1.5 text-sm text-[#DBE6FF]">
            Tienes {materias} {materias === 1 ? 'materia' : 'materias'} y {examenesHoy} {examenesHoy === 1 ? 'examen' : 'exámenes'} hoy · {enCurso} en curso.
            {' '}Solo ves los estudiantes y registros de tus materias.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {puedeProgramar && (
              <Link to="/dashboard/examenes?nuevo=1" className="inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-bold text-[#0439D9] hover:bg-[#EEF3FF]">
                <Plus size={16} aria-hidden="true" /> Programar examen
              </Link>
            )}
            <EnVivo oscuro texto={`En vivo · ${horaActual}`} />
          </div>
        </div>
        {examenesHoy > 0 && (
          <div className="flex items-center gap-5">
            <Anillo tam={124} grosor={12} pista="#FFFFFF" pistaOpacidad={0.18} etiqueta={`Ingresó hoy el ${formatoPct(pct)} de tus habilitados`}
              partes={[{ valor: ingresados, desde: '#6EE7B7', hasta: '#FFFFFF' }, { valor: faltan, desde: 'transparent', hasta: 'transparent' }]}>
              <span className="text-[22px] font-bold leading-none">{formatoPct(pct)}</span>
              <span className="mt-1 text-[11px] text-[#C7D7FF]">ingresó hoy</span>
            </Anillo>
            <ul className="space-y-2 text-xs text-[#C7D7FF]">
              {([['bg-[#6EE7B7]', ingresados, 'ingresaron'], ['bg-[#FCD34D]', faltan, 'faltan'], ['bg-[#93C5FD]', habilitados, 'habilitados hoy']] as const).map(([c, v, t]) => (
                <li key={t} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${c}`} aria-hidden="true" /><span className="text-base font-bold text-white">{v}</span> {t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

/** Sección 18: Mis materias, Mis estudiantes, Exámenes hoy y Expulsiones hoy, con su tendencia. */
export function IndicadoresDocente({ datos, examenesHoy, enCurso, proximoHoy, hora }: {
  datos: InicioDocente; examenesHoy: number; enCurso: number; proximoHoy: string | null; hora: number
}) {
  const horas = horasDelDia([datos.ingresosPorHora, datos.expulsionesPorHora], hora)
  const serie = (s: number[]) => horas.map((h) => s[h] ?? 0)
  const items: { titulo: string; valor: number; icono: LucideIcon; color: string; fondo: string; serie: number[]; linea: [string, string]; pie: string }[] = [
    { titulo: 'Mis materias', valor: datos.materias.length, icono: BookOpen, color: 'text-[#4F46E5]', fondo: 'from-[#EEF2FF] to-[#E0E7FF]',
      serie: horas.map(() => datos.materias.length), linea: ['#818CF8', '#4F46E5'],
      pie: `${datos.grupos} ${datos.grupos === 1 ? 'grupo asignado' : 'grupos asignados'} por el ADMIN` },
    { titulo: 'Mis estudiantes', valor: datos.estudiantes, icono: UsersRound, color: 'text-[#0891B2]', fondo: 'from-[#ECFEFF] to-[#CFFAFE]',
      serie: serie(datos.ingresosPorHora), linea: ['#67E8F9', '#0891B2'], pie: 'Inscritos en tus grupos' },
    { titulo: 'Exámenes hoy', valor: examenesHoy, icono: CalendarDays, color: 'text-[#059669]', fondo: 'from-[#ECFDF5] to-[#D1FAE5]',
      serie: serie(datos.ingresosPorHora), linea: ['#34D399', '#059669'],
      pie: examenesHoy ? `${enCurso} en curso${proximoHoy ? ` · 1 a las ${proximoHoy}` : ''}` : 'Sin exámenes hoy' },
    { titulo: 'Expulsiones hoy', valor: datos.expulsionesHoy, icono: Ban, color: 'text-[#E11D48]', fondo: 'from-[#FFF1F2] to-[#FFE4E6]',
      serie: serie(datos.expulsionesPorHora), linea: ['#FB7185', '#E11D48'], pie: 'En tus exámenes' },
  ]
  return (
    <section aria-label="Mis indicadores" className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
      {items.map(({ titulo, valor, icono: Icono, color, fondo, serie: s, linea, pie }) => (
        <article key={titulo} aria-label={titulo} className={`${TARJETA} flex min-w-0 flex-col gap-2 p-3.5 sm:p-4`}>
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br ${fondo} ${color}`}><Icono size={18} aria-hidden="true" /></span>
          <p className="text-[26px] font-bold leading-none tabular-nums text-[#011140] sm:text-[30px]">{valor}</p>
          <div>
            <h2 className="text-xs font-semibold text-[#011140]">{titulo}</h2>
            <p className="mt-0.5 text-[11px] text-[#627A9B] sm:truncate">{pie}</p>
          </div>
          <Sparkline valores={s} desde={linea[0]} hasta={linea[1]} etiqueta={`${titulo}: hoy`} />
        </article>
      ))}
    </section>
  )
}

const COLORES_MATERIA = ['from-[#6366F1] to-[#8B5CF6]', 'from-[#06B6D4] to-[#3B82F6]', 'from-[#8B5CF6] to-[#EC4899]', 'from-[#10B981] to-[#06B6D4]']

/** Sección 18: sus materias con grupos, estudiantes, próximo examen y asistencia de sus exámenes ya realizados. */
export function MisMaterias({ datos, hoy, horaActual, puedeProgramar }: { datos: InicioDocente; hoy: string; horaActual: string; puedeProgramar: boolean }) {
  return (
    <section aria-labelledby="mis-materias" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="mis-materias" className="text-base font-bold text-[#011140]">Mis materias</h2>
          <p className="text-xs text-[#627A9B]">Asignadas por el administrador. Solo puedes programar exámenes de estas materias.</p>
        </div>
        <Link to="/dashboard/examenes" className="text-xs font-semibold text-[#0439D9] hover:underline">Ver mis exámenes →</Link>
      </div>
      {/* Con 1 o 2 materias, ocupan todo el ancho (sin una tercera columna vacía). */}
      <ul className={`grid gap-3 sm:grid-cols-2 ${datos.materias.length >= 3 ? 'xl:grid-cols-3' : ''}`}>
        {datos.materias.map((m, i) => {
          const px = m.proximoExamen
          const esHoy = px?.fecha === hoy
          const enCurso = esHoy && px && horaCorta(px.horaInicio) <= horaActual
          return (
            <li key={m.idMateria} className={`${TARJETA} overflow-hidden`}>
              <div className={`h-1 bg-gradient-to-r ${COLORES_MATERIA[i % COLORES_MATERIA.length]}`} aria-hidden="true" />
              <div className="flex flex-col gap-2 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]"><BookOpen size={17} aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#011140]">{m.nombre}</h3>
                      <p className="text-[11px] text-[#627A9B]">{m.sigla}{m.grupos.length ? ` · ${m.grupos.length === 1 ? 'Grupo' : 'Grupos'} ${m.grupos.join(' y ')}` : ''}</p>
                    </div>
                  </div>
                  {esHoy && <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${enCurso ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#E0E9FF] text-[#0439D9]'}`}>{enCurso ? 'EN CURSO' : 'HOY'}</span>}
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#45628D]">
                  <span className="inline-flex items-center gap-1"><UsersRound size={13} aria-hidden="true" />{m.estudiantes} estudiantes</span>
                  <span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />
                    {px ? `${esHoy ? 'Hoy' : formatFecha(px.fecha)} ${horaCorta(px.horaInicio)}${enCurso ? ' · en curso' : ''}` : 'Sin exámenes programados'}
                  </span>
                </p>
                {m.asistencia != null ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF2F7]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#0EA5E9]" style={{ width: `${Math.min(100, m.asistencia)}%` }} />
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-[#011140]">Asistencia {m.asistencia} %</span>
                  </div>
                ) : !px && puedeProgramar ? (
                  <Link to="/dashboard/examenes?nuevo=1" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0439D9] hover:underline">
                    <Plus size={13} aria-hidden="true" /> Programar el primer examen
                  </Link>
                ) : <p className="text-[11px] text-[#627A9B]">Aún sin exámenes realizados</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const TIPO: Record<InicioDocente['recientes'][number]['tipo'], { texto: string; icono: LucideIcon; clase: string }> = {
  INGRESO: { texto: 'Ingreso', icono: CircleCheck, clase: 'bg-[#DCFCE7] text-[#15803D]' },
  EXPULSION: { texto: 'Expulsión', icono: Ban, clase: 'bg-[#FFE4E6] text-[#E11D48]' },
  INTENTO: { texto: 'Intento incorrecto', icono: TriangleAlert, clase: 'bg-[#FEF3C7] text-[#B45309]' },
}

/** Sección 18: los últimos registros de sus exámenes de hoy (ingresos, expulsiones e intentos). */
export function RegistrosDocente({ registros }: { registros: InicioDocente['recientes'] }) {
  return (
    <section aria-labelledby="registros-docente" className={`${TARJETA} min-w-0 p-4 sm:p-5`}>
      <h2 id="registros-docente" className="text-[15px] font-bold text-[#011140]">Registros de mis exámenes</h2>
      <p className="mt-0.5 text-xs text-[#627A9B]">Solo de tus materias</p>
      {registros.length === 0 ? (
        <p className="mt-4 rounded-lg bg-[#F8FAFF] p-3 text-sm text-[#627A9B]">Aún no hay registros hoy en tus exámenes.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#EEF2F7]" aria-label="Registros de mis exámenes">
          {registros.map((r, i) => {
            const t = TIPO[r.tipo] ?? TIPO.INGRESO
            const Icono = t.icono
            return (
              <li key={`${r.fecha}-${r.tipo}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.clase}`}><Icono size={16} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#011140]">{t.texto}{r.estudiante ? ` · ${r.estudiante}` : ''}</span>
                  <span className="block truncate text-[11px] text-[#627A9B]">{[r.materia, r.tipo === 'INGRESO' && r.detalle ? `Aula ${r.detalle}` : r.detalle].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-[#45628D]">{r.fecha.slice(11, 16)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const ESTADO_FILA: Record<'en_curso' | 'programado' | 'finalizado', string> = {
  en_curso: 'En vivo',
  programado: 'PRÓXIMO',
  finalizado: 'FINALIZADO',
}

/**
 * Sección 18 (DASH-01): sus exámenes de hoy en lista compacta, con habilitados, ingresados y ausentes que se
 * actualizan solos. El expulsado sigue contando como ingresado (con su marca); el trasladado, en su aula nueva.
 */
export function ExamenesHoyDocente({ examenes, resumenes, proximo }: {
  examenes: { examen: ExamenDto; tiempo: TiempoExamen }[]
  resumenes: Record<number, ResumenEstudiantes | 'error'>
  proximo: ExamenDto | undefined
}) {
  return (
    <section aria-labelledby="examenes-hoy" className={`${TARJETA} min-w-0 p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="examenes-hoy" className="text-[15px] font-bold text-[#011140]">Mis exámenes de hoy</h2>
          <p className="mt-0.5 text-xs text-[#627A9B]">Los contadores se actualizan solos</p>
        </div>
        <Link to="/dashboard/examenes" className="mt-2 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0439D9] hover:underline">
          Ver todos <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {examenes.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-[#F8FAFF] p-3">
          <CalendarDays size={18} className="mt-0.5 shrink-0 text-[#0439D9]" aria-hidden="true" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-[#011140]">No tienes exámenes hoy</p>
            <p className="mt-0.5 text-xs text-[#627A9B]">
              {proximo
                ? `Tu próximo examen: ${materiaYGrupo(proximo)} · ${formatFecha(proximo.fecha)} · ${horaCorta(proximo.horaInicio)}, ${etiquetaAulas(proximo)}.`
                : 'Por ahora no tienes próximos exámenes programados.'}
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-1 divide-y divide-[#EEF2F7]" aria-label="Mis exámenes de hoy">
          {examenes.map(({ examen, tiempo }) => {
            const r = resumenes[examen.idExamen]
            const resumen = r && r !== 'error' ? r : undefined
            const fase = tiempo.fase === 'cancelado' ? 'finalizado' : tiempo.fase
            const ausentes = resumen ? Math.max(0, resumen.habilitados - resumen.ingresados) : undefined
            const pct = resumen?.habilitados ? Math.min(100, Math.round(resumen.ingresados * 100 / resumen.habilitados)) : 0
            const sinAbrir = controlSinAbrir(tiempo)
            const marcas = [
              resumen?.expulsados ? `${resumen.expulsados} ${resumen.expulsados === 1 ? 'expulsado' : 'expulsados'} (cuenta como ingresado)` : '',
              resumen?.trasladados ? `${resumen.trasladados} ${resumen.trasladados === 1 ? 'trasladado' : 'trasladados'} de aula` : '',
            ].filter(Boolean).join(' · ')
            const cifras = [
              { punto: 'bg-[#2563EB]', valor: resumen?.habilitados, texto: 'habilitados' },
              { punto: 'bg-[#22C55E]', valor: resumen?.ingresados, texto: 'ingresados' },
              { punto: 'bg-[#F59E0B]', valor: ausentes, texto: 'ausentes' },
            ]
            return (
              <li key={`${examen.idExamen}-${examen.idParalelo}`}>
                <Link to={`/dashboard/control/${examen.idExamen}`} aria-label={`${materiaYGrupo(examen)}: ver panel del examen`}
                  className="-mx-2 block rounded-lg px-2 py-3 transition-colors hover:bg-[#F8FAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]">
                  <span className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-bold text-[#011140]">{materiaYGrupo(examen)}</h3>
                    {fase === 'en_curso' ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#15803D]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" aria-hidden="true" /> {ESTADO_FILA.en_curso}
                      </span>
                    ) : (
                      <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${fase === 'programado' ? 'bg-[#E0E9FF] text-[#0439D9]' : 'bg-[#EAF0F4] text-[#435166]'}`}>{ESTADO_FILA[fase]}</span>
                    )}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#45628D]">
                    <span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />{horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{etiquetaAulas(examen)}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#627A9B]">
                    {cifras.map(({ punto, valor, texto }) => (
                      <span key={texto} className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${punto}`} aria-hidden="true" />
                        <span className="text-[13px] font-bold tabular-nums text-[#011140]">{valor ?? '—'}</span> {texto}
                      </span>
                    ))}
                    <span className="ml-auto text-xs font-semibold text-[#011140]">
                      {r === 'error' ? 'Sin datos' : sinAbrir ? <span className="font-normal text-[#627A9B]">Abre a las {aperturaControl(examen.fecha, examen.horaInicio).hora}</span> : resumen ? `${pct} %` : '…'}
                    </span>
                  </span>
                  <span className="mt-2 block h-2 overflow-hidden rounded-full bg-[#EEF2F7]" aria-hidden="true">
                    <span className="block h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#0EA5E9] transition-[width]" style={{ width: `${sinAbrir ? 0 : pct}%` }} />
                  </span>
                  {marcas && <span className="mt-1.5 block text-[11px] text-[#BE123C]">{marcas}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
