import { useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

/**
 * Dibuja un PDF página por página con pdf.js. Se ve igual en cualquier navegador, también en los que no traen
 * visor de PDF propio (Chrome en Android, navegadores integrados en editores).
 */
export default function VisorPdf({ datos, titulo }: { datos: Blob; titulo: string }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [paginas, setPaginas] = useState(0)

  useEffect(() => {
    let vigente = true
    const destino = contenedor.current
    const dibujar = async () => {
      const pdfjs = await import('pdfjs-dist')
      const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await datos.arrayBuffer()) }).promise
      if (!vigente || !destino) return
      destino.replaceChildren()
      const ancho = Math.max(320, destino.clientWidth - 32)
      for (let n = 1; n <= pdf.numPages; n++) {
        const pagina = await pdf.getPage(n)
        if (!vigente) return
        const base = pagina.getViewport({ scale: 1 })
        const escala = Math.min(2, ancho / base.width)
        const vista = pagina.getViewport({ scale: escala * (window.devicePixelRatio || 1) })
        const lienzo = document.createElement('canvas')
        lienzo.width = vista.width
        lienzo.height = vista.height
        lienzo.style.width = `${base.width * escala}px`
        lienzo.className = 'mx-auto mb-4 block max-w-full bg-white shadow-md'
        lienzo.setAttribute('role', 'img')
        lienzo.setAttribute('aria-label', `${titulo}, página ${n} de ${pdf.numPages}`)
        destino.appendChild(lienzo)
        await pagina.render({ canvas: lienzo, viewport: vista }).promise
      }
      if (vigente) {
        setPaginas(pdf.numPages)
        setEstado('listo')
      }
    }
    dibujar().catch(() => { if (vigente) setEstado('error') })
    return () => { vigente = false }
  }, [datos, titulo])

  return (
    <div className="relative h-full overflow-auto bg-[#525659] p-4" data-testid="visor-pdf">
      {estado === 'cargando' && (
        <p role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Dibujando el PDF…
        </p>
      )}
      {estado === 'error' && <p role="alert" className="rounded-lg bg-white p-3 text-sm text-red-700">No se pudo mostrar el PDF. Puedes descargarlo igual.</p>}
      {estado === 'listo' && <p className="mb-2 text-center text-xs text-white/80">{paginas} {paginas === 1 ? 'página' : 'páginas'}</p>}
      <div ref={contenedor} />
    </div>
  )
}
