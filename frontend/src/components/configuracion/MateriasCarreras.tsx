import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, CircleAlert, CircleCheck, FileUp, LoaderCircle, Pencil, Plus, Power, Search, X } from 'lucide-react'
import {
  cambiarEstadoMateria, crearMateria, editarMateria, importarMaterias, listarMateriasConCarreras,
  type ImportacionMaterias, type MateriaConCarreras,
} from '../../services/materiaCarreraService'
import { listarPeriodos } from '../../services/periodoService'
import { getCarreras } from '../../services/estudianteService'
import type { CarreraOption } from '../../types/estudiante'
import { contiene } from '../../utils/textoBusqueda'

type Vista = 'periodo' | 'todas' | 'inactivas'
const SIGLA = /^[A-Za-z0-9][A-Za-z0-9-]{1,14}$/

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
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  // Formulario de alta o edición (null: cerrado; idMateria null: nueva).
  const [form, setForm] = useState<{ idMateria: number | null; sigla: string; nombre: string; carreras: Set<number> } | null>(null)
  const [errorForm, setErrorForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ImportacionMaterias | null>(null)
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

  const conteo = useMemo(() => ({
    periodo: (materias ?? []).filter((m) => m.activa && m.gruposEnPeriodo > 0).length,
    todas: (materias ?? []).filter((m) => m.activa).length,
    inactivas: (materias ?? []).filter((m) => !m.activa).length,
  }), [materias])

  const visibles = useMemo(() => (materias ?? [])
    .filter((m) => vista === 'inactivas' ? !m.activa : m.activa && (vista === 'todas' || m.gruposEnPeriodo > 0))
    .filter((m) => !buscar.trim() || contiene(`${m.nombre} ${m.sigla ?? ''} ${m.carreras.map((c) => c.nombre).join(' ')}`, buscar)),
  [materias, vista, buscar])
  const sinCarreras = (materias ?? []).filter((m) => m.activa && m.carreras.length === 0).length

  const abrirNueva = () => { setForm({ idMateria: null, sigla: '', nombre: '', carreras: new Set() }); setErrorForm(''); setAviso(null) }
  const abrirEditar = (m: MateriaConCarreras) => {
    setForm({ idMateria: m.idMateria, sigla: m.sigla ?? '', nombre: m.nombre, carreras: new Set(m.carreras.map((c) => c.idCarrera)) })
    setErrorForm(''); setAviso(null)
  }
  const alternarCarrera = (id: number) => setForm((f) => {
    if (!f) return f
    const nuevo = new Set(f.carreras)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    return { ...f, carreras: nuevo }
  })

  const validarForm = (): string => {
    if (!form) return ''
    if (!form.sigla.trim()) return 'La sigla es obligatoria.'
    if (!SIGLA.test(form.sigla.trim())) return 'La sigla debe tener de 2 a 15 letras, números o guiones (p. ej. 2010017 o INF-112).'
    if (form.nombre.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.'
    return ''
  }

  const guardar = async () => {
    if (!form || guardando) return
    const error = validarForm()
    if (error) { setErrorForm(error); return }
    setGuardando(true)
    try {
      const payload = { sigla: form.sigla.trim(), nombre: form.nombre.trim(), idsCarrera: [...form.carreras] }
      const m = form.idMateria === null ? await crearMateria(payload) : await editarMateria(form.idMateria, payload)
      setAviso({ ok: true, texto: `${m.nombre} (${m.sigla}) ${form.idMateria === null ? 'creada' : 'guardada'}.` })
      setForm(null)
      cargar()
    } catch (err) {
      setErrorForm(mensajeDe(err, 'No se pudo guardar la materia. Revisa tu conexión e intenta de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

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

  const importar = async (archivo: File | undefined) => {
    if (!archivo) return
    setImportando(true)
    setResultado(null)
    try {
      const r = await importarMaterias(archivo)
      setResultado(r)
      cargar()
    } catch (err) {
      setResultado({ creadas: 0, existentes: [], errores: [mensajeDe(err, 'No se pudo importar el archivo.')] })
    } finally {
      setImportando(false)
    }
  }

  const campo = 'h-11 w-full rounded-lg border border-[#B8CBEF] bg-white px-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/30'
  const pestanas: [Vista, string][] = [['todas', 'Activas'], ['periodo', `Ofertadas en ${periodo || 'el periodo'}`], ['inactivas', 'Desactivadas']]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#011140]">Materias</h2>
          <p className="max-w-3xl text-sm text-[#627A9B]">
            El catálogo es el mismo todos los semestres. Lo que cambia por periodo es la oferta: los grupos de cada
            materia y su docente, que se asignan en Usuarios. Una materia desactivada ya no se ofrece, pero conserva su historial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setVerImportar(true); setResultado(null) }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#B8CBEF] bg-white px-3 text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
            <FileUp size={16} aria-hidden="true" /> Importar
          </button>
          <button type="button" onClick={abrirNueva}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0027a2]">
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
      {sinCarreras > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-[#FFFAEB] px-3 py-2 text-xs text-[#7A2E0E]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {sinCarreras === 1 ? '1 materia no tiene' : `${sinCarreras} materias no tienen`} carreras definidas: por ahora no restringen a nadie.
        </p>
      )}

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#D8E3F5]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Materias" className="flex flex-wrap gap-1.5">
            {pestanas.map(([id, texto]) => (
              <button key={id} type="button" role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${vista === id ? 'bg-[#0439D9] text-white' : 'border border-[#D8E3F5] text-[#45628D] hover:bg-[#F1F6FF]'}`}>
                {texto}
                <span className={`rounded-full px-1.5 tabular-nums ${vista === id ? 'bg-white/20' : 'bg-[#EDF2FE]'}`}>{conteo[id]}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 basis-56">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#45628D]" aria-hidden="true" />
            <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar materia o carrera"
              placeholder="Buscar materia, sigla o carrera…" className={`${campo} h-10 pl-9`} />
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
              <li key={m.idMateria} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <BookOpen size={18} className={`mt-0.5 shrink-0 ${m.activa ? 'text-[#45628D]' : 'text-[#B8C4D4]'}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${m.activa ? 'text-[#011140]' : 'text-[#8BA0BF]'}`}>
                      {m.nombre} {m.sigla && <span className="font-normal text-[#627A9B]">· {m.sigla}</span>}
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
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => abrirEditar(m)} aria-label={`Editar ${m.nombre}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#B8CBEF] px-3 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
                    <Pencil size={14} aria-hidden="true" /> Editar
                  </button>
                  <button type="button" onClick={() => void cambiarEstado(m)} aria-label={`${m.activa ? 'Desactivar' : 'Activar'} ${m.nombre}`}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${m.activa ? 'text-[#B42318] hover:bg-[#FEF3F2]' : 'text-[#05603A] hover:bg-[#ECFDF3]'}`}>
                    <Power size={14} aria-hidden="true" /> {m.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#011140]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="materia-form-titulo">
          <section className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <header className="flex items-start justify-between gap-3 border-b border-[#E6EAF0] p-4">
              <div>
                <h3 id="materia-form-titulo" className="text-base font-bold text-[#011140]">{form.idMateria === null ? 'Nueva materia' : `Editar ${form.nombre}`}</h3>
                <p className="text-xs text-[#627A9B]">Usa la sigla y el nombre del plan de estudios. Marca todas las carreras que la llevan.</p>
              </div>
              <button type="button" onClick={() => setForm(null)} aria-label="Cerrar" className="rounded-lg p-1 text-[#45628D] hover:bg-[#F1F6FF]"><X size={18} /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
                <div>
                  <label htmlFor="materia-sigla" className="mb-1 block text-xs font-medium text-[#011140]">Sigla</label>
                  <input id="materia-sigla" value={form.sigla} maxLength={15} placeholder="2010017"
                    onChange={(e) => setForm({ ...form, sigla: e.target.value })} className={campo} />
                </div>
                <div>
                  <label htmlFor="materia-nombre" className="mb-1 block text-xs font-medium text-[#011140]">Nombre</label>
                  <input id="materia-nombre" value={form.nombre} maxLength={100} placeholder="Base de Datos I"
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={campo} />
                </div>
              </div>
              <fieldset>
                <legend className="mb-1 text-xs font-medium text-[#011140]">Carreras ({form.carreras.size})</legend>
                <ul className="max-h-60 overflow-y-auto rounded-lg border border-[#E6EAF0] p-1">
                  {carreras.map((c) => (
                    <li key={c.idCarrera}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-[#011140] hover:bg-[#F8FAFF]">
                        <input type="checkbox" checked={form.carreras.has(c.idCarrera)} onChange={() => alternarCarrera(c.idCarrera)} />
                        {c.nombre} <span className="text-xs text-[#8BA0BF]">· {c.nombreFacultad}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              {errorForm && <p role="alert" className="text-xs text-[#B42318]">{errorForm}</p>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-[#E6EAF0] p-4">
              <button type="button" onClick={() => setForm(null)} className="min-h-10 rounded-lg border border-[#D8E3F5] px-4 text-sm font-semibold text-[#45628D]">Cancelar</button>
              <button type="button" onClick={() => void guardar()} disabled={guardando}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0027a2] disabled:opacity-50">
                {guardando && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
                {form.idMateria === null ? 'Crear materia' : 'Guardar'}
              </button>
            </footer>
          </section>
        </div>
      )}

      {verImportar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#011140]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="materia-importar-titulo">
          <section className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <header className="flex items-start justify-between gap-3 border-b border-[#E6EAF0] p-4">
              <div>
                <h3 id="materia-importar-titulo" className="text-base font-bold text-[#011140]">Importar materias</h3>
                <p className="text-xs text-[#627A9B]">Un archivo CSV con una materia por fila. Las siglas que ya existen no se modifican.</p>
              </div>
              <button type="button" onClick={() => setVerImportar(false)} aria-label="Cerrar" className="rounded-lg p-1 text-[#45628D] hover:bg-[#F1F6FF]"><X size={18} /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              <div className="rounded-lg bg-[#F8FAFF] p-3 text-xs text-[#45628D]">
                <p className="font-semibold text-[#011140]">Formato</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre font-mono text-[11px] text-[#011140]">{`sigla;nombre;carreras
2010017;Base de Datos I;Ingeniería de Sistemas|Ingeniería Informática
2008019;Cálculo I;Ingeniería de Sistemas|Ingeniería Civil`}</pre>
                <p className="mt-1">Las carreras van por nombre (o código) y separadas por «|». Si no pones carreras, la materia no restringe.</p>
              </div>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#B8CBEF] p-5 text-center hover:bg-[#F8FAFF]">
                {importando ? <LoaderCircle size={22} className="animate-spin text-[#0439D9]" aria-hidden="true" /> : <FileUp size={22} className="text-[#0439D9]" aria-hidden="true" />}
                <span className="font-semibold text-[#0439D9]">{importando ? 'Importando…' : 'Elegir archivo CSV'}</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" disabled={importando}
                  onChange={(e) => { void importar(e.target.files?.[0]); e.target.value = '' }} />
              </label>
              {resultado && (
                <div role="status" className="space-y-1.5">
                  <p className="font-semibold text-[#05603A]">{resultado.creadas === 1 ? '1 materia creada' : `${resultado.creadas} materias creadas`}.</p>
                  {resultado.existentes.length > 0 && <p className="text-xs text-[#45628D]">Ya existían (no se tocaron): {resultado.existentes.join(', ')}</p>}
                  {resultado.errores.length > 0 && (
                    <ul className="max-h-40 list-inside list-disc overflow-y-auto rounded-lg bg-[#FEF3F2] p-2 text-xs text-[#B42318]">
                      {resultado.errores.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
