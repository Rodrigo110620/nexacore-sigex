import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { exportarHistorial, listarHistorial, type FiltrosHistorial, type OperacionAuditada, type PaginaHistorial } from '../../services/historialOperacionService'

const hoy = () => new Date().toISOString().slice(0, 10)
const haceSieteDias = () => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - 7)
  return fecha.toISOString().slice(0, 10)
}
const INICIALES: FiltrosHistorial = { search: '', modulo: '', operacion: '', desde: haceSieteDias(), hasta: hoy() }

const colores: Record<string, string> = {
  Crear: 'bg-[#D9F8E5] text-[#15803D]', Editar: 'bg-[#E5ECFF] text-[#0439D9]',
  Modificado: 'bg-[#E5ECFF] text-[#0439D9]', Asignar: 'bg-[#EEE8FF] text-[#7047EB]',
  Importar: 'bg-[#D9F6FA] text-[#0891B2]', Desactivar: 'bg-[#FFE1E4] text-[#DC2626]',
  Desbloquear: 'bg-[#D9F8E5] text-[#15803D]', Eliminar: 'bg-[#FFE1E4] text-[#DC2626]',
  Cancelado: 'bg-[#FFE1E4] text-[#DC2626]', Respaldo: 'bg-[#FFF0C9] text-[#B77900]',
}

function fechaHora(fecha: string) {
  const valor = new Date(fecha)
  return {
    completa: new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'medium', hour12: false }).format(valor),
    hora: new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(valor),
  }
}

function fechaHoraDetalle(fecha: string) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(fecha)).replace(',', '')
}

function Etiqueta({ operacion }: { operacion: string }) {
  return <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase ${colores[operacion] ?? 'bg-[#EEF2F6] text-[#45628D]'}`}>{operacion}</span>
}

function Cambios({ operacion }: { operacion: OperacionAuditada }) {
  const cambios = useMemo(() => {
    if (!operacion.cambios || typeof operacion.cambios !== 'object' || Array.isArray(operacion.cambios)) return null
    return operacion.cambios as Record<string, unknown>
  }, [operacion])
  const valores = useMemo(() => cambios
    ? Object.entries(cambios).filter(([clave, valor]) => !['nombre', 'antes', 'despues', 'agregado'].includes(clave) && valor !== null && valor !== '')
    : [], [cambios])
  if (!cambios) return <p className="text-sm text-[#627A9B]">No hay valores adicionales registrados.</p>
  const tieneComparacion = cambios.antes !== undefined && cambios.despues !== undefined
  const etiquetaComparacion = cambios.campo
    ? String(cambios.campo)
    : `${cambios.antes} ${cambios.despues}`.toLowerCase().includes('permiso') ? 'Permisos' : 'Cambio'
  const texto = (valor: unknown) => typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
  if (tieneComparacion || cambios.agregado !== undefined) return <div className="space-y-3">
    {tieneComparacion && <div className="rounded-xl bg-[#F6F8FC] p-3">
      <p className="text-[11px] font-bold text-[#011140]">{etiquetaComparacion}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
        <span className="rounded-md bg-[#FFE1E4] px-2.5 py-1.5 text-[#DC2626]">{texto(cambios.antes)}</span>
        <ArrowRight size={15} className="text-[#8BA0BF]" aria-hidden="true" />
        <span className="rounded-md bg-[#D9F8E5] px-2.5 py-1.5 text-[#15803D]">{texto(cambios.despues)}</span>
      </div>
    </div>}
    {cambios.agregado !== undefined && <div className="rounded-xl bg-[#F6F8FC] p-3">
      <p className="text-[11px] font-bold text-[#011140]">Agregado</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] font-medium">
        <span className="h-6 w-8 rounded-md bg-[#FFE1E4]" aria-label="Sin valor anterior" />
        <ArrowRight size={15} className="text-[#8BA0BF]" aria-hidden="true" />
        <span className="rounded-md bg-[#D9F8E5] px-2.5 py-1.5 text-[#15803D]">{texto(cambios.agregado)}</span>
      </div>
    </div>}
  </div>
  if (!valores.length) return <p className="text-sm text-[#627A9B]">No hay valores adicionales registrados.</p>
  return <div className="space-y-2">
    {valores.map(([clave, valor]) => <div key={clave} className="rounded-xl bg-[#F6F8FC] p-3">
      <p className="text-[11px] font-bold capitalize text-[#45628D]">{clave.replace(/_/g, ' ')}</p>
      <p className="mt-1 break-words text-xs font-semibold text-[#011140]">{typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}</p>
    </div>)}
  </div>
}

function nombreRegistro(operacion: OperacionAuditada) {
  const cambios = operacion.cambios && typeof operacion.cambios === 'object' && !Array.isArray(operacion.cambios)
    ? operacion.cambios as Record<string, unknown> : {}
  const nombre = cambios.nombre ? String(cambios.nombre) : operacion.detalle
  const prefijo = operacion.modulo === 'Roles' ? 'Rol '
    : operacion.modulo === 'Usuarios' ? 'Usuario '
      : operacion.modulo === 'Exámenes' ? 'Examen ' : ''
  return `${prefijo}${nombre}`
}

function Paginacion({ pagina, onCambiar }: { pagina: PaginaHistorial; onCambiar: (n: number) => void }) {
  const actual = pagina.pagina + 1
  const candidatos = Array.from(new Set([1, actual - 1, actual, actual + 1, pagina.totalPaginas])).filter((n) => n > 0 && n <= pagina.totalPaginas)
  return <div className="flex items-center gap-2">
    <button aria-label="Página anterior" disabled={actual === 1} onClick={() => onCambiar(pagina.pagina - 1)} className="grid size-9 place-items-center rounded-lg border border-[#C9D8F2] bg-white text-[#0439D9] disabled:opacity-40"><ChevronLeft size={14} /></button>
    {candidatos.map((n, i) => <span key={n} className="contents">
      {i > 0 && n - candidatos[i - 1] > 1 && <span className="text-[#627A9B]">…</span>}
      <button onClick={() => onCambiar(n - 1)} aria-current={n === actual ? 'page' : undefined} className={`size-9 rounded-lg border text-xs font-semibold ${n === actual ? 'border-[#0439D9] bg-[#0439D9] text-white' : 'border-[#C9D8F2] bg-white text-[#45628D]'}`}>{n}</button>
    </span>)}
    <button aria-label="Página siguiente" disabled={actual >= pagina.totalPaginas} onClick={() => onCambiar(pagina.pagina + 1)} className="grid size-9 place-items-center rounded-lg border border-[#C9D8F2] bg-white text-[#0439D9] disabled:opacity-40"><ChevronRight size={14} /></button>
  </div>
}

export default function HistorialOperaciones() {
  const [filtros, setFiltros] = useState(INICIALES)
  const [pagina, setPagina] = useState(0)
  const [datos, setDatos] = useState<PaginaHistorial>()
  const [seleccion, setSeleccion] = useState<OperacionAuditada>()
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCargando(true)
      listarHistorial(filtros, pagina).then((r) => {
        setDatos(r); setSeleccion((actual) => r.contenido.find((x) => x.id === actual?.id) ?? r.contenido[0]); setError('')
      }).catch(() => setError('No se pudo cargar el historial de operaciones.')).finally(() => setCargando(false))
    }, filtros.search ? 300 : 0)
    return () => window.clearTimeout(id)
  }, [filtros, pagina])

  const cambiar = (campo: keyof FiltrosHistorial, valor: string) => { setFiltros((f) => ({ ...f, [campo]: valor })); setPagina(0) }
  const exportar = async () => {
    setExportando(true)
    try {
      await exportarHistorial(filtros)
      setError('')
    } catch {
      setError('No se pudo exportar el historial de operaciones.')
    } finally {
      setExportando(false)
    }
  }
  const desde = datos ? datos.pagina * datos.tamano + 1 : 0
  const hasta = datos ? Math.min((datos.pagina + 1) * datos.tamano, datos.totalRegistros) : 0

  return <section aria-labelledby="historial-titulo" className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_282px]">
    <div className="overflow-hidden rounded-2xl border border-[#E4E9F2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 id="historial-titulo" className="text-base font-bold text-[#011140]">Historial de operaciones</h2><p className="mt-0.5 hidden text-xs text-[#627A9B] sm:block">Quién cambió qué y cuándo: usuarios, roles, exámenes, estudiantes y respaldos.</p></div>
        <button type="button" disabled={exportando} onClick={() => void exportar()} className="hidden min-h-10 items-center gap-2 rounded-lg border border-[#C9D8F2] px-4 text-xs font-bold text-[#0439D9] disabled:cursor-wait disabled:opacity-60 sm:inline-flex"><Download size={15} /> {exportando ? 'Exportando…' : 'Exportar'}</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 min-[700px]:grid-cols-[1.3fr_.8fr_.8fr_1fr_1fr]">
        <label className="relative col-span-2 min-[700px]:col-span-1"><span className="mb-1 block text-[11px] font-bold text-[#011140]">Buscar</span><Search className="absolute bottom-3 left-3 text-[#8BA0BF]" size={15} /><input aria-label="Buscar usuario o detalle" value={filtros.search} onChange={(e) => cambiar('search', e.target.value)} placeholder="Usuario o detalle" className="h-11 w-full rounded-lg border border-[#D8E3F5] pl-9 pr-3 text-xs outline-none focus:border-[#0439D9]" /></label>
        <label><span className="mb-1 block text-[11px] font-bold text-[#011140]">Módulo</span><select value={filtros.modulo} onChange={(e) => cambiar('modulo', e.target.value)} className="h-11 w-full rounded-lg border border-[#D8E3F5] px-3 text-xs text-[#011140]"><option value="">Todos</option><option>Usuarios</option><option>Roles</option><option>Exámenes</option><option>Estudiantes</option><option value="Configuracion">Configuración</option></select></label>
        <label><span className="mb-1 block text-[11px] font-bold text-[#011140]">Operación</span><select value={filtros.operacion} onChange={(e) => cambiar('operacion', e.target.value)} className="h-11 w-full rounded-lg border border-[#D8E3F5] px-3 text-xs text-[#011140]"><option value="">Todas</option><option>Crear</option><option>Editar</option><option>Asignar</option><option>Importar</option><option>Desactivar</option><option>Desbloquear</option><option>Eliminar</option><option>Respaldo</option></select></label>
        {(['desde', 'hasta'] as const).map((campo) => <label key={campo}><span className="mb-1 block text-[11px] font-bold capitalize text-[#011140]">{campo}</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3 top-3.5 text-[#8BA0BF]" size={14} /><input type="date" value={filtros[campo]} onChange={(e) => cambiar(campo, e.target.value)} className="h-11 w-full rounded-lg border border-[#D8E3F5] pl-9 pr-2 text-xs text-[#011140]" /></span></label>)}
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[650px] table-fixed text-left text-[11px]"><thead className="bg-[#F3F6FB] text-[9px] uppercase text-[#45628D]"><tr><th className="w-[20%] rounded-l-lg px-3 py-2">Fecha y hora</th><th className="w-[18%] px-3">Usuario</th><th className="w-[15%] px-3">Módulo</th><th className="w-[14%] px-3">Operación</th><th className="rounded-r-lg px-3">Detalle</th></tr></thead>
          <tbody>{datos?.contenido.map((op) => <tr key={op.id} onClick={() => setSeleccion(op)} className={`cursor-pointer border-b border-[#E9EEF6] ${seleccion?.id === op.id ? 'bg-[#EDF3FF]' : 'hover:bg-[#F8FAFD]'}`}><td className="px-3 py-3 text-[#011140]">{fechaHora(op.fechaHora).completa}</td><td className="px-3 font-semibold text-[#011140]">{op.usuario}</td><td className="px-3 text-[#45628D]">{op.modulo}</td><td className="px-3"><Etiqueta operacion={op.operacion} /></td><td className="px-3 text-[#011140]">{op.detalle}</td></tr>)}</tbody></table>
      </div>

      <ul className="mt-4 space-y-3 sm:hidden">{datos?.contenido.map((op) => <li key={op.id}><button onClick={() => setSeleccion(op)} className="w-full rounded-2xl border border-[#E0E6EF] bg-white p-4 text-left"><div className="flex items-center gap-2"><Etiqueta operacion={op.operacion} /><span className="text-[11px] text-[#45628D]">{op.modulo}</span><span className="ml-auto text-xs text-[#45628D]">{fechaHora(op.fechaHora).hora}</span></div><p className="mt-2 text-sm font-bold text-[#011140]">{op.detalle}</p><p className="mt-1 text-xs text-[#627A9B]">{op.usuario}</p></button></li>)}</ul>
      {!cargando && datos?.contenido.length === 0 && <p className="py-12 text-center text-sm text-[#627A9B]">No hay operaciones con estos filtros.</p>}
      {cargando && <p role="status" className="py-8 text-center text-sm text-[#627A9B]">Cargando historial…</p>}
      {datos && datos.totalPaginas > 0 && <div className="mt-4 flex flex-col gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#627A9B]">Mostrando {desde}–{hasta} de {datos.totalRegistros} operaciones</p><Paginacion pagina={datos} onCambiar={setPagina} /></div>}
    </div>

    <aside aria-label="Detalle de la operación" className="hidden h-fit rounded-2xl border border-[#E4E9F2] bg-white p-4 shadow-sm min-[1100px]:block">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#011140]">Detalle de la operación</h3>
        {seleccion && <Etiqueta operacion={seleccion.operacion} />}
      </div>
      {seleccion ? <><dl className="mt-4 grid grid-cols-[76px_1fr] gap-y-3 text-[11px]"><dt className="text-[#627A9B]">Fecha y hora</dt><dd className="font-semibold text-[#011140]">{fechaHoraDetalle(seleccion.fechaHora)}</dd><dt className="text-[#627A9B]">Usuario</dt><dd className="font-semibold text-[#011140]">{seleccion.usuario}{seleccion.rolUsuario ? ` (${seleccion.rolUsuario})` : ''}</dd><dt className="text-[#627A9B]">Módulo</dt><dd className="font-semibold text-[#011140]">{seleccion.modulo === 'Roles' ? 'Roles y permisos' : seleccion.modulo}</dd><dt className="text-[#627A9B]">Registro</dt><dd className="font-semibold text-[#011140]">{nombreRegistro(seleccion)}</dd></dl><p className="mb-2 mt-4 text-[10px] font-bold uppercase text-[#45628D]">Cambios</p><Cambios operacion={seleccion} /></> : <p className="mt-4 text-xs text-[#627A9B]">Selecciona una operación.</p>}
    </aside>
  </section>
}
