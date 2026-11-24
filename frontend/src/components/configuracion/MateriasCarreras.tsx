import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, CircleAlert, CircleCheck, LoaderCircle, Pencil, Search, X } from 'lucide-react'
import { asignarCarreras, listarMateriasConCarreras, type MateriaConCarreras } from '../../services/materiaCarreraService'
import { getCarreras } from '../../services/estudianteService'
import type { CarreraOption } from '../../types/estudiante'
import { contiene } from '../../utils/textoBusqueda'

/**
 * Configuración → Materias (solo ADMIN, V63): a qué carreras pertenece cada materia. Así no se mezclan materias con
 * carreras que no les corresponden: a un examen no se agrega a mano un estudiante de otra carrera (los inscritos
 * oficialmente en el grupo sí rinden). Una materia sin carreras no restringe a nadie.
 */
export default function MateriasCarreras() {
  const [materias, setMaterias] = useState<MateriaConCarreras[] | null>(null)
  const [carreras, setCarreras] = useState<CarreraOption[]>([])
  const [buscar, setBuscar] = useState('')
  const [editando, setEditando] = useState<MateriaConCarreras | null>(null)
  const [elegidas, setElegidas] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)

  const cargar = useCallback(() => {
    listarMateriasConCarreras().then(setMaterias)
      .catch(() => setAviso({ ok: false, texto: 'No se pudieron cargar las materias.' }))
  }, [])
  useEffect(() => {
    cargar()
    getCarreras().then(setCarreras).catch(() => undefined)
  }, [cargar])

  const visibles = useMemo(() => (materias ?? []).filter((m) =>
    !buscar.trim() || contiene(`${m.nombre} ${m.sigla ?? ''} ${m.carreras.map((c) => c.nombre).join(' ')}`, buscar)), [materias, buscar])
  const sinCarreras = (materias ?? []).filter((m) => m.carreras.length === 0).length

  const abrir = (m: MateriaConCarreras) => {
    setEditando(m)
    setElegidas(new Set(m.carreras.map((c) => c.idCarrera)))
    setAviso(null)
  }

  const alternar = (id: number) => setElegidas((actual) => {
    const nuevo = new Set(actual)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    return nuevo
  })

  const guardar = async () => {
    if (!editando) return
    setGuardando(true)
    try {
      await asignarCarreras(editando.idMateria, [...elegidas])
      setAviso({ ok: true, texto: `${editando.nombre}: carreras guardadas.` })
      setEditando(null)
      cargar()
    } catch {
      setAviso({ ok: false, texto: 'No se pudieron guardar las carreras. Revisa tu conexión e intenta de nuevo.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#011140]">Materias y carreras</h2>
        <p className="text-sm text-[#627A9B]">
          A qué carreras pertenece cada materia (una materia común, como Cálculo I, puede ser de varias). Un estudiante de
          otra carrera no se puede agregar a mano a sus exámenes; los inscritos oficialmente en el grupo sí rinden.
        </p>
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
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#45628D]" aria-hidden="true" />
          <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar materia o carrera"
            placeholder="Buscar materia o carrera…"
            className="h-10 w-full rounded-lg border border-[#B8CBEF] bg-white pl-9 pr-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/30" />
        </div>
        {materias === null ? (
          <p className="flex items-center gap-2 text-sm text-[#627A9B]"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#627A9B]">No hay materias que coincidan.</p>
        ) : (
          <ul className="divide-y divide-[#EEF2F8]">
            {visibles.map((m) => (
              <li key={m.idMateria} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <BookOpen size={18} className="mt-0.5 shrink-0 text-[#45628D]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#011140]">{m.nombre} {m.sigla && <span className="font-normal text-[#627A9B]">· {m.sigla}</span>}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.carreras.length === 0
                        ? <span className="text-xs text-[#B45309]">Sin carreras definidas</span>
                        : m.carreras.map((c) => (
                          <span key={c.idCarrera} className="rounded-full bg-[#EDF2FE] px-2 py-0.5 text-[11px] font-semibold text-[#1E3A8A]">{c.nombre}</span>
                        ))}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => abrir(m)} aria-label={`Editar las carreras de ${m.nombre}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#B8CBEF] px-3 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
                  <Pencil size={14} aria-hidden="true" /> Carreras
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#011140]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="materia-carreras-titulo">
          <section className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <header className="flex items-start justify-between gap-3 border-b border-[#E6EAF0] p-4">
              <div>
                <h3 id="materia-carreras-titulo" className="text-base font-bold text-[#011140]">Carreras de {editando.nombre}</h3>
                <p className="text-xs text-[#627A9B]">Marca todas las carreras que llevan esta materia. Sin ninguna marcada, no restringe.</p>
              </div>
              <button type="button" onClick={() => setEditando(null)} aria-label="Cerrar" className="rounded-lg p-1 text-[#45628D] hover:bg-[#F1F6FF]"><X size={18} /></button>
            </header>
            <ul className="flex-1 overflow-y-auto p-4">
              {carreras.map((c) => (
                <li key={c.idCarrera}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-[#011140] hover:bg-[#F8FAFF]">
                    <input type="checkbox" checked={elegidas.has(c.idCarrera)} onChange={() => alternar(c.idCarrera)} />
                    {c.nombre} <span className="text-xs text-[#8BA0BF]">· {c.nombreFacultad}</span>
                  </label>
                </li>
              ))}
            </ul>
            <footer className="flex justify-end gap-2 border-t border-[#E6EAF0] p-4">
              <button type="button" onClick={() => setEditando(null)} className="min-h-10 rounded-lg border border-[#D8E3F5] px-4 text-sm font-semibold text-[#45628D]">Cancelar</button>
              <button type="button" onClick={() => void guardar()} disabled={guardando}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0027a2] disabled:opacity-50">
                {guardando && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />} Guardar ({elegidas.size})
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
