import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, ImageOff, LoaderCircle, X } from 'lucide-react'
import { imagenEvidencia, listarEvidencias, MAX_BYTES_EVIDENCIA, MAX_EVIDENCIAS } from '../../services/expulsionService'

/** Fotos de evidencia de una expulsión ya registrada; se cargan al mostrarse y se amplían al tocarlas. */
export function GaleriaEvidencia({ idExamen, idExpulsion }: { idExamen: number; idExpulsion: number }) {
  const [fotos, setFotos] = useState<{ id: number; url: string }[] | null>(null)
  const [error, setError] = useState(false)
  const [ampliada, setAmpliada] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    const urls: string[] = []
    listarEvidencias(idExamen, idExpulsion)
      .then((lista) => Promise.all(lista.map(async (e) => {
        const url = URL.createObjectURL(await imagenEvidencia(idExamen, idExpulsion, e.idEvidencia))
        urls.push(url)
        return { id: e.idEvidencia, url }
      })))
      .then((lista) => { if (vigente) setFotos(lista) })
      .catch(() => { if (vigente) setError(true) })
    return () => {
      vigente = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [idExamen, idExpulsion])

  if (error) return <p className="mt-1 flex items-center gap-1 text-[#627A9B]"><ImageOff size={13} aria-hidden="true" /> No se pudo cargar la evidencia.</p>
  if (!fotos) return <p role="status" className="mt-1 flex items-center gap-1 text-[#627A9B]"><LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> Cargando evidencia…</p>
  if (fotos.length === 0) return <p className="mt-1 text-[#627A9B]">Sin fotos de evidencia.</p>
  return (
    <>
      <ul className="mt-1 flex flex-wrap gap-2" aria-label="Evidencia de la expulsión">
        {fotos.map((f, i) => (
          <li key={f.id}>
            <button type="button" onClick={() => setAmpliada(f.url)} className="block overflow-hidden rounded-lg border border-[#D8E3F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]">
              <img src={f.url} alt={`Evidencia ${i + 1}`} className="h-16 w-16 object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {ampliada && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Evidencia ampliada" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setAmpliada(null)}>
          <button type="button" aria-label="Cerrar evidencia" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={20} aria-hidden="true" /></button>
          <img src={ampliada} alt="Evidencia ampliada" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>,
        document.body,
      )}
    </>
  )
}

/**
 * Elegir hasta 3 fotos de evidencia antes de expulsar (en el celular abre la cámara). Valida tipo y tamaño;
 * las fotos se suben después de registrar la expulsión.
 */
export function ElegirEvidencia({ fotos, onChange, disabled }: { fotos: File[]; onChange: (fotos: File[]) => void; disabled?: boolean }) {
  const [error, setError] = useState('')
  // Miniaturas de las fotos elegidas; se liberan al cambiar la selección o cerrar.
  const vistas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos])
  useEffect(() => () => vistas.forEach((u) => URL.revokeObjectURL(u)), [vistas])

  const agregar = (lista: FileList | null) => {
    setError('')
    const nuevas = Array.from(lista ?? [])
    if (fotos.length + nuevas.length > MAX_EVIDENCIAS) { setError(`Hasta ${MAX_EVIDENCIAS} fotos de evidencia.`); return }
    if (nuevas.some((f) => !/^image\/(jpeg|png|webp)$/.test(f.type))) { setError('La evidencia debe ser una imagen JPG, PNG o WEBP.'); return }
    if (nuevas.some((f) => f.size > MAX_BYTES_EVIDENCIA)) { setError('Cada foto debe pesar hasta 5 MB.'); return }
    onChange([...fotos, ...nuevas])
  }

  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#45628D]">Evidencia (opcional)</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {vistas.map((url, i) => (
          <span key={url} className="relative">
            <img src={url} alt={`Evidencia ${i + 1}`} className="h-14 w-14 rounded-lg border border-[#D8E3F5] object-cover" />
            <button type="button" disabled={disabled} onClick={() => onChange(fotos.filter((_, j) => j !== i))} aria-label={`Quitar evidencia ${i + 1}`}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-[#B91C1C] p-0.5 text-white shadow"><X size={12} aria-hidden="true" /></button>
          </span>
        ))}
        {fotos.length < MAX_EVIDENCIAS && (
          <label className={`inline-flex h-14 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#B8CBEF] px-3 text-xs font-semibold text-[#0439D9] hover:bg-[#F2F6FF] ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
            <Camera size={16} aria-hidden="true" /> Agregar foto
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only"
              aria-label="Agregar foto de evidencia" disabled={disabled} onChange={(e) => { agregar(e.target.files); e.target.value = '' }} />
          </label>
        )}
      </div>
      <p className="mt-1 text-[10px] text-[#627A9B]">Hasta {MAX_EVIDENCIAS} fotos o capturas. Las ven el administrador, el docente y el personal de control del examen; el estudiante no.</p>
      {error && <p role="alert" className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  )
}
