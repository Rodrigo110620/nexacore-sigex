import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { BookCheck, CornerDownLeft, GraduationCap, LoaderCircle, Search, UserRound, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { navItemsFor } from '../navigation/navItems'
import { tienePermiso } from '../../utils/permisos'
import { contiene } from '../../utils/textoBusqueda'
import { getEstudiantes } from '../../services/estudianteService'
import { getUsers } from '../../services/userService'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import { formatFecha, horaCorta } from '../../utils/examenFormat'
import { EVENTO_ABRIR_BUSCADOR } from '../../utils/buscador'

interface Resultado {
  clave: string
  grupo: 'Pantallas' | 'Exámenes' | 'Estudiantes' | 'Usuarios'
  Icono: LucideIcon
  titulo: string
  detalle?: string
  ir: string
}


/**
 * Buscador rápido (Ctrl+K o ⌘K): pantallas del menú, exámenes, estudiantes y usuarios que el usuario puede
 * ver, con flechas y Enter. Cada grupo aparece solo si tiene permiso para verlo.
 */
export default function BuscadorGlobal() {
  const auth = useAuth()
  const navigate = useNavigate()
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [elegido, setElegido] = useState(0)
  const [examenes, setExamenes] = useState<ExamenDto[] | null>(null)
  const [remotos, setRemotos] = useState<{ texto: string; filas: Resultado[] } | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  const veExamenes = tienePermiso(auth, 'EXAMENES_VER_TODOS', 'EXAMENES_VER_PROPIOS', 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')
  const veEstudiantes = tienePermiso(auth, 'ESTUDIANTES_VER')
  const veUsuarios = tienePermiso(auth, 'USUARIOS_GESTIONAR')

  // Ctrl+K / ⌘K abre o cierra; también se abre con el evento (botón de la barra superior).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAbierto((a) => !a)
      }
    }
    const abrir = () => setAbierto(true)
    window.addEventListener('keydown', tecla)
    window.addEventListener(EVENTO_ABRIR_BUSCADOR, abrir)
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener(EVENTO_ABRIR_BUSCADOR, abrir) }
  }, [])

  useEffect(() => {
    if (!abierto) return
    const t = window.setTimeout(() => entrada.current?.focus(), 0)
    // Los exámenes se buscan en el navegador: se cargan una vez al abrir.
    if (veExamenes && examenes == null) listarExamenes().then(setExamenes).catch(() => setExamenes([]))
    return () => window.clearTimeout(t)
  }, [abierto, veExamenes, examenes])

  // Estudiantes y usuarios: en el servidor, con una pausa corta mientras se escribe.
  const consulta = texto.trim()
  useEffect(() => {
    if (!abierto || consulta.length < 2 || (!veEstudiantes && !veUsuarios)) return
    const control = new AbortController()
    const t = window.setTimeout(() => {
      void Promise.all([
        veEstudiantes ? getEstudiantes({ page: 0, size: 5, search: consulta, idFacultad: '', idCarrera: '' }, control.signal).then((p) => p.contenido).catch(() => []) : [],
        veUsuarios ? getUsers({ page: 0, size: 4, search: consulta }, control.signal).then((p) => p.contenido).catch(() => []) : [],
      ]).then(([est, usu]) => {
        if (control.signal.aborted) return
        setRemotos({ texto: consulta, filas: [
          ...est.map((e): Resultado => ({ clave: `e${e.id}`, grupo: 'Estudiantes', Icono: GraduationCap, titulo: `${e.nombre} ${e.apellidos}`,
            detalle: `SIS ${e.codigoSis}${e.carreras?.[0] ? ` · ${e.carreras[0].nombreCarrera ?? ''}` : ''}`, ir: `/dashboard/estudiantes?buscar=${encodeURIComponent(e.codigoSis)}` })),
          ...usu.map((u): Resultado => ({ clave: `u${u.id}`, grupo: 'Usuarios', Icono: UserRound, titulo: `${u.nombre} ${u.apellidos}`,
            detalle: `${u.rol} · ${u.email}`, ir: `/dashboard/usuarios?buscar=${encodeURIComponent(u.email)}` })),
        ] })
      })
    }, 250)
    return () => { window.clearTimeout(t); control.abort() }
  }, [abierto, consulta, veEstudiantes, veUsuarios])

  const resultados = useMemo(() => {
    const pantallas = navItemsFor(auth.roles, auth.permisos)
      .flatMap((n) => [{ label: n.label, to: n.to, icon: n.icon }, ...(n.hijos ?? []).map((h) => ({ label: h.titulo ?? h.label, to: h.to, icon: h.icon }))])
      .filter((p) => !consulta || contiene(p.label, consulta))
      .map((p): Resultado => ({ clave: `p${p.to}`, grupo: 'Pantallas', Icono: p.icon, titulo: p.label, ir: p.to }))
    const exs = !consulta ? [] : (examenes ?? [])
      .filter((e) => contiene(`${e.asignatura} ${e.sigla ?? ''} ${e.grupo ?? ''} ${e.ambienteNombre ?? ''}`, consulta))
      .slice(0, 5)
      .map((e): Resultado => ({ clave: `x${e.idExamen}-${e.idParalelo}`, grupo: 'Exámenes', Icono: BookCheck,
        titulo: `${e.asignatura}${e.grupo ? ` · ${e.grupo}` : ''}`, detalle: `${formatFecha(e.fecha)} · ${horaCorta(e.horaInicio)} · ${e.ambienteNombre ?? ''}`,
        ir: `/dashboard/examenes/${e.idExamen}/${e.idParalelo}` }))
    return [...pantallas.slice(0, consulta ? 6 : 10), ...exs, ...(remotos?.texto === consulta ? remotos.filas : [])]
  }, [auth.roles, auth.permisos, consulta, examenes, remotos])

  const cerrar = () => { setAbierto(false); setTexto(''); setElegido(0) }
  const ir = (r: Resultado) => { cerrar(); navigate(r.ir) }
  const actual = Math.min(elegido, Math.max(0, resultados.length - 1))
  const buscandoRemoto = consulta.length >= 2 && (veEstudiantes || veUsuarios) && remotos?.texto !== consulta

  if (!abierto) return null
  let grupoAnterior = ''
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[#011140]/45 p-3 pt-[10vh] backdrop-blur-[2px]" onClick={cerrar}>
      <div role="dialog" aria-modal="true" aria-label="Buscador rápido" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-[#EDF1F7] px-4">
          <Search size={18} className="shrink-0 text-[#8BA0BF]" aria-hidden="true" />
          <input ref={entrada} value={texto} onChange={(e) => { setTexto(e.target.value); setElegido(0) }}
            role="combobox" aria-expanded="true" aria-controls={`${id}-lista`} aria-activedescendant={resultados[actual] ? `${id}-${actual}` : undefined}
            aria-label="Buscar pantallas, exámenes, estudiantes o usuarios"
            placeholder={`Buscar pantallas${veExamenes ? ', exámenes' : ''}${veEstudiantes ? ', estudiantes' : ''}${veUsuarios ? ', usuarios' : ''}…`}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cerrar()
              else if (e.key === 'ArrowDown') { e.preventDefault(); setElegido((n) => Math.min(n + 1, resultados.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setElegido((n) => Math.max(n - 1, 0)) }
              else if (e.key === 'Enter' && resultados[actual]) ir(resultados[actual])
            }}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-[#011140] outline-none placeholder:text-[#8BA0BF]" />
          {buscandoRemoto && <LoaderCircle size={16} className="shrink-0 animate-spin text-[#0439D9]" aria-hidden="true" />}
          <button type="button" onClick={cerrar} aria-label="Cerrar el buscador" className="grid size-8 shrink-0 place-items-center rounded-md text-[#627A9B] hover:bg-[#F1F6FF]"><X size={16} aria-hidden="true" /></button>
        </div>
        <ul id={`${id}-lista`} role="listbox" aria-label="Resultados" className="min-h-0 flex-1 overflow-y-auto p-2">
          {resultados.length === 0 && !buscandoRemoto && (
            <li className="px-3 py-8 text-center text-sm text-[#627A9B]">Sin resultados para «{consulta}».</li>
          )}
          {resultados.map((r, i) => {
            const titulo = r.grupo !== grupoAnterior ? r.grupo : null
            grupoAnterior = r.grupo
            return (
              <li key={r.clave} role="presentation">
                {titulo && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-[#8BA0BF]">{titulo}</p>}
                <button type="button" id={`${id}-${i}`} role="option" aria-selected={i === actual} onMouseEnter={() => setElegido(i)} onClick={() => ir(r)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${i === actual ? 'bg-[#EDF2FE]' : ''}`}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><r.Icono size={16} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#011140]">{r.titulo}</span>
                    {r.detalle && <span className="block truncate text-xs text-[#627A9B]">{r.detalle}</span>}
                  </span>
                  {i === actual && <CornerDownLeft size={14} className="shrink-0 text-[#8BA0BF]" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="hidden border-t border-[#EDF1F7] px-4 py-2 text-[11px] text-[#8BA0BF] sm:block">
          <kbd className="rounded border px-1">↑</kbd> <kbd className="rounded border px-1">↓</kbd> para moverte · <kbd className="rounded border px-1">Enter</kbd> para abrir · <kbd className="rounded border px-1">Esc</kbd> para cerrar
        </p>
      </div>
    </div>,
    document.body,
  )
}
