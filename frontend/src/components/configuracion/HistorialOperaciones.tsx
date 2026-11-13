import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Download, Minus, Plus, Search, X } from 'lucide-react'
import { listarAutores, listarHistorial, obtenerHistorial, type AutorHistorial, type FiltrosHistorial, type OperacionAuditada, type PaginaHistorial } from '../../services/historialOperacionService'
import VistaPreviaDescarga, { type FormatoDescarga } from '../ui/VistaPreviaDescarga'
import useEnVivo from '../../hooks/useEnVivo'

const fechaIso = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
const hoy = () => fechaIso(new Date())
const haceSieteDias = () => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - 7)
  return fechaIso(fecha)
}
const INICIALES: FiltrosHistorial = { search: '', modulo: '', operacion: '', desde: haceSieteDias(), hasta: hoy(), usuario: '' }
const inicioDeMes = () => { const f = new Date(); f.setDate(1); return fechaIso(f) }
/** Rangos rápidos junto a las fechas (para no elegir desde y hasta a mano). */
const RANGOS: { texto: string; desde: () => string; hasta: () => string }[] = [
  { texto: 'Hoy', desde: hoy, hasta: hoy },
  { texto: 'Últimos 7 días', desde: haceSieteDias, hasta: hoy },
  { texto: 'Este mes', desde: inicioDeMes, hasta: hoy },
  { texto: 'Todo', desde: () => '', hasta: () => '' },
]

// El backend compara sin tildes: se mandan las etiquetas tal cual.
const MODULOS = ['Usuarios', 'Roles', 'Estudiantes', 'Exámenes', 'Control', 'Ambientes', 'Configuración']
// Agrupadas para que la lista se lea rápido.
const OPERACIONES: [string, string[]][] = [
  ['Datos', ['Crear', 'Editar', 'Eliminar', 'Importar', 'Asignar', 'Activar', 'Desactivar']],
  ['Exámenes', ['Reprogramar', 'Cancelar', 'Asociar', 'Habilitación', 'Quitar']],
  ['Control de ingreso', ['Autorizar', 'Denegar', 'Salida', 'Expulsar', 'Anular', 'Trasladar', 'Excepción', 'Incidencia', 'Evidencia']],
  ['Fotos', ['Aprobar', 'Rechazar', 'Descartar']],
  ['Sistema', ['Respaldo']],
]
const FORMATOS: FormatoDescarga[] = ['pdf']

const VERDE = 'bg-[#DCFCE7] text-[#15803D]'
const AZUL = 'bg-[#E5ECFF] text-[#0439D9]'
const ROJO = 'bg-[#FEE2E2] text-[#B91C1C]'
const colores: Record<string, string> = {
  Crear: VERDE, Activar: VERDE, Autorizar: VERDE, Aprobar: VERDE, Salida: VERDE,
  Editar: AZUL, Habilitación: AZUL, Asociar: AZUL, Asignar: AZUL, Importar: AZUL, Trasladar: AZUL, Evidencia: AZUL,
  Reprogramar: 'bg-[#EEE8FF] text-[#6D28D9]', Respaldo: 'bg-[#FEF3C7] text-[#B45309]',
  Cancelar: ROJO, Quitar: ROJO, Desactivar: ROJO, Eliminar: ROJO, Denegar: ROJO, Expulsar: ROJO, Rechazar: ROJO,
  Incidencia: 'bg-[#FFEDD5] text-[#C2410C]', Excepción: 'bg-[#FFEDD5] text-[#C2410C]', Anular: 'bg-[#EEF2F6] text-[#45628D]', Descartar: 'bg-[#EEF2F6] text-[#45628D]',
}

const MAXIMO_CAMBIOS = 8

const soloFecha = (fecha: string) => new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(fecha))
const soloHora = (fecha: string) => new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(fecha))

const ROLES: Record<string, string> = { ADMIN: 'Administrador', DOCENTE: 'Docente', CONTROL: 'Personal de control', ESTUDIANTE: 'Estudiante' }
/** «ADMIN, DOCENTE» → «Administrador, Docente». */
const rolLegible = (roles: string | null) => (roles ?? '').split(',').map((r) => ROLES[r.trim()] ?? r.trim()).filter(Boolean).join(', ')
/** «10/11/2026 · 12:15 – 12:45» del examen de la operación (sin la duración), o vacío. */
function horarioExamen(op: OperacionAuditada) {
  const dato = (campo: string) => op.examen?.find((d) => d.campo === campo)?.valor
  const horario = dato('Horario')?.replace(/\s*\(.*\)$/, '')
  return [dato('Fecha'), horario].filter(Boolean).join(' · ')
}

function Etiqueta({ operacion }: { operacion: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colores[operacion] ?? 'bg-[#EEF2F6] text-[#45628D]'}`}>{operacion}</span>
}

/** Qué cambió, campo por campo: antes → después; solo después = agregado; solo antes = quitado. */
function Cambios({ operacion }: { operacion: OperacionAuditada }) {
  const [todos, setTodos] = useState(false)
  const lista = operacion.diferencias ?? []
  if (!lista.length) return <p className="text-xs text-[#627A9B]">Sin cambios de datos que mostrar.</p>
  const visibles = todos ? lista : lista.slice(0, MAXIMO_CAMBIOS)
  return <>
    <ul className="space-y-2">
      {visibles.map((c, i) => <li key={`${c.campo}-${i}`} className="rounded-xl bg-[#F6F8FC] px-3 py-2.5">
        <p className="text-[11px] font-bold text-[#45628D]">{c.campo}</p>
        {c.antes !== null && c.despues !== null ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
            <span className="break-words text-[#B91C1C] line-through decoration-[#B91C1C]/40">{c.antes}</span>
            <ArrowRight size={13} className="shrink-0 text-[#8BA0BF]" aria-label="cambió a" />
            <span className="break-words font-semibold text-[#15803D]">{c.despues}</span>
          </div>
        ) : c.despues !== null ? (
          <p className="mt-1 flex items-start gap-1.5 break-words text-xs font-semibold text-[#011140]">
            {c.campo === 'Agregado' && <Plus size={13} className="mt-0.5 shrink-0 text-[#15803D]" aria-hidden="true" />}{c.despues}
          </p>
        ) : (
          <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-[#B91C1C]">
            <Minus size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{c.antes}
          </p>
        )}
      </li>)}
    </ul>
    {lista.length > MAXIMO_CAMBIOS && <button type="button" onClick={() => setTodos((v) => !v)}
      className="mt-2 text-xs font-semibold text-[#0439D9] hover:underline">
      {todos ? 'Ver menos' : `Ver los ${lista.length}`}
    </button>}
  </>
}

function Detalle({ operacion }: { operacion: OperacionAuditada }) {
  return <>
    <dl className="mt-4 grid grid-cols-[84px_minmax(0,1fr)] gap-x-2 gap-y-2.5 text-xs">
      <dt className="text-[#627A9B]">Fecha</dt><dd className="font-semibold text-[#011140]">{soloFecha(operacion.fechaHora)}</dd>
      <dt className="text-[#627A9B]">Hora</dt><dd className="font-semibold tabular-nums text-[#011140]">{soloHora(operacion.fechaHora)}</dd>
      <dt className="text-[#627A9B]">Usuario</dt>
      <dd className="break-words font-semibold text-[#011140]">{operacion.usuario}{operacion.rolUsuario && <span className="block text-[11px] font-normal text-[#627A9B]">{rolLegible(operacion.rolUsuario)}</span>}</dd>
      <dt className="text-[#627A9B]">Módulo</dt><dd className="font-semibold text-[#011140]">{operacion.modulo === 'Roles' ? 'Roles y permisos' : operacion.modulo}</dd>
      {operacion.objetivo && <><dt className="text-[#627A9B]">Afecta a</dt><dd className="break-words font-semibold text-[#011140]">{operacion.objetivo}</dd></>}
    </dl>
    {operacion.examen?.length > 0 && <div className="mt-3 rounded-xl bg-[#F1F6FF] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#0439D9]">Examen</p>
      <dl className="mt-1.5 grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
        {operacion.examen.map((d) => <span key={d.campo} className="contents"><dt className="text-[#627A9B]">{d.campo}</dt><dd className="break-words font-semibold text-[#011140]">{d.valor}</dd></span>)}
      </dl>
    </div>}
    <p className="mt-3 rounded-xl border border-[#E4E9F2] px-3 py-2.5 text-xs font-medium text-[#011140]">{operacion.detalle}</p>
    {operacion.motivo && <p className="mt-2 rounded-xl bg-[#FFFBEB] px-3 py-2.5 text-xs text-[#92400E]"><b className="font-semibold">Motivo:</b> {operacion.motivo}</p>}
    <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wide text-[#45628D]">Qué cambió</p>
    {/* key: al elegir otra operación vuelve a mostrar solo los primeros cambios. */}
    <Cambios key={operacion.id} operacion={operacion} />
  </>
}

function Paginacion({ pagina, onCambiar }: { pagina: PaginaHistorial; onCambiar: (n: number) => void }) {
  const actual = pagina.pagina + 1
  const candidatos = Array.from(new Set([1, actual - 1, actual, actual + 1, pagina.totalPaginas])).filter((n) => n > 0 && n <= pagina.totalPaginas)
  return <div className="flex items-center gap-2">
    <button type="button" aria-label="Página anterior" disabled={actual === 1} onClick={() => onCambiar(pagina.pagina - 1)} className="grid size-9 place-items-center rounded-lg border border-[#C9D8F2] bg-white text-[#0439D9] disabled:opacity-40"><ChevronLeft size={14} /></button>
    {candidatos.map((n, i) => <span key={n} className="contents">
      {i > 0 && n - candidatos[i - 1] > 1 && <span className="text-[#627A9B]">…</span>}
      <button type="button" onClick={() => onCambiar(n - 1)} aria-current={n === actual ? 'page' : undefined} className={`size-9 rounded-lg border text-xs font-semibold ${n === actual ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#C9D8F2] bg-white text-[#45628D]'}`}>{n}</button>
    </span>)}
    <button type="button" aria-label="Página siguiente" disabled={actual >= pagina.totalPaginas} onClick={() => onCambiar(pagina.pagina + 1)} className="grid size-9 place-items-center rounded-lg border border-[#C9D8F2] bg-white text-[#0439D9] disabled:opacity-40"><ChevronRight size={14} /></button>
  </div>
}

const CAMPO = 'h-11 w-full rounded-lg border border-[#D8E3F5] bg-white text-xs text-[#011140] outline-none focus:border-[#0439D9]'

export default function HistorialOperaciones() {
  const [filtros, setFiltros] = useState(INICIALES)
  const [autores, setAutores] = useState<AutorHistorial[]>([])
  useEffect(() => { listarAutores().then(setAutores).catch(() => setAutores([])) }, [])
  const [pagina, setPagina] = useState(0)
  const [datos, setDatos] = useState<PaginaHistorial>()
  const [seleccion, setSeleccion] = useState<OperacionAuditada>()
  // En celular y tablet el detalle se abre como hoja al tocar una operación.
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [previa, setPrevia] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const cerrarHoja = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCargando(true)
      listarHistorial(filtros, pagina).then((r) => {
        setDatos(r); setSeleccion((actual) => r.contenido.find((x) => x.id === actual?.id) ?? r.contenido[0]); setError('')
      }).catch(() => setError('No se pudo cargar el historial de operaciones.')).finally(() => setCargando(false))
    }, filtros.search ? 300 : 0)
    return () => window.clearTimeout(id)
  }, [filtros, pagina, recarga])

  // En vivo: cada operación nueva que se registra recarga la página actual del historial.
  useEnVivo((c) => c.tipo === 'AUDITORIA', () => setRecarga((n) => n + 1))
  const obtener = useCallback(() => obtenerHistorial(filtros, 'pdf'), [filtros])

  useEffect(() => {
    if (!hojaAbierta) return
    cerrarHoja.current?.focus()
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setHojaAbierta(false) }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [hojaAbierta])

  const cambiar = (campo: keyof FiltrosHistorial, valor: string) => { setFiltros((f) => ({ ...f, [campo]: valor })); setPagina(0) }
  const elegir = (op: OperacionAuditada) => { setSeleccion(op); setHojaAbierta(true) }
  const desde = datos ? datos.pagina * datos.tamano + 1 : 0
  const hasta = datos ? Math.min((datos.pagina + 1) * datos.tamano, datos.totalRegistros) : 0

  return <section aria-labelledby="historial-titulo" className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
    <div className="min-w-0 rounded-2xl border border-[#E4E9F2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 id="historial-titulo" className="text-base font-bold text-[#011140]">Historial de operaciones</h2><p className="mt-0.5 text-xs text-[#627A9B]">Quién hizo qué y cuándo en todo el sistema: usuarios, estudiantes, exámenes, control de ingreso y configuración.</p></div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#15803D] sm:inline-flex"><span className="size-1.5 animate-pulse rounded-full bg-[#16A34A]" aria-hidden="true" />En vivo</span>
          <button type="button" onClick={() => setPrevia(true)} aria-label="Exportar el historial en PDF" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0439D9] px-3 text-xs font-bold text-white hover:bg-[#0027a2] sm:px-4"><Download size={15} aria-hidden="true" /><span className="hidden sm:inline">Descargar PDF</span></button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.8fr))_minmax(0,1.1fr)_repeat(2,9.5rem)]">
        <label className="relative col-span-2 lg:col-span-1"><span className="mb-1 block text-[11px] font-bold text-[#011140]">Buscar</span><Search className="pointer-events-none absolute bottom-3.5 left-3 text-[#8BA0BF]" size={15} aria-hidden="true" /><input aria-label="Buscar usuario o detalle" value={filtros.search} onChange={(e) => cambiar('search', e.target.value)} placeholder="Usuario, correo, motivo…" className={`${CAMPO} pl-9 pr-3`} /></label>
        <label><span className="mb-1 block text-[11px] font-bold text-[#011140]">Módulo</span><select value={filtros.modulo} onChange={(e) => cambiar('modulo', e.target.value)} className={`${CAMPO} px-3`}><option value="">Todos</option>{MODULOS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label><span className="mb-1 block text-[11px] font-bold text-[#011140]">Operación</span><select value={filtros.operacion} onChange={(e) => cambiar('operacion', e.target.value)} className={`${CAMPO} px-3`}><option value="">Todas</option>{OPERACIONES.map(([grupo, ops]) => <optgroup key={grupo} label={grupo}>{ops.map((o) => <option key={o}>{o}</option>)}</optgroup>)}</select></label>
        <label className="col-span-2 lg:col-span-1"><span className="mb-1 block text-[11px] font-bold text-[#011140]">Realizado por</span><select aria-label="Realizado por" value={filtros.usuario ?? ''} onChange={(e) => cambiar('usuario', e.target.value)} className={`${CAMPO} px-3 ${filtros.usuario ? 'border-[#0439D9] bg-[#F1F6FF] font-semibold' : ''}`}><option value="">Todos</option>{autores.map((a) => <option key={a.idUsuario} value={a.idUsuario}>{a.nombre}{a.roles ? ` · ${a.roles}` : ''}</option>)}</select></label>
        {([['desde', 'Desde'], ['hasta', 'Hasta']] as const).map(([campo, etiqueta]) => <label key={campo}><span className="mb-1 block text-[11px] font-bold text-[#011140]">{etiqueta}</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3 top-3.5 text-[#8BA0BF]" size={14} aria-hidden="true" /><input type="date" value={filtros[campo]} onChange={(e) => cambiar(campo, e.target.value)} className={`${CAMPO} pl-9 pr-2`} /></span></label>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold text-[#627A9B]">Rango:</span>
        {RANGOS.map((r) => {
          const activo = filtros.desde === r.desde() && filtros.hasta === r.hasta()
          return <button key={r.texto} type="button" aria-pressed={activo} onClick={() => { setFiltros((f) => ({ ...f, desde: r.desde(), hasta: r.hasta() })); setPagina(0) }}
            className={`min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${activo ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#D8E3F5] bg-white text-[#45628D] hover:border-[#0439D9] hover:text-[#0439D9]'}`}>{r.texto}</button>
        })}
        {(filtros.search || filtros.modulo || filtros.operacion || filtros.usuario) && (
          <button type="button" onClick={() => { setFiltros((f) => ({ ...f, search: '', modulo: '', operacion: '', usuario: '' })); setPagina(0) }}
            className="ml-auto text-xs font-semibold text-[#0439D9] hover:underline">Quitar filtros</button>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 hidden md:block">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-[#F3F6FB] text-[10px] uppercase tracking-wide text-[#45628D]"><tr>
            <th className="w-[96px] rounded-l-lg px-3 py-2.5 font-semibold">Fecha</th>
            <th className="w-[78px] px-3 font-semibold">Hora</th>
            <th className="w-[22%] px-3 font-semibold">Usuario</th>
            <th className="w-[118px] px-3 font-semibold">Operación</th>
            <th className="rounded-r-lg px-3 font-semibold">Detalle</th>
          </tr></thead>
          <tbody>{datos?.contenido.map((op) => <tr key={op.id} onClick={() => elegir(op)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(op) } }} tabIndex={0} aria-selected={seleccion?.id === op.id}
            className={`cursor-pointer border-b border-[#E9EEF6] align-top outline-none focus-visible:bg-[#EDF3FF] ${seleccion?.id === op.id ? 'bg-[#EDF3FF]' : 'hover:bg-[#F8FAFD]'}`}>
            <td className="whitespace-nowrap px-3 py-3 text-[#011140]">{soloFecha(op.fechaHora)}</td>
            <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[#45628D]">{soloHora(op.fechaHora)}</td>
            <td className="px-3 py-3"><p className="truncate font-semibold text-[#011140]" title={op.usuario}>{op.usuario}</p><p className="truncate text-[11px] text-[#627A9B]">{rolLegible(op.rolUsuario)}</p></td>
            <td className="px-3 py-3"><Etiqueta operacion={op.operacion} /><p className="mt-1 truncate text-[11px] text-[#627A9B]">{op.modulo}</p></td>
            <td className="px-3 py-3">{op.objetivo && <p className="truncate font-semibold text-[#011140]" title={op.objetivo}>{op.objetivo}{horarioExamen(op) && <span className="ml-1.5 font-normal text-[#627A9B]">· {horarioExamen(op)}</span>}</p>}<p className="truncate text-[#45628D]" title={op.detalle}>{op.detalle}{op.motivo ? ` · ${op.motivo}` : ''}</p></td>
          </tr>)}</tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-2 md:hidden">{datos?.contenido.map((op) => <li key={op.id}><button type="button" onClick={() => elegir(op)} className="w-full rounded-xl border border-[#E0E6EF] bg-white p-3 text-left active:bg-[#F8FAFD]">
        <div className="flex items-center gap-2"><Etiqueta operacion={op.operacion} /><span className="truncate text-[11px] text-[#45628D]">{op.modulo}</span><span className="ml-auto shrink-0 text-right text-[11px] leading-tight text-[#45628D]">{soloFecha(op.fechaHora)}<span className="block tabular-nums">{soloHora(op.fechaHora)}</span></span></div>
        {op.objetivo && <p className="mt-2 truncate text-sm font-bold text-[#011140]">{op.objetivo}</p>}
        <p className="mt-0.5 line-clamp-2 text-xs text-[#45628D]">{op.detalle}</p>
        {horarioExamen(op) && <p className="mt-0.5 truncate text-[11px] text-[#627A9B]">{horarioExamen(op)}</p>}
        <p className="mt-1 truncate text-[11px] text-[#627A9B]">{op.usuario}{op.rolUsuario ? ` · ${rolLegible(op.rolUsuario)}` : ''}</p>
      </button></li>)}</ul>

      {!cargando && datos?.contenido.length === 0 && <p className="py-12 text-center text-sm text-[#627A9B]">No hay operaciones con estos filtros.</p>}
      {cargando && !datos && <p role="status" className="py-8 text-center text-sm text-[#627A9B]">Cargando historial…</p>}
      {datos && datos.totalPaginas > 0 && <div className="mt-4 flex flex-col gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#627A9B]">Mostrando {desde}–{hasta} de {datos.totalRegistros} operaciones</p><Paginacion pagina={datos} onCambiar={setPagina} /></div>}
    </div>

    <aside aria-label="Detalle de la operación" className="hidden h-fit min-w-0 rounded-2xl border border-[#E4E9F2] bg-white p-4 shadow-sm min-[1100px]:sticky min-[1100px]:top-4 min-[1100px]:block">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#011140]">Detalle de la operación</h3>
        {seleccion && <Etiqueta operacion={seleccion.operacion} />}
      </div>
      {seleccion ? <Detalle operacion={seleccion} /> : <p className="mt-4 text-xs text-[#627A9B]">Selecciona una operación.</p>}
    </aside>

    {hojaAbierta && seleccion && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#011140]/40 sm:items-center sm:p-4 min-[1100px]:hidden" onClick={() => setHojaAbierta(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="hoja-historial-titulo" onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2"><h3 id="hoja-historial-titulo" className="text-sm font-bold text-[#011140]">Detalle de la operación</h3><Etiqueta operacion={seleccion.operacion} /></div>
          <button ref={cerrarHoja} type="button" onClick={() => setHojaAbierta(false)} aria-label="Cerrar el detalle" className="grid size-9 shrink-0 place-items-center rounded-lg text-[#45628D] hover:bg-[#F1F6FF]"><X size={18} aria-hidden="true" /></button>
        </div>
        <Detalle operacion={seleccion} />
      </div>
    </div>}
    <VistaPreviaDescarga open={previa} titulo="Historial de operaciones" formatos={FORMATOS}
      obtener={obtener} onClose={() => setPrevia(false)} />
  </section>
}
