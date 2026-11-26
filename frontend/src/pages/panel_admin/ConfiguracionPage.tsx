import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Check, DatabaseBackup, History, Lightbulb, Lock, Pencil, Plus, ShieldCheck, Trash2, TriangleAlert, X, CalendarRange, BookOpen } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PLANTILLAS_ROL, permisosFaltantes, sugerirPlantillas } from '../../utils/plantillasRol'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import RespaldoBase from '../../components/configuracion/RespaldoBase'
import PeriodosAcademicos from '../../components/configuracion/PeriodosAcademicos'
import MateriasCarreras from '../../components/configuracion/MateriasCarreras'
import HistorialOperaciones from '../../components/configuracion/HistorialOperaciones'
import { useAuth } from '../../context/AuthContext'
import {
  actualizarRol, crearRolConPermisos, eliminarRol, listarPermisos, listarRolesConPermisos,
  type PermisoCatalogo, type RolConPermisos,
} from '../../services/rolesService'
import ErrorCarga from '../../components/ui/ErrorCarga'

const mensajeDe = (err: unknown, porDefecto: string) => {
  if (!axios.isAxiosError(err)) return porDefecto
  const datos = err.response?.data as { mensaje?: string; errores?: Record<string, string> } | undefined
  return datos?.mensaje ?? Object.values(datos?.errores ?? {})[0] ?? porDefecto
}

const agrupar = (permisos: PermisoCatalogo[]) => {
  const grupos = new Map<string, PermisoCatalogo[]>()
  for (const p of permisos) grupos.set(p.modulo, [...(grupos.get(p.modulo) ?? []), p])
  return [...grupos.entries()]
}

/** Formulario para crear o editar un rol extra (p. ej. AUXILIAR) y elegir sus permisos. */
function FormularioRol({ rol, catalogo, onCancelar, onGuardado }: {
  rol: RolConPermisos | null; catalogo: PermisoCatalogo[]; onCancelar: () => void; onGuardado: () => void
}) {
  const [nombre, setNombre] = useState(rol?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '')
  const [elegidos, setElegidos] = useState<Set<string>>(new Set(rol?.permisos ?? []))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const asignables = catalogo.filter((p) => !p.soloAdmin)
  const seccion = useRef<HTMLElement>(null)
  const [plantilla, setPlantilla] = useState<string | null>(null)
  const [verTodas, setVerTodas] = useState(false)
  // Las sugerencias aparecen recién al escribir el nombre o la descripción; no se aplican solas.
  const sugeridas = sugerirPlantillas(nombre, descripcion)
  const plantillasVisibles = verTodas ? PLANTILLAS_ROL : sugeridas
  const escrito = (nombre || descripcion).trim()
  const disponibles = new Set(asignables.map((p) => p.codigo))
  const descripcionDe = new Map(catalogo.map((p) => [p.codigo, p.descripcion]))
  const faltantes = permisosFaltantes(elegidos, disponibles)

  /** Plantilla: marca sus permisos y, si están vacíos, propone el nombre y la descripción. */
  const usarPlantilla = (id: string) => {
    const elegida = PLANTILLAS_ROL.find((x) => x.id === id)
    if (!elegida) return
    setPlantilla(id)
    setElegidos(new Set(elegida.permisos.filter((c) => disponibles.has(c))))
    if (!nombre.trim()) setNombre(elegida.nombre)
    if (!descripcion.trim()) setDescripcion(elegida.descripcion)
    setError('')
  }

  // Al abrirse, enfoca el primer campo editable.
  useEffect(() => {
    seccion.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true })
  }, [])

  const alternar = (codigo: string) => setElegidos((prev) => {
    const nuevo = new Set(prev)
    if (nuevo.has(codigo)) nuevo.delete(codigo)
    else nuevo.add(codigo)
    return nuevo
  })

  const guardar = async () => {
    const limpio = nombre.trim().toUpperCase()
    if (!rol && !/^[A-Z][A-Z_]{2,29}$/.test(limpio)) return setError('El nombre: de 3 a 30 letras mayúsculas o guiones bajos, sin espacios (p. ej. AUXILIAR).')
    if (descripcion.trim().length < 5) return setError('Describe para qué sirve el rol (al menos 5 caracteres).')
    if (elegidos.size === 0) return setError('Elige al menos un permiso.')
    setGuardando(true)
    setError('')
    try {
      const datos = { nombre: limpio, descripcion: descripcion.trim(), permisos: [...elegidos] }
      if (rol) await actualizarRol(rol.id, datos)
      else await crearRolConPermisos(datos)
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo guardar el rol. Inténtalo de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="rol-form-titulo">
    <section ref={seccion} aria-label={rol ? `Editar el rol ${rol.nombre}` : 'Nuevo rol'}
      className="flex max-h-[calc(100dvh-4.5rem)] w-full min-w-0 flex-col overflow-hidden rounded-t-xl border border-[#D8E3F5] bg-white shadow-xl sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl sm:shadow-2xl">
      <header className="flex items-start justify-between border-b border-[#D8E3F5] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><ShieldCheck size={19} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 id="rol-form-titulo" className="font-bold text-[#011140]">{rol ? `Editar rol ${rol.nombre}` : 'Registrar Rol'}</h2>
            <p className="mt-1 text-xs text-[#627A9B]">Elija los permisos que tendrán los usuarios con este rol.</p>
          </div>
        </div>
        <button type="button" onClick={onCancelar} aria-label="Cerrar formulario" className="rounded p-1 text-[#627A9B] hover:bg-gray-100"><X size={18} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#011140]">
          Nombre del rol <b className="text-red-500">*</b>
          <input value={nombre} disabled={!!rol} maxLength={30} placeholder="Ej.: AUXILIAR"
            onChange={(e) => { setNombre(e.target.value.toUpperCase().replace(/[^A-Z_]/g, '')); setError('') }}
            className="mt-1 h-10 w-full rounded-md border border-[#C9D7EC] bg-white px-3 text-[13px] font-normal text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF] uppercase disabled:bg-[#F1F5F9]" />
        </label>
        <label className="text-xs font-semibold text-[#011140]">
          Descripción
          <input value={descripcion} maxLength={200} placeholder="Ej.: apoya al control en la puerta del aula"
            onChange={(e) => { setDescripcion(e.target.value); setError('') }}
            className="mt-1 h-10 w-full rounded-md border border-[#C9D7EC] bg-white px-3 text-[13px] font-normal text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF]" />
        </label>
      </div>
      {!rol && (
        <div className="mt-4">
          {plantillasVisibles.length > 0 && (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#011140]">
                <Lightbulb size={14} className="text-[#D97706]" aria-hidden="true" />
                {verTodas || !escrito ? 'Plantillas' : `Sugerencias para «${escrito}»`}
              </p>
              <p className="mt-0.5 text-[11px] text-[#627A9B]">Elige una para marcar los permisos más comunes de ese trabajo; después puedes quitar o agregar.</p>
              <div aria-label="Plantillas sugeridas" role="group" className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {plantillasVisibles.map((x) => (
                  <button key={x.id} type="button" onClick={() => usarPlantilla(x.id)} aria-pressed={plantilla === x.id}
                    className={`rounded-lg border p-3 text-left transition-colors ${plantilla === x.id ? 'border-[#0439D9] bg-[#EEF3FF]' : 'border-[#E4E9F2] bg-white hover:border-[#B8CBEF] hover:bg-[#F8FAFF]'}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#011140]">{x.titulo}</span>
                      {plantilla === x.id && <Check size={15} className="shrink-0 text-[#0439D9]" aria-hidden="true" />}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-[#627A9B]">{x.descripcion}</span>
                    <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#45628D]">{x.permisos.filter((c) => disponibles.has(c)).length} permisos</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <button type="button" onClick={() => setVerTodas((v) => !v)}
            className={`${plantillasVisibles.length > 0 ? 'mt-2' : ''} inline-flex items-center gap-1 text-xs font-semibold text-[#0439D9] hover:underline`}>
            <Lightbulb size={13} aria-hidden="true" />
            {verTodas ? 'Ver solo las sugerencias' : sugeridas.length > 0 ? 'Ver todas las plantillas' : 'Ver plantillas'}
          </button>
        </div>
      )}
      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-[#011140]">Permisos ({elegidos.size})</legend>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {agrupar(asignables).map(([modulo, permisos]) => (
            <div key={modulo} className="rounded-lg border border-[#E4E9F2] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#627A9B]">{modulo}</p>
              <ul className="mt-1.5 space-y-1.5">
                {permisos.map((p) => (
                  <li key={p.codigo}>
                    <label className="flex min-h-9 cursor-pointer items-start gap-2 text-sm text-[#011140]">
                      <input type="checkbox" checked={elegidos.has(p.codigo)} onChange={() => { alternar(p.codigo); setError('') }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0439D9]" />
                      <span>{p.descripcion}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[#627A9B]">
          <Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          Gestionar usuarios y roles es solo del ADMIN: así nadie puede darse más permisos de los que tiene.
          Los permisos "propios" valen solo para los exámenes del usuario como docente.
        </p>
      </fieldset>
      {faltantes.length > 0 && (
        <ul aria-label="Permisos que faltan" className="mt-3 space-y-2">
          {faltantes.map((f) => (
            <li key={f.permiso} className="flex flex-col gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E] sm:flex-row sm:items-center">
              <span className="flex flex-1 items-start gap-2">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>«{descripcionDe.get(f.permiso) ?? f.permiso}» necesita «{descripcionDe.get(f.sugerido) ?? f.sugerido}» para {f.para}.</span>
              </span>
              <button type="button" onClick={() => { setElegidos((prev) => new Set(prev).add(f.sugerido)); setError('') }}
                className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-[#F59E0B] bg-white px-3 font-semibold text-[#92400E] hover:bg-[#FEF3C7]">
                <Plus size={13} aria-hidden="true" /> Agregar
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </div>
      <footer className="[&>*]:min-w-0 [&>*]:flex-1 sm:[&>*]:flex-none flex flex-row gap-2 border-t border-[#D8E3F5] px-4 py-3 sm:justify-between sm:px-5">
        <button type="button" onClick={onCancelar} className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D]">Cancelar</button>
        <button type="button" disabled={guardando} onClick={() => void guardar()}
          className="h-10 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md disabled:opacity-60">
          {guardando ? 'Guardando…' : rol ? 'Guardar cambios' : 'Registrar Rol'}
        </button>
      </footer>
    </section>
    </div>
  )
}

/** Configuración (solo ADMIN): roles del sistema, fijos, y roles extra con los permisos que elija. */
export default function ConfiguracionPage() {
  const [roles, setRoles] = useState<RolConPermisos[]>()
  const [catalogo, setCatalogo] = useState<PermisoCatalogo[]>([])
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)
  const [editando, setEditando] = useState<RolConPermisos | 'nuevo' | null>(null)
  const [aviso, setAviso] = useState('')
  // Tras editar, el aviso "guardado" se muestra en la tarjeta del rol (ahí está mirando el admin).
  const [guardadoId, setGuardadoId] = useState<number | null>(null)

  useEffect(() => {
    let vigente = true
    Promise.all([listarRolesConPermisos(), listarPermisos()])
      .then(([r, c]) => { if (vigente) { setRoles(r); setCatalogo(c); setError('') } })
      .catch(() => { if (vigente) setError('No se pudieron cargar los roles.') })
    return () => { vigente = false }
  }, [recarga])

  const esAdmin = useAuth().roles.includes('ADMIN')
  type Pestana = 'roles' | 'periodos' | 'materias' | 'respaldo' | 'historial'
  const deHash = (hash: string): Pestana => hash === '#respaldo' ? 'respaldo' : hash === '#historial' ? 'historial' : hash === '#periodos' ? 'periodos' : hash === '#materias' ? 'materias' : 'roles'
  // La pestaña sale de la dirección (#respaldo, #historial): así el menú lateral y las pestañas siempre coinciden.
  const { hash } = useLocation()
  const navigate = useNavigate()
  const pestana = deHash(hash)
  const cambiarPestana = (id: Pestana) => navigate({ hash: id === 'roles' ? '' : `#${id}` }, { replace: true })
  const descripcionDe = useMemo(() => new Map(catalogo.map((p) => [p.codigo, p.descripcion])), [catalogo])

  const borrar = async (rol: RolConPermisos) => {
    if (!window.confirm(`¿Borrar el rol ${rol.nombre}? No se puede deshacer.`)) return
    try {
      await eliminarRol(rol.id)
      setAviso(`Se borró el rol ${rol.nombre}.`)
      setRecarga((n) => n + 1)
    } catch (err) {
      setAviso(mensajeDe(err, 'No se pudo borrar el rol.'))
    }
  }

  // La mesa de ayuda pasó al menú lateral: los enlaces viejos (#ayuda) llevan a su página.
  if (hash === '#ayuda') return <Navigate to="/dashboard/mesa-ayuda" replace />

  return (
    <PanelLayout compactDesktop>
      <div className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}>
        <section aria-labelledby="configuracion-titulo" className="px-3 py-4 sm:px-5">
          <div className="w-full">
            <h1 id="configuracion-titulo" className="sr-only">Configuración</h1>
            {esAdmin && (
              <div role="tablist" aria-label="Secciones de Configuración"
                className="-mx-3 mb-4 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
                {([['roles', 'Roles y permisos', 'Roles', ShieldCheck], ['periodos', 'Periodos', 'Periodos', CalendarRange], ['materias', 'Materias', 'Materias', BookOpen], ['respaldo', 'Respaldo', 'Respaldo', DatabaseBackup], ['historial', 'Historial de operaciones', 'Historial', History]] as const).map(([id, texto, corto, Icono]) => (
                  <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => cambiarPestana(id)} aria-label={texto}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors sm:min-h-10 sm:gap-2 sm:px-4 sm:text-sm ${
                      pestana === id ? 'bg-[#0439D9] text-white shadow-sm' : 'border border-[#D8E3F5] bg-white text-[#45628D] hover:bg-[#F1F6FF]'}`}>
                    <Icono size={16} aria-hidden="true" /> <span className="sm:hidden">{corto}</span><span className="hidden sm:inline">{texto}</span>
                  </button>
                ))}
              </div>
            )}
            {esAdmin && pestana === 'periodos' ? (
              <PeriodosAcademicos />
            ) : esAdmin && pestana === 'materias' ? (
              <MateriasCarreras />
            ) : esAdmin && pestana === 'historial' ? (
              <HistorialOperaciones />
            ) : esAdmin && pestana === 'respaldo' ? (
              // El respaldo contiene toda la base: solo el ADMIN, no un rol extra con permiso de roles.
              <RespaldoBase />
            ) : (<>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#011140]">Roles y permisos</h2>
                <p className="text-sm text-[#627A9B]">
                  ADMIN, DOCENTE y CONTROL son del sistema y no cambian. Crea roles extra, como un auxiliar, con los permisos que necesite.
                </p>
              </div>
              {(
                <button type="button" onClick={() => { setEditando('nuevo'); setAviso('') }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white sm:w-auto">
                  <Plus size={16} aria-hidden="true" /> Nuevo rol
                </button>
              )}
            </div>

            {aviso && <p role="status" className="mt-3 rounded-lg bg-[#EEF3FF] p-3 text-sm text-[#334E7A]">{aviso}</p>}
            {editando === 'nuevo' && (
              <FormularioRol key="nuevo" rol={null} catalogo={catalogo} onCancelar={() => setEditando(null)}
                onGuardado={() => { setAviso('Rol creado. Ya puedes asignarlo en Usuarios.'); setEditando(null); setRecarga((n) => n + 1) }} />
            )}
            {editando !== null && editando !== 'nuevo' && (
              <FormularioRol key={editando.id} rol={editando} catalogo={catalogo} onCancelar={() => setEditando(null)}
                onGuardado={() => { const id = editando.id; setAviso(''); setGuardadoId(id); setEditando(null); setRecarga((n) => n + 1) }} />
            )}

            {error && <ErrorCarga className="mt-4" mensaje={error} onReintentar={() => { setError(''); setRecarga((n) => n + 1) }} />}
            {!roles && !error && <p role="status" className="mt-4 text-sm text-[#627A9B]">Cargando roles…</p>}
            {roles && (
              <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                {roles.map((rol) => (
                  <li key={rol.id} className="rounded-xl border border-[#D8E3F5] bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldCheck size={18} className={rol.delSistema ? 'text-[#0439D9]' : 'text-[#15803D]'} aria-hidden="true" />
                      <h3 className="text-sm font-bold text-[#011140]">{rol.nombre}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rol.delSistema ? 'bg-[#EEF3FF] text-[#0439D9]' : 'bg-[#ECFDF3] text-[#15803D]'}`}>
                        {rol.delSistema ? 'Del sistema' : 'Rol extra'}
                      </span>
                      {guardadoId === rol.id && (
                        <span role="status" className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]"><Check size={11} aria-hidden="true" />Cambios guardados</span>
                      )}
                      <span className="ml-auto text-xs text-[#627A9B]">{rol.usuarios} {rol.usuarios === 1 ? 'usuario' : 'usuarios'}</span>
                    </div>
                    {rol.descripcion && <p className="mt-1 text-xs text-[#45628D]">{rol.descripcion}</p>}
                    <details className="mt-2 rounded-lg bg-[#F8FAFC] p-2 text-xs">
                      <summary className="cursor-pointer py-1 font-semibold text-[#0439D9]">{rol.permisos.length} permisos</summary>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[#334E7A]">
                        {rol.permisos.map((p) => <li key={p}>{descripcionDe.get(p) ?? p}</li>)}
                      </ul>
                    </details>
                    {rol.delSistema ? (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#627A9B]"><Lock size={12} aria-hidden="true" /> Rol del sistema: sus permisos no se cambian.</p>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                        <button type="button" onClick={() => { setEditando(rol); setAviso(''); setGuardadoId(null) }}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#B8CBEF] px-3 text-xs font-semibold text-[#0439D9]">
                          <Pencil size={14} aria-hidden="true" /> Editar permisos
                        </button>
                        <button type="button" onClick={() => void borrar(rol)}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#F1C4C9] px-3 text-xs font-semibold text-[#B91C1C]">
                          <Trash2 size={14} aria-hidden="true" /> Borrar
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            </>)}
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}
