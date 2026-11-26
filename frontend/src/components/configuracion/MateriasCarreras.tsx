import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, CircleAlert, CircleCheck, FileUp, LoaderCircle, Pencil, Plus, Power, Search } from 'lucide-react'
import {
  cambiarEstadoMateria, listarMateriasConCarreras, type MateriaConCarreras,
} from '../../services/materiaCarreraService'
import { listarPeriodos } from '../../services/periodoService'
import { getCarreras } from '../../services/estudianteService'
import type { CarreraOption } from '../../types/estudiante'
import { contiene } from '../../utils/textoBusqueda'
import MateriaFormModal from './MateriaFormModal'
import ImportarMateriasModal from './ImportarMateriasModal'

type Vista = 'periodo' | 'todas' | 'inactivas'

function mensajeDe(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string> } } }).response?.data
  return data?.errores ? Object.values(data.errores)[0] : data?.mensaje ?? porDefecto
}

/**
 * Configuración → Materias (solo ADMIN). El catálogo es general (la misma materia todos los semestres): aquí se crean,
 * editan, importan y desactivan materias y se marcan sus carreras. La oferta de cada semestre son los grupos del
 * periodo activo, que se asignan a cada docente en Usuarios.
 */
export default function MateriasCarreras() {
  const [materias, setMaterias] = useState<MateriaConCarreras[] | null>(null)
  const [carreras, setCarreras] = useState<CarreraOption[]>([])
  const [periodo, setPeriodo] = useState('')
  const [vista, setVista] = useState<Vista>('todas')
  const [buscar, setBuscar] = useState('')
  const [facultad, setFacultad] = useState('')
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  // Formulario: undefined cerrado; null nueva materia; una materia: editarla.
  const [formulario, setFormulario] = useState<MateriaConCarreras | null | undefined>(undefined)
  const [verImportar, setVerImportar] = useState(false)

  const cargar = useCallback(() => {
    listarMateriasConCarreras().then(setMaterias)
      .catch(() => setAviso({ ok: false, texto: 'No se pudieron cargar las materias.' }))
  }, [])
  useEffect(() => {
    cargar()
    getCarreras().then(setCarreras).catch(() => undefined)
    listarPeriodos().then((l) => setPeriodo(l.find((p) => p.activo)?.nombre ?? '')).catch(() => undefined)
  }, [cargar])

  const facultadDe = useMemo(() => new Map(carreras.map((c) => [c.idCarrera, c.nombreFacultad])), [carreras])
  const facultades = useMemo(() => [...new Set(carreras.map((c) => c.nombreFacultad))].sort((a, b) => a.localeCompare(b, 'es')), [carreras])

  const conteo = useMemo(() => ({
    periodo: (materias ?? []).filter((m) => m.activa && m.gruposEnPeriodo > 0).length,
    todas: (materias ?? []).filter((m) => m.activa).length,
    inactivas: (materias ?? []).filter((m) => !m.activa).length,
  }), [materias])

  const visibles = useMemo(() => (materias ?? [])
    .filter((m) => vista === 'inactivas' ? !m.activa : m.activa && (vista === 'todas' || m.gruposEnPeriodo > 0))
    .filter((m) => !facultad || m.carreras.some((c) => facultadDe.get(c.idCarrera) === facultad))
    .filter((m) => !buscar.trim() || contiene(`${m.nombre} ${m.sigla ?? ''} ${m.carreras.map((c) => c.nombre).join(' ')}`, buscar)),
  [materias, vista, buscar, facultad, facultadDe])
  const sinCarreras = (materias ?? []).filter((m) => m.activa && m.carreras.length === 0).length
  const provisionales = (materias ?? []).filter((m) => m.activa && m.siglaProvisional).length








  const abrirNueva = () => { setFormulario(null); setAviso(null) }
  const abrirEditar = (m: MateriaConCarreras) => { setFormulario(m); setAviso(null) }

  const cambiarEstado = async (m: MateriaConCarreras) => {
    const activar = !m.activa
    if (!activar && !window.confirm(`¿Desactivar ${m.nombre}? Ya no se podrá elegir para nuevos exámenes ni asignar a docentes. Sus exámenes anteriores se conservan.`)) return
    try {
      await cambiarEstadoMateria(m.idMateria, activar)
      setAviso({ ok: true, texto: `${m.nombre} ${activar ? 'activada' : 'desactivada'}.` })
      cargar()
    } catch (err) {
      setAviso({ ok: false, texto: mensajeDe(err, 'No se pudo cambiar el estado de la materia.') })
    }
  }



  const campo = 'h-11 w-full rounded-lg border border-[#B8CBEF] bg-white px-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/30'
  const pestanas: [Vista, string][] = [['todas', 'Activas'], ['periodo', periodo || 'Del periodo'], ['inactivas', 'Desactivadas']]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#011140]">Materias</h2>
          <p className="text-sm text-[#627A9B]">Catálogo de materias y sus carreras. Los grupos de cada semestre se asignan en Usuarios.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button type="button" onClick={() => setVerImportar(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#B8CBEF] bg-white px-3 text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
            <FileUp size={16} aria-hidden="true" /> Importar
          </button>
          <button type="button" onClick={abrirNueva}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0027a2]">
            <Plus size={16} aria-hidden="true" /> Nueva materia
          </button>
        </div>
      </div>

      {aviso && (
        <p role={aviso.ok ? 'status' : 'alert'}
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${aviso.ok ? 'bg-[#ECFDF3] text-[#05603A]' : 'bg-[#FEF3F2] text-[#B42318]'}`}>
          {aviso.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
          {aviso.texto}
        </p>
      )}
      {provisionales > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-[#FFFAEB] px-3 py-2 text-xs text-[#7A2E0E]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {provisionales === 1 ? '1 materia tiene' : `${provisionales} materias tienen`} una sigla provisional sugerida por SIGEX: reemplázala por la sigla oficial del plan de estudios con «Editar».
        </p>
      )}
      {sinCarreras > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-[#FFFAEB] px-3 py-2 text-xs text-[#7A2E0E]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {sinCarreras === 1 ? '1 materia no tiene' : `${sinCarreras} materias no tienen`} carreras definidas: por ahora no restringen a nadie.
        </p>
      )}

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#D8E3F5]">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <div role="tablist" aria-label="Materias" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0">
            {pestanas.map(([id, texto]) => (
              <button key={id} type="button" role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${vista === id ? 'bg-[#0439D9] text-white' : 'border border-[#D8E3F5] text-[#45628D] hover:bg-[#F1F6FF]'}`}>
                {texto}
                <span className={`rounded-full px-1.5 tabular-nums ${vista === id ? 'bg-white/20' : 'bg-[#EDF2FE]'}`}>{conteo[id]}</span>
              </button>
            ))}
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_14rem]">
            <div className="relative min-w-0">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#45628D]" aria-hidden="true" />
              <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar materia o carrera"
                placeholder="Buscar materia, sigla o carrera…" className={`${campo} h-10 pl-9`} />
            </div>
            <select value={facultad} onChange={(e) => setFacultad(e.target.value)} aria-label="Filtrar por facultad" className={`${campo} h-10 truncate`}>
              <option value="">Todas las facultades</option>
              {facultades.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        {materias === null ? (
          <p className="flex items-center gap-2 text-sm text-[#627A9B]"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#627A9B]">
            {vista === 'periodo' ? `Ninguna materia tiene grupos en ${periodo || 'el periodo activo'}. Asigna los grupos a cada docente en Usuarios.`
              : vista === 'inactivas' ? 'No hay materias desactivadas.' : 'No hay materias que coincidan.'}
          </p>
        ) : (
          <ul className="divide-y divide-[#EEF2F8]">
            {visibles.map((m) => (
              <li key={m.idMateria} className="flex items-start justify-between gap-2 py-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <BookOpen size={18} className={`mt-0.5 shrink-0 ${m.activa ? 'text-[#45628D]' : 'text-[#B8C4D4]'}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${m.activa ? 'text-[#011140]' : 'text-[#8BA0BF]'}`}>
                      {m.nombre} {m.sigla && <span className="font-normal text-[#627A9B]">· {m.sigla}</span>}
                      {m.siglaProvisional && <span className="ml-2 rounded-full bg-[#FEF0C7] px-2 py-0.5 text-[11px] font-semibold text-[#93370D]" title="Sugerida por SIGEX: reemplázala por la oficial">Sigla provisional</span>}
                      {!m.activa && <span className="ml-2 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">Desactivada</span>}
                    </p>
                    <p className="text-xs text-[#627A9B]">
                      {m.gruposEnPeriodo > 0
                        ? `${periodo}: ${m.gruposEnPeriodo} ${m.gruposEnPeriodo === 1 ? 'grupo' : 'grupos'} · ${m.docentesEnPeriodo} ${m.docentesEnPeriodo === 1 ? 'docente' : 'docentes'}`
                        : `Sin grupos en ${periodo || 'el periodo activo'}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.carreras.length === 0
                        ? <span className="text-xs text-[#B45309]">Sin carreras definidas</span>
                        : m.carreras.map((c) => (
                          <span key={c.idCarrera} className="rounded-full bg-[#EDF2FE] px-2 py-0.5 text-[11px] font-semibold text-[#1E3A8A]">{c.nombre}</span>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => abrirEditar(m)} aria-label={`Editar ${m.nombre}`} title="Editar"
                    className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-[#B8CBEF] px-2 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF] sm:px-3">
                    <Pencil size={14} aria-hidden="true" /> <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button type="button" onClick={() => void cambiarEstado(m)} aria-label={`${m.activa ? 'Desactivar' : 'Activar'} ${m.nombre}`}
                    title={m.activa ? 'Desactivar' : 'Activar'}
                    className={`inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold sm:px-3 ${m.activa ? 'border-[#FDA29B] text-[#B42318] hover:bg-[#FEF3F2]' : 'border-[#A6F4C5] text-[#05603A] hover:bg-[#ECFDF3]'}`}>
                    <Power size={14} aria-hidden="true" /> <span className="hidden sm:inline">{m.activa ? 'Desactivar' : 'Activar'}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {formulario !== undefined && (
        <MateriaFormModal materia={formulario} carreras={carreras} onClose={() => setFormulario(undefined)}
          onGuardada={(m) => {
            setAviso({ ok: true, texto: `${m.nombre} (${m.sigla}) ${formulario === null ? 'registrada' : 'guardada'}.`
              + (m.siglaProvisional ? ' La sigla es provisional: reemplázala por la oficial cuando la tengas.' : '') })
            setFormulario(undefined)
            cargar()
          }} />
      )}

      {verImportar && <ImportarMateriasModal onClose={() => setVerImportar(false)} onImportado={cargar} />}
    </div>
  )
}
