import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Building2, LoaderCircle, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import MobileBottomNav from '../../components/navigation/MobileBottomNav'
import { useAuth } from '../../context/AuthContext'
import { getFacultades } from '../../services/estudianteService'
import { listarExamenes, type ExamenDto } from '../../services/examenService'
import type { FacultadOption } from '../../types/estudiante'

/** Punto de entrada del docente: permite elegir un grupo propio antes de ir a sus exámenes. */
export default function InicioDocentePage() {
  const { nombre } = useAuth()
  const navigate = useNavigate()
  const [facultades, setFacultades] = useState<FacultadOption[]>([])
  const [examenes, setExamenes] = useState<ExamenDto[]>([])
  const [idFacultad, setIdFacultad] = useState('')
  const [asignatura, setAsignatura] = useState('')
  const [grupo, setGrupo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    Promise.all([getFacultades(), listarExamenes()])
      .then(([listaFacultades, listaExamenes]) => {
        if (!vigente) return
        setFacultades(listaFacultades)
        setIdFacultad(String(listaFacultades[0]?.id ?? ''))
        setExamenes(listaExamenes.filter((examen) => examen.estado?.toLowerCase() !== 'cancelado'))
      })
      .catch(() => {
        if (vigente) setError('No se pudieron cargar tus grupos. Intenta nuevamente desde Exámenes.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => { vigente = false }
  }, [])

  const materias = useMemo(() => {
    const unicas = new Map<string, string>()
    examenes.forEach((examen) => unicas.set(examen.asignatura, examen.sigla ? `${examen.asignatura} (${examen.sigla})` : examen.asignatura))
    return [...unicas.entries()].map(([valor, etiqueta]) => ({ valor, etiqueta })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta))
  }, [examenes])

  const grupos = useMemo(
    () => [...new Map(examenes
      .filter((examen) => asignatura && examen.asignatura === asignatura)
      .map((examen) => [examen.idParalelo, examen])).values()],
    [asignatura, examenes],
  )

  const seleccionarMateria = (valor: string) => {
    setAsignatura(valor)
    setGrupo('')
  }

  const irAMisExamenes = () => {
    if (!grupo) return
    navigate(`/dashboard/examenes?paralelo=${encodeURIComponent(grupo)}`)
  }

  return (
    <PanelLayout
      compactDesktop
      title={`Bienvenido${nombre ? `, ${nombre}` : ''}`}
      description="Administra, controla exámenes y revisa reportes estadísticos."
    >
      <div className="min-h-full bg-[#F8FAFC] px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 min-[960px]:px-6 min-[960px]:py-5 min-[960px]:pb-8 xl:px-8">
        <section aria-labelledby="docente-grupo-title" className="mx-auto max-w-6xl rounded-xl border border-[#D8E3F5] bg-white p-4 shadow-sm sm:p-5">
          <h1 id="docente-grupo-title" className="text-xl font-extrabold tracking-tight text-[#011140]">¿Qué grupo deseas gestionar hoy?</h1>
          <p className="mt-1 text-xs text-[#627A9B]">Selecciona la facultad, materia y grupo para registrar y revisar detalles de exámenes.</p>

          {cargando ? (
            <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#627A9B]">
              <LoaderCircle className="animate-spin text-[#0439D9]" size={20} aria-hidden="true" />
              Cargando tus grupos…
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <SelectorCard icon={<Building2 size={16} />} label="1. Facultad">
                  <select value={idFacultad} onChange={(event) => setIdFacultad(event.target.value)} aria-label="Facultad" className="h-10 w-full rounded-md border border-[#D8E3F5] bg-white px-3 text-sm text-[#011140] outline-none focus:ring-2 focus:ring-[#0439D9]">
                    {facultades.length === 0 ? <option value="">Sin facultades disponibles</option> : facultades.map((facultad) => <option key={facultad.id} value={facultad.id}>{facultad.nombre}</option>)}
                  </select>
                </SelectorCard>
                <SelectorCard icon={<BookOpen size={16} />} label="2. Materia">
                  <select value={asignatura} onChange={(event) => seleccionarMateria(event.target.value)} aria-label="Materia" className="h-10 w-full rounded-md border border-[#D8E3F5] bg-white px-3 text-sm text-[#011140] outline-none focus:ring-2 focus:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-slate-100" disabled={materias.length === 0}>
                    <option value="">{materias.length === 0 ? 'Sin materias asignadas' : 'Selecciona una materia'}</option>
                    {materias.map((materia) => <option key={materia.valor} value={materia.valor}>{materia.etiqueta}</option>)}
                  </select>
                </SelectorCard>
                <SelectorCard icon={<UsersRound size={16} />} label="3. Grupo">
                  <select value={grupo} onChange={(event) => setGrupo(event.target.value)} aria-label="Grupo" className="h-10 w-full rounded-md border border-[#D8E3F5] bg-white px-3 text-sm text-[#011140] outline-none focus:ring-2 focus:ring-[#0439D9] disabled:cursor-not-allowed disabled:bg-slate-100" disabled={grupos.length === 0}>
                    <option value="">{grupos.length === 0 ? 'Sin grupos disponibles' : 'Selecciona un grupo'}</option>
                    {grupos.map((examen) => <option key={`${examen.idExamen}-${examen.idParalelo}`} value={examen.idParalelo}>Grupo {examen.idParalelo}</option>)}
                  </select>
                </SelectorCard>
              </div>

              {error && <p role="alert" className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">{error}</p>}
              {!error && examenes.length === 0 && <p className="mt-4 text-sm text-[#627A9B]">Aún no tienes exámenes o grupos asignados.</p>}

              <div className="mt-5 flex justify-end">
                <button type="button" onClick={irAMisExamenes} disabled={!grupo} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0439D9] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0C41E1] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">
                  Ir a mis exámenes de este grupo <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      <MobileBottomNav />
    </PanelLayout>
  )
}

function SelectorCard({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#D8E3F5] bg-[#F1F6FF] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-[#011140]"><span className="text-[#4264A2]" aria-hidden="true">{icon}</span>{label}</p>
      {children}
    </div>
  )
}
