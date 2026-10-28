import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Lock, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import {
  actualizarRol, crearRolConPermisos, eliminarRol, listarPermisos, listarRolesConPermisos,
  type PermisoCatalogo, type RolConPermisos,
} from '../../services/rolesService'

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

  // Al abrirse, se muestra y enfoca en su lugar (dentro de la tarjeta del rol que se edita).
  useEffect(() => {
    const el = seccion.current
    if (!el) return
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView?.({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
    el.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true })
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
    <section ref={seccion} aria-label={rol ? `Editar el rol ${rol.nombre}` : 'Nuevo rol'}
      className="scroll-mt-4 rounded-xl border border-[#B8CBEF] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#011140]">{rol ? `Editar ${rol.nombre}` : 'Nuevo rol'}</h2>
        <button type="button" onClick={onCancelar} aria-label="Cerrar formulario" className="rounded-full p-1.5 text-[#627A9B] hover:bg-[#F1F6FF]"><X size={16} /></button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#011140]">
          Nombre del rol
          <input value={nombre} disabled={!!rol} maxLength={30} placeholder="Ej.: AUXILIAR"
            onChange={(e) => { setNombre(e.target.value.toUpperCase().replace(/[^A-Z_]/g, '')); setError('') }}
            className="mt-1 h-11 w-full rounded-lg border border-[#B8CBEF] px-3 text-sm outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#0439D9]/20 uppercase text-[#011140] disabled:bg-[#F1F5F9]" />
        </label>
        <label className="text-xs font-semibold text-[#011140]">
          Descripción
          <input value={descripcion} maxLength={200} placeholder="Ej.: apoya al control en la puerta del aula"
            onChange={(e) => { setDescripcion(e.target.value); setError('') }}
            className="mt-1 h-11 w-full rounded-lg border border-[#B8CBEF] px-3 text-sm outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#0439D9]/20 text-[#011140]" />
        </label>
      </div>
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
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button type="button" onClick={onCancelar} className="min-h-11 rounded-lg border border-[#D8E3F5] px-4 text-sm font-semibold text-[#45628D]">Cancelar</button>
        <button type="button" disabled={guardando} onClick={() => void guardar()}
          className="min-h-11 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {guardando ? 'Guardando…' : rol ? 'Guardar cambios' : 'Crear rol'}
        </button>
      </div>
    </section>
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

  return (
    <PanelLayout compactDesktop>
      <div className="min-h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FBFF 28%, #E9F1FF 65%, #DCE9FF 100%)' }}>
        <section aria-labelledby="configuracion-titulo" className="px-3 py-4 sm:px-6 min-[960px]:px-4 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <h1 id="configuracion-titulo" className="sr-only">Configuración</h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#011140]">Roles y permisos</h2>
                <p className="text-sm text-[#627A9B]">
                  ADMIN, DOCENTE y CONTROL son del sistema y no cambian. Crea roles extra, como un auxiliar, con los permisos que necesite.
                </p>
              </div>
              {editando === null && (
                <button type="button" onClick={() => { setEditando('nuevo'); setAviso('') }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white sm:w-auto">
                  <Plus size={16} aria-hidden="true" /> Nuevo rol
                </button>
              )}
            </div>

            {aviso && <p role="status" className="mt-3 rounded-lg bg-[#EEF3FF] p-3 text-sm text-[#334E7A]">{aviso}</p>}
            {editando === 'nuevo' && (
              <div className="mt-4">
                <FormularioRol key="nuevo" rol={null} catalogo={catalogo} onCancelar={() => setEditando(null)}
                  onGuardado={() => { setAviso('Rol creado. Ya puedes asignarlo en Usuarios.'); setEditando(null); setRecarga((n) => n + 1) }} />
              </div>
            )}

            {error && <p role="alert" className="mt-4 text-sm text-[#B91C1C]">{error}</p>}
            {!roles && !error && <p role="status" className="mt-4 text-sm text-[#627A9B]">Cargando roles…</p>}
            {roles && (
              <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                {roles.map((rol) => editando !== null && editando !== 'nuevo' && editando.id === rol.id ? (
                  <li key={rol.id} className="lg:col-span-2">
                    <FormularioRol rol={rol} catalogo={catalogo} onCancelar={() => setEditando(null)}
                      onGuardado={() => { setAviso(''); setGuardadoId(rol.id); setEditando(null); setRecarga((n) => n + 1) }} />
                  </li>
                ) : (
                  <li key={rol.id} className="rounded-xl border border-[#D8E3F5] bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldCheck size={18} className={rol.delSistema ? 'text-[#0439D9]' : 'text-[#15803D]'} aria-hidden="true" />
                      <h3 className="text-sm font-bold text-[#011140]">{rol.nombre}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rol.delSistema ? 'bg-[#EEF3FF] text-[#0439D9]' : 'bg-[#ECFDF3] text-[#15803D]'}`}>
                        {rol.delSistema ? 'Del sistema' : 'Rol extra'}
                      </span>
                      {guardadoId === rol.id && (
                        <span role="status" className="rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">✓ Cambios guardados</span>
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
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}
