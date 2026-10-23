import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CameraOff, CircleCheck, LoaderCircle, RefreshCw, Smartphone, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice'
import QrContinuarCelular from './QrContinuarCelular'
import {
  aGrises,
  cajaDelRostro,
  evaluar,
  luzPromedio,
  nitidez,
  orientacion,
  posicionCumplida,
  POSICIONES,
  type Evaluacion,
  type Medicion,
  type Posicion,
} from '../../utils/calidadFoto'

/** Versión instalada de @mediapipe/tasks-vision: el WASM debe ser de la misma versión. */
const MEDIAPIPE_VERSION = '1.1.1'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODELO_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

/** Tiempo que todo debe estar bien antes de tomar la foto (evita fotos movidas). */
const MS_ESTABLE = 1200
const MS_ENTRE_ANALISIS = 100
/** Tiempo que hay que sostener cada giro para contarlo. */
const MS_POSICION = 500
/** La foto se guarda en 480×640 (3:4), como una foto carnet, y debe pesar como máximo 150 KB. */
const ANCHO_FOTO = 480
const ALTO_FOTO = 640
const BYTES_MAXIMOS = 150 * 1024

export interface FotoCapturada {
  archivo: Blob
  url: string
}

type ErrorCamara = 'sin-https' | 'permiso' | 'sin-camara' | 'detector'

const MENSAJES_ERROR: Record<ErrorCamara, { titulo: string; texto: string }> = {
  'sin-https': {
    titulo: 'La cámara necesita una conexión segura',
    texto: 'Abre SIGEX con https:// para que el navegador permita usar la cámara.',
  },
  permiso: {
    titulo: 'Permite el acceso a la cámara',
    texto: 'SIGEX necesita tu cámara para registrar tu foto. El navegador la tiene bloqueada.',
  },
  'sin-camara': {
    titulo: 'No encontramos una cámara',
    texto: 'Conecta una cámara o inicia sesión en SIGEX desde tu celular para registrar tu foto.',
  },
  detector: {
    titulo: 'No se pudo preparar el escaneo',
    texto: 'Revisa tu conexión a internet y vuelve a intentarlo.',
  },
}

/** Cómo volver a dar permiso a la cámara después de bloquearla. */
const PASOS_PERMISO = [
  'Toca el candado junto a la dirección de la página',
  'Abre Permisos y activa Cámara',
  'Vuelve aquí y toca Intentar de nuevo',
]

function clasificarError(error: unknown): ErrorCamara {
  const nombre = error instanceof DOMException ? error.name : ''
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') return 'permiso'
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError' || nombre === 'NotReadableError') return 'sin-camara'
  return 'detector'
}

async function crearDetector(): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  const opciones = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODELO_URL, delegate },
    runningMode: 'VIDEO' as const,
    numFaces: 2,
  })
  try {
    return await FaceLandmarker.createFromOptions(fileset, opciones('GPU'))
  } catch {
    // Algunos celulares no tienen WebGL suficiente: se analiza con el procesador.
    return FaceLandmarker.createFromOptions(fileset, opciones('CPU'))
  }
}

/** Recorta el cuadro actual alrededor del rostro, en 3:4, y lo comprime hasta 150 KB. */
async function tomarFoto(video: HTMLVideoElement, caja: NonNullable<Medicion['caja']>): Promise<FotoCapturada> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  const alto = Math.min(vh, caja.alto * vh * 1.9)
  const ancho = Math.min(vw, (alto * 3) / 4)
  const centroX = (caja.x + caja.ancho / 2) * vw
  const centroY = (caja.y + caja.alto / 2) * vh - alto * 0.04
  const sx = Math.max(0, Math.min(vw - ancho, centroX - ancho / 2))
  const sy = Math.max(0, Math.min(vh - alto, centroY - alto / 2))

  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO_FOTO
  lienzo.height = ALTO_FOTO
  lienzo.getContext('2d')!.drawImage(video, sx, sy, ancho, alto, 0, 0, ANCHO_FOTO, ALTO_FOTO)

  let calidad = 0.88
  let archivo: Blob | null = null
  while (calidad >= 0.5) {
    archivo = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', calidad))
    if (archivo && archivo.size <= BYTES_MAXIMOS) break
    calidad -= 0.08
  }
  if (!archivo) throw new Error('No se pudo generar la foto')
  return { archivo, url: URL.createObjectURL(archivo) }
}

const NOMBRES: Record<Posicion, string> = {
  frente: 'Frente',
  izquierda: 'Izquierda',
  derecha: 'Derecha',
  arriba: 'Arriba',
  abajo: 'Abajo',
}

/** Indicación de cada giro y la flecha que la acompaña (la vista es un espejo: tu izquierda se ve a la izquierda). */
const GIROS: Record<Exclude<Posicion, 'frente'>, { texto: string; flecha: LucideIcon; lugar: string }> = {
  izquierda: { texto: 'Gira la cabeza a tu izquierda', flecha: ArrowLeft, lugar: 'left-3 top-1/2 -translate-y-1/2' },
  derecha: { texto: 'Gira la cabeza a tu derecha', flecha: ArrowRight, lugar: 'right-3 top-1/2 -translate-y-1/2' },
  arriba: { texto: 'Mira hacia arriba', flecha: ArrowUp, lugar: 'left-1/2 top-12 -translate-x-1/2' },
  abajo: { texto: 'Mira hacia abajo', flecha: ArrowDown, lugar: 'bottom-14 left-1/2 -translate-x-1/2' },
}

function Posiciones({ actual }: { actual: number }) {
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Posiciones del escaneo">
      {POSICIONES.map((posicion, i) => {
        const hecha = i < actual
        const enCurso = i === actual
        return (
          <li key={posicion} aria-current={enCurso ? 'step' : undefined} className="flex flex-col items-center gap-1">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                hecha
                  ? 'bg-[#10B981] text-white'
                  : enCurso
                    ? 'border-2 border-[#0439D9] bg-[#E9F1FF] text-[#0439D9]'
                    : 'border border-[#D8E3F5] bg-white text-[#A9B8CF]'
              }`}
            >
              {hecha ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`text-[11px] ${hecha ? 'text-[#047857]' : enCurso ? 'font-semibold text-[#0439D9]' : 'text-[#627A9B]'}`}>
              {NOMBRES[posicion]}
              <span className="sr-only">{hecha ? ' (lista)' : enCurso ? ' (en curso)' : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Control({ texto, ok }: { texto: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${
        ok ? 'bg-[#064E3B]/85' : 'bg-[#78350F]/85'
      }`}
    >
      {ok ? <CircleCheck size={12} className="text-[#6EE7B7]" aria-hidden="true" /> : <TriangleAlert size={12} className="text-[#FCD34D]" aria-hidden="true" />}
      {texto}
      <span className="sr-only">{ok ? '(correcto)' : '(por corregir)'}</span>
    </span>
  )
}

interface Props {
  onCapturada: (foto: FotoCapturada) => void
  onCancelar: () => void
}

/**
 * Cámara frontal con óvalo guía (CTA-02). Primero revisa en vivo que haya un solo rostro, centrado,
 * con buena luz, nítido y de frente, y toma la foto sola. Después pide girar a la izquierda, a la
 * derecha, arriba y abajo para comprobar que es una persona en vivo; solo se entrega la foto de frente.
 */
export default function EscaneoRostro({ onCapturada, onCancelar }: Props) {
  const esCelular = useIsMobileDevice()
  const camaraDisponible = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCapturadaRef = useRef(onCapturada)
  const [intento, setIntento] = useState(0)
  const [preparando, setPreparando] = useState(true)
  const [error, setError] = useState<ErrorCamara | null>(camaraDisponible ? null : 'sin-https')
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [progreso, setProgreso] = useState(0)
  const [medicion, setMedicion] = useState<Medicion | null>(null)
  const [paso, setPaso] = useState(0)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    onCapturadaRef.current = onCapturada
  }, [onCapturada])

  useEffect(() => {
    if (!camaraDisponible) return
    let cancelado = false
    let stream: MediaStream | null = null
    let detector: FaceLandmarker | null = null
    let cuadro = 0
    let ultimoAnalisis = 0
    let estableDesde: number | null = null
    let capturando = false
    let paso = 0
    let foto: FotoCapturada | null = null
    let entregada = false
    const recorte = document.createElement('canvas')
    recorte.width = 128
    recorte.height = 128
    const contexto = recorte.getContext('2d', { willReadFrequently: true })!

    const analizar = () => {
      cuadro = requestAnimationFrame(analizar)
      const video = videoRef.current
      const ahora = performance.now()
      if (!video || !detector || capturando || video.readyState < 2 || ahora - ultimoAnalisis < MS_ENTRE_ANALISIS) return
      ultimoAnalisis = ahora

      const rostros = detector.detectForVideo(video, ahora).faceLandmarks
      let m: Medicion = { rostros: rostros.length, luz: 0, nitidez: 0, caja: null, giro: 0, inclinacion: 0 }
      if (rostros.length === 1) {
        const caja = cajaDelRostro(rostros[0])
        const vw = video.videoWidth
        const vh = video.videoHeight
        contexto.drawImage(video, caja.x * vw, caja.y * vh, caja.ancho * vw, caja.alto * vh, 0, 0, 128, 128)
        const gris = aGrises(contexto.getImageData(0, 0, 128, 128).data)
        m = { rostros: 1, luz: luzPromedio(gris), nitidez: nitidez(gris, 128, 128), caja, ...orientacion(rostros[0]) }
      }
      const ev = evaluar(m)
      setEvaluacion(ev)
      setMedicion(m)

      // Otra persona en cuadro durante los giros: se empieza de nuevo para no mezclar rostros.
      if (paso > 0 && m.rostros > 1) {
        if (foto) URL.revokeObjectURL(foto.url)
        foto = null
        paso = 0
        estableDesde = null
        setPaso(0)
        setProgreso(0)
        setAviso('Apareció otra persona: empezamos de nuevo.')
        return
      }

      if (paso === 0) {
        if (ev.indicacion !== null || !m.caja) {
          estableDesde = null
          setProgreso(0)
          return
        }
        estableDesde ??= ahora
        const avance = Math.min(1, (ahora - estableDesde) / MS_ESTABLE)
        setProgreso(avance)
        if (avance < 1) return
        capturando = true
        tomarFoto(video, m.caja)
          .then((tomada) => {
            if (cancelado) return URL.revokeObjectURL(tomada.url)
            foto = tomada
            paso = 1
            setPaso(1)
            setAviso('')
          })
          .catch(() => undefined)
          .finally(() => {
            capturando = false
            estableDesde = null
            setProgreso(0)
          })
        return
      }

      // Giros: basta sostener la posición un momento con un solo rostro.
      if (m.rostros !== 1 || !posicionCumplida(POSICIONES[paso], m.giro, m.inclinacion)) {
        estableDesde = null
        setProgreso(0)
        return
      }
      estableDesde ??= ahora
      const avance = Math.min(1, (ahora - estableDesde) / MS_POSICION)
      setProgreso(avance)
      if (avance < 1) return
      paso += 1
      estableDesde = null
      setProgreso(0)
      setPaso(paso)
      if (paso === POSICIONES.length && foto) {
        capturando = true
        entregada = true
        onCapturadaRef.current(foto)
      }
    }

    const iniciar = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (e) {
        if (!cancelado) setError(clasificarError(e))
        return
      }
      if (cancelado) return
      const video = videoRef.current!
      video.srcObject = stream
      await video.play().catch(() => undefined)
      try {
        detector = await crearDetector()
      } catch {
        if (!cancelado) setError('detector')
        return
      }
      if (cancelado) return
      setPreparando(false)
      cuadro = requestAnimationFrame(analizar)
    }
    void iniciar()

    return () => {
      cancelado = true
      cancelAnimationFrame(cuadro)
      stream?.getTracks().forEach((pista) => pista.stop())
      detector?.close()
      if (foto && !entregada) URL.revokeObjectURL(foto.url)
    }
  }, [camaraDisponible, intento])

  const reintentar = () => {
    setError(null)
    setPreparando(true)
    setEvaluacion(null)
    setProgreso(0)
    setPaso(0)
    setAviso('')
    setIntento((n) => n + 1)
  }

  if (error === 'sin-camara' && !esCelular) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-[#D8E3F5] bg-[#F8FBFF] p-6 text-center">
        <Smartphone size={30} className="text-[#0439D9]" aria-hidden="true" />
        <p className="text-base font-bold text-[#011140]">Escanea con tu celular</p>
        <p className="text-sm text-[#45628D]">
          No encontramos una cámara en esta computadora. Escanea el código con tu celular: se abrirá SIGEX en su
          navegador; inicia sesión y registra tu foto desde ahí.
        </p>
        <QrContinuarCelular />
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reintentar}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D8E3F5] bg-white text-sm font-semibold text-[#0439D9]"
          >
            <RefreshCw size={16} aria-hidden="true" /> Ya conecté una cámara
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#D8E3F5] bg-white text-sm font-semibold text-[#0439D9]"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    const { titulo, texto } = MENSAJES_ERROR[error]
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-[#FDE68A] bg-[#FFF7E6] p-6 text-center">
        <CameraOff size={30} className="text-[#B45309]" aria-hidden="true" />
        <p className="text-base font-bold text-[#92400E]">{titulo}</p>
        <p className="text-sm text-[#92400E]">{texto}</p>
        {error === 'permiso' && (
          <div className="w-full rounded-lg bg-white p-3 text-left">
            <p className="mb-2 text-xs font-semibold text-[#011140]">Cómo activarla:</p>
            <ol className="flex flex-col gap-2">
              {PASOS_PERMISO.map((texto, i) => (
                <li key={texto} className="flex items-start gap-2 text-sm text-[#011140]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9F1FF] text-[11px] font-bold text-[#0439D9]">
                    {i + 1}
                  </span>
                  {texto}
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          {error !== 'sin-https' && (
            <button
              type="button"
              onClick={reintentar}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0439D9] text-sm font-bold text-white hover:bg-[#0027a2]"
            >
              <RefreshCw size={16} aria-hidden="true" /> Intentar de nuevo
            </button>
          )}
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#D8E3F5] bg-white text-sm font-semibold text-[#0439D9]"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  const enGiros = paso > 0
  const giro = enGiros && paso < POSICIONES.length ? GIROS[POSICIONES[paso] as Exclude<Posicion, 'frente'>] : null
  const todoBien = !enGiros && evaluacion?.indicacion === null
  const colorOvalo = enGiros
    ? progreso > 0 ? '#22C55E' : '#FFFFFF'
    : todoBien ? '#22C55E' : evaluacion && medicion?.rostros === 1 ? '#F59E0B' : '#FFFFFF'
  const titulo = preparando
    ? 'Mira al frente'
    : giro
      ? giro.texto
      : todoBien
        ? 'No te muevas, tomando tu foto...'
        : evaluacion?.indicacion || 'Mira al frente'
  const Flecha = giro?.flecha

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#0B1220] sm:aspect-[4/3]">
        {/* Se ve como un espejo; la foto se guarda sin invertir. */}
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id="mascara-ovalo">
              <rect width="100" height="100" fill="white" />
              <ellipse cx="50" cy="48" rx="27" ry="34" fill="black" />
            </mask>
          </defs>
          <rect width="100" height="100" fill="#0B1220" opacity="0.45" mask="url(#mascara-ovalo)" />
          <ellipse
            cx="50"
            cy="48"
            rx="27"
            ry="34"
            fill="none"
            stroke={colorOvalo}
            strokeWidth={4}
            strokeDasharray={enGiros && progreso === 0 ? '10 8' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-[#EF4444]" aria-hidden="true" /> En vivo
        </span>
        {preparando ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0B1220]/70 text-white" role="status">
            <LoaderCircle size={28} className="animate-spin" aria-hidden="true" />
            <p className="text-sm font-semibold">Preparando la cámara...</p>
          </div>
        ) : (
          !enGiros &&
          evaluacion && (
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-center gap-1.5">
              <Control texto="Luz" ok={evaluacion.luz === 'ok'} />
              <Control texto="Nitidez" ok={evaluacion.nitidez === 'ok'} />
              <Control texto="Rostro centrado" ok={evaluacion.centrado === 'ok'} />
            </div>
          )
        )}
        {giro && Flecha && (
          <span className={`absolute inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#011140] shadow ${giro.lugar}`}>
            <Flecha size={22} aria-hidden="true" />
          </span>
        )}
        {(todoBien || (enGiros && progreso > 0)) && (
          <div className="absolute inset-x-0 top-0 h-1 bg-white/20">
            <div className="h-full bg-[#22C55E] transition-[width] duration-100" style={{ width: `${progreso * 100}%` }} />
          </div>
        )}
      </div>

      <div aria-live="polite" className="text-center">
        <p className={`text-lg font-bold ${todoBien ? 'text-[#047857]' : 'text-[#011140]'}`}>{titulo}</p>
        <p className="mt-1 text-sm text-gray-500">
          {enGiros
            ? 'Despacio, sin salir del óvalo. Tu foto de frente ya se tomó.'
            : 'Mantén el rostro dentro del óvalo. Tomaremos tu foto cuando todo esté en verde.'}
        </p>
        {aviso && <p className="mt-2 text-sm font-semibold text-[#B45309]">{aviso}</p>}
      </div>

      <Posiciones actual={paso} />

      {import.meta.env.DEV && medicion && (
        <p className="rounded bg-gray-100 p-2 font-mono text-[10px] text-gray-600">
          rostros {medicion.rostros} · luz {medicion.luz.toFixed(0)} · nitidez {medicion.nitidez.toFixed(0)} · alto{' '}
          {medicion.caja?.alto.toFixed(2) ?? '-'} · giro {medicion.giro.toFixed(2)} · incl {medicion.inclinacion.toFixed(2)}
        </p>
      )}

      <button
        type="button"
        onClick={onCancelar}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#D8E3F5] bg-white text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]"
      >
        Cancelar
      </button>
    </div>
  )
}
