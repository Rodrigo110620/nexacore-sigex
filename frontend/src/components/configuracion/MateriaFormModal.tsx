import { useMemo, useState } from 'react'
import { BookOpen, ChevronDown, X } from 'lucide-react'
import { crearMateria, editarMateria, type MateriaConCarreras } from '../../services/materiaCarreraService'
import type { CarreraOption } from '../../types/estudiante'
import { ConfirmDiscardDialog } from '../examenes/ExamFormDialogs'

const SIGLA = /^[A-Za-z0-9][A-Za-z0-9-]{1,14}$/
const inputClass = 'mt-1 h-10 w-full rounded-md border border-[#C9D7EC] bg-white px-3 text-[13px] font-normal text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#DCE7FF]'

function mensajeDe(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string> } } }).response?.data
  return data?.errores ? Object.values(data.errores)[0] : data?.mensaje ?? porDefecto
}

/**
 * Registrar o editar una materia, con el mismo formato que Registrar Estudiante: hoja inferior en el celular, centrado en
 * escritorio. Las carreras se eligen por facultad; las elegidas quedan como etiquetas (puede combinar varias facultades).
 */
export default function MateriaFormModal({ materia, carreras, onClose, onGuardada }: {
  /** null: nueva materia. */
  materia: MateriaConCarreras | null
  carreras: CarreraOption[]
  onClose: () => void
  onGuardada: (m: MateriaConCarreras) => void
}) {
  const nueva = materia === null
  const [sigla, setSigla] = useState(materia?.sigla ?? '')
  const [nombre, setNombre] = useState(materia?.nombre ?? '')
  const [elegidas, setElegidas] = useState<Set<number>>(new Set(materia?.carreras.map((c) => c.idCarrera) ?? []))
  const [facultadElegida, setFacultad] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [descartar, setDescartar] = useState(false)

  const facultades = useMemo(() => [...new Set(carreras.map((c) => c.nombreFacultad))].sort((a, b) => a.localeCompare(b, 'es')), [carreras])
  // Mientras no elija una, la facultad de la primera carrera ya marcada.
  const facultad = facultadElegida || carreras.find((c) => elegidas.has(c.idCarrera))?.nombreFacultad || ''

  const deLaFacultad = carreras.filter((c) => c.nombreFacultad === facultad)
  const seleccionadas = carreras.filter((c) => elegidas.has(c.idCarrera))
  const cambiado = sigla !== (materia?.sigla ?? '') || nombre !== (materia?.nombre ?? '')
    || seleccionadas.length !== (materia?.carreras.length ?? 0) || seleccionadas.some((c) => !materia?.carreras.some((m) => m.idCarrera === c.idCarrera))

  const alternar = (id: number) => setElegidas((actual) => {
    const nuevo = new Set(actual)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    return nuevo
  })
  const pedirCerrar = () => (cambiado ? setDescartar(true) : onClose())

  const guardar = async () => {
    if (guardando) return
    if (sigla.trim() && !SIGLA.test(sigla.trim())) { setError('La sigla debe tener de 2 a 15 letras, números o guiones (p. ej. 2010017 o INF-112).'); return }
    if (nombre.trim().length < 3) { setError('El nombre debe tener al menos 3 caracteres.'); return }
    setGuardando(true)
    setError('')
    try {
      const payload = { sigla: sigla.trim(), nombre: nombre.trim(), idsCarrera: [...elegidas] }
      onGuardada(nueva ? await crearMateria(payload) : await editarMateria(materia.idMateria, payload))
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo guardar la materia. Revisa tu conexión e intenta de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="materia-form-titulo">
      <ConfirmDiscardDialog open={descartar} onStay={() => setDescartar(false)} onLeave={onClose} />
      <div className="flex max-h-[calc(100dvh-4.5rem)] w-full flex-col overflow-hidden rounded-t-xl border border-[#D8E3F5] bg-white shadow-xl sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#D8E3F5] px-4 py-3 sm:px-5">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><BookOpen size={19} /></span>
            <div>
              <h2 id="materia-form-titulo" className="font-bold text-[#011140]">{nueva ? 'Registrar Materia' : 'Editar Materia'}</h2>
              <p className="mt-1 text-xs text-[#627A9B]">Use la sigla y el nombre del plan de estudios y marque las carreras que la llevan.</p>
            </div>
          </div>
          <button type="button" onClick={pedirCerrar} aria-label="Cerrar" className="rounded p-1 text-[#627A9B] hover:bg-gray-100"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
            <label className="block text-xs font-semibold text-[#011140]">Sigla
              <div className="relative">
                <input name="sigla" value={sigla} maxLength={15} autoFocus={nueva} onChange={(e) => setSigla(e.target.value.toUpperCase())}
                  placeholder={nueva ? 'Opcional (Ej: 2010017)' : ''} className={`${inputClass} bg-[#F8FAFC] pr-16 font-mono`} />
                <span className="pointer-events-none absolute right-2 top-3 rounded bg-[#E1ECFF] px-1.5 py-0.5 text-[9px] font-bold text-[#0439D9]">ÚNICO</span>
              </div>
            </label>
            <label className="block text-xs font-semibold text-[#011140]">Nombre de la materia <b className="text-red-500">*</b>
              <input name="nombre" value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Base de Datos I" className={inputClass} />
            </label>
          </div>
          <p className="rounded-md border border-[#D8E3F5] bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#627A9B]">
            {nueva
              ? 'Si todavía no tiene la sigla oficial, déjela vacía: SIGEX sugiere una a partir del nombre y la marca como provisional.'
              : 'Al poner la sigla oficial, deja de ser provisional.'}
          </p>

          <div>
            <p className="text-xs font-semibold text-[#011140]">Carreras que la llevan <span className="font-normal text-[#627A9B]">({seleccionadas.length})</span></p>
            {seleccionadas.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {seleccionadas.map((c) => (
                  <button key={c.idCarrera} type="button" onClick={() => alternar(c.idCarrera)} aria-label={`Quitar ${c.nombre}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#EDF2FE] py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-[#1E3A8A] hover:bg-[#DCE7FF]">
                    {c.nombre} <X size={12} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-[#B45309]">Sin carreras: la materia no restringe a ninguna carrera.</p>
            )}
            <label className="mt-3 block text-xs font-semibold text-[#011140]">Facultad académica
              <div className="relative">
                <select value={facultad} onChange={(e) => setFacultad(e.target.value)} className={`${inputClass} appearance-none pr-10`}>
                  <option value="">Seleccione facultad...</option>
                  {facultades.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-4" size={16} />
              </div>
            </label>
            {facultad && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-[#D8E3F5]">
                {deLaFacultad.map((c) => (
                  <li key={c.idCarrera} className="border-b border-[#EEF2F8] last:border-b-0">
                    <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-[#011140] hover:bg-[#F8FAFF]">
                      <input type="checkbox" checked={elegidas.has(c.idCarrera)} onChange={() => alternar(c.idCarrera)} className="h-4 w-4 accent-[#0439D9]" />
                      {c.nombre}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 text-[11px] text-[#627A9B]">Si la materia es común a varias facultades (como Cálculo I), cambie de facultad y marque también esas carreras.</p>
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-[#B42318]">{error}</p>}
        </div>

        <footer className="[&>*]:min-w-0 [&>*]:flex-1 sm:[&>*]:flex-none flex flex-row gap-2 border-t border-[#D8E3F5] px-4 py-3 sm:justify-between sm:px-5">
          <button type="button" onClick={pedirCerrar} className="h-10 rounded-md border border-[#C9D7EC] px-5 text-sm font-semibold text-[#45628D]">Cancelar</button>
          <button type="button" disabled={guardando} onClick={() => void guardar()} className="h-10 rounded-md bg-[#0439D9] px-6 text-sm font-bold text-white shadow-md disabled:opacity-60">
            {guardando ? 'Guardando...' : nueva ? 'Registrar Materia' : 'Guardar cambios'}
          </button>
        </footer>
      </div>
    </div>
  )
}
