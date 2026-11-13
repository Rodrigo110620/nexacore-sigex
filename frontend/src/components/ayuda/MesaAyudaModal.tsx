import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import axios from 'axios'
import { ArrowLeft, ArrowRight, CalendarClock, Camera, CircleCheck, CircleHelp, GraduationCap, KeyRound, LifeBuoy, LoaderCircle, QrCode, Send, UserX, X, type LucideIcon } from 'lucide-react'
import { enviarSolicitudAyuda, type TipoAyuda } from '../../services/mesaAyudaService'

interface Tema {
  tipo: TipoAyuda
  titulo: string
  Icono: LucideIcon
  /** Qué pasa y por qué, en una frase. */
  explicacion: string
  /** Pasos para resolverlo solo; vacío = se pasa directo a escribir la consulta. */
  pasos: string[]
  accion?: { texto: string; href: string }
  /** Qué conviene contar en la consulta. */
  pista: string
}

/** Cada tema: qué pasa, los pasos que lo resuelven y qué contar si hace falta escribir. */
const TEMAS: Tema[] = [
  { tipo: 'CONTRASENA', titulo: 'Olvidé mi contraseña', Icono: KeyRound,
    explicacion: 'Puedes crear una contraseña nueva tú mismo con tu correo institucional, sin esperar al administrador.',
    pasos: [
      'Ve a la pantalla de ingreso y pulsa «¿Olvidaste tu contraseña?» (o usa el botón de abajo).',
      'Escribe tu correo institucional y pulsa enviar. Por seguridad, siempre verás el mismo mensaje, exista o no la cuenta.',
      'Abre el correo que te llega y pulsa el enlace. Si no lo ves en unos minutos, revisa la carpeta de correo no deseado.',
      'Crea tu contraseña nueva y vuelve a ingresar con ella. El enlace vence pasado un tiempo: si venció, pide otro.',
    ],
    accion: { texto: 'Recuperar mi contraseña', href: '/forgot-password' },
    pista: 'Ej.: «Pedí el enlace con juan.perez@umss.edu y no me llega, ni en correo no deseado».' },
  { tipo: 'ACTIVACION', titulo: 'Activar mi cuenta de estudiante', Icono: GraduationCap,
    explicacion: 'La primera vez, cada estudiante activa su cuenta y crea su propia contraseña. Solo necesitas tu código SIS, tu carnet y acceso a tu correo institucional.',
    pasos: [
      'En la pantalla de ingreso pulsa «Activar cuenta» (o usa el botón de abajo).',
      'Escribe tu código SIS (9 dígitos) y tu carnet de identidad, tal como están registrados en la universidad.',
      'Te enviamos un código de 6 dígitos a tu correo institucional: tucódigoSIS@est.umss.edu.',
      'Escribe ese código y crea tu contraseña. Desde ese momento ya puedes ingresar al portal.',
    ],
    accion: { texto: 'Activar mi cuenta', href: '/activar-cuenta' },
    pista: 'Ej.: «Mi código SIS es 202100110, puse mi carnet y me dice que los datos no coinciden».' },
  { tipo: 'CUENTA', titulo: 'No tengo cuenta o no puedo entrar', Icono: UserX,
    explicacion: 'Depende de tu rol: los estudiantes activan su propia cuenta; las del personal (docentes y control) las crea el administrador.',
    pasos: [
      'Si eres estudiante y nunca ingresaste, primero activa tu cuenta (elige el tema «Activar mi cuenta de estudiante»).',
      'Si eres docente o personal de control, el administrador crea tu cuenta y te llega por correo una contraseña temporal para el primer ingreso.',
      'Si tu cuenta ya existía y no entra, revisa que el correo esté bien escrito y que no tengas las mayúsculas activadas.',
      'Después de varios intentos fallidos la cuenta se bloquea 15 minutos por seguridad: espera ese tiempo e inténtalo de nuevo.',
    ],
    pista: 'Indica tu rol (estudiante, docente o control), tu correo y el mensaje exacto que te sale al ingresar.' },
  { tipo: 'QR', titulo: 'Mi código QR', Icono: QrCode,
    explicacion: 'Tu QR es tu pase personal para entrar a los exámenes: el personal de control lo escanea en la puerta del aula.',
    pasos: [
      'Ingresa al portal con tu cuenta de estudiante y abre «Mi QR».',
      'Al llegar al aula, muéstralo en tu celular con el brillo alto para que se lea rápido (también lo recibiste por correo).',
      'Si lo perdiste o crees que otra persona lo tiene, pide un QR nuevo escribiéndonos: el anterior deja de funcionar.',
    ],
    pista: 'Ej.: «Mi código SIS es 202100110 y necesito un QR nuevo porque compartí una captura».' },
  { tipo: 'FOTO', titulo: 'Mi foto', Icono: Camera,
    explicacion: 'El personal de control compara tu cara con tu foto al entrar al examen, por eso debe verse claramente.',
    pasos: [
      'En tu portal elige cambiar la foto y toma una nueva: de frente, con buena luz, sin lentes oscuros ni gorra.',
      'El administrador revisa la foto nueva. Mientras tanto se sigue usando la anterior.',
      'En tu inicio verás si fue aprobada o rechazada; si la rechazan, ahí mismo aparece el motivo para que tomes otra.',
    ],
    pista: 'Ej.: «Mi foto fue rechazada por estar borrosa y al subir otra me sale un error».' },
  { tipo: 'EXAMEN', titulo: 'Un examen', Icono: CalendarClock,
    explicacion: 'Cada docente programa sus exámenes y decide qué estudiantes están habilitados para rendirlos.',
    pasos: [
      'En tu inicio revisa la fecha, la hora y el aula de tus próximos exámenes.',
      'Si no aparece un examen o figuras como no habilitado, consúltalo primero con tu docente: es quien asocia y habilita a los estudiantes.',
      'Si el docente ya lo revisó y sigue sin aparecer, escríbenos con los datos del examen.',
    ],
    pista: 'Indica la materia, el grupo, la fecha del examen y qué ves (no aparece, no habilitado, aula equivocada…).' },
  { tipo: 'OTRO', titulo: 'Otro problema', Icono: CircleHelp,
    explicacion: 'Cuéntanos qué pasa y te ayudamos.', pasos: [],
    pista: 'Describe qué intentabas hacer, en qué pantalla estabas y el mensaje exacto que te salió.' },
]

const PASOS = ['Tema', 'Solución', 'Consulta'] as const

const CAMPO = 'w-full rounded-lg border border-[#D8E3F5] bg-white px-3 text-sm text-[#011140] outline-none focus:border-[#0439D9] focus:ring-2 focus:ring-[#0439D9]/15'

function mensajeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 429) return 'Enviaste varias consultas seguidas. Espera unos minutos e inténtalo de nuevo.'
    const datos = err.response?.data as { mensaje?: string; errores?: Record<string, string> } | undefined
    const primero = datos?.errores && Object.values(datos.errores)[0]
    if (primero) return primero
    if (datos?.mensaje) return datos.mensaje
    if (!err.response) return 'No hay conexión con el servidor. Revisa tu Internet e inténtalo de nuevo.'
  }
  return 'No se pudo enviar tu consulta. Inténtalo de nuevo.'
}

/**
 * Mesa de ayuda: preguntas frecuentes y un formulario corto. La consulta le llega al administrador y la
 * respuesta, al correo indicado. Se abre desde el ingreso (sin sesión) y desde el menú de la cuenta.
 */
export default function MesaAyudaModal({ open, onClose, nombreInicial = '' }: {
  open: boolean
  onClose: () => void
  /** Con sesión, el nombre ya viene escrito. */
  nombreInicial?: string
}) {
  const id = useId()
  // Asistente: 0 = elegir tema, 1 = pasos para resolverlo, 2 = escribir la consulta.
  const [paso, setPaso] = useState(0)
  const [tema, setTema] = useState<Tema | null>(null)
  const [nombre, setNombre] = useState(nombreInicial)
  const [correo, setCorreo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [sitio, setSitio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const cerrar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cerrar.current?.focus()
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [open, onClose])

  if (!open) return null

  const elegir = (t: Tema) => { setTema(t); setError(''); setPaso(t.pasos.length ? 1 : 2) }
  const reiniciar = () => { setEnviadoA(null); setTema(null); setPaso(0) }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!tema) { setPaso(0); return }
    setEnviando(true)
    setError('')
    try {
      await enviarSolicitudAyuda({ nombre: nombre.trim(), correo: correo.trim(), tipo: tema.tipo, mensaje: mensaje.trim(), sitio })
      setEnviadoA(correo.trim())
      setMensaje('')
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#011140]/45 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start gap-3 border-b border-[#EDF1F7] px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E9F1FF] text-[#0439D9]"><LifeBuoy size={20} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-titulo`} className="text-base font-bold text-[#011140]">Mesa de ayuda</h2>
            <p className="text-xs text-[#627A9B]">Elige tu tema, sigue los pasos y, si no se resuelve, escríbenos: te respondemos por correo.</p>
          </div>
          <button ref={cerrar} type="button" onClick={onClose} aria-label="Cerrar la mesa de ayuda"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-[#45628D] hover:bg-[#F1F6FF]"><X size={18} aria-hidden="true" /></button>
        </div>

        {!enviadoA && (
          <ol aria-label="Pasos" className="flex items-center gap-2 border-b border-[#EDF1F7] px-5 py-3 text-xs">
            {PASOS.map((nombrePaso, i) => (
              <li key={nombrePaso} aria-current={paso === i ? 'step' : undefined} className="flex min-w-0 items-center gap-2">
                {i > 0 && <span aria-hidden="true" className={`h-px w-4 shrink-0 sm:w-8 ${paso >= i ? 'bg-[#0439D9]' : 'bg-[#D8E3F5]'}`} />}
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  paso > i ? 'bg-[#0439D9] text-white' : paso === i ? 'bg-[#0439D9] text-white ring-4 ring-[#0439D9]/15' : 'bg-[#EEF2F6] text-[#8BA0BF]'}`}>
                  {paso > i ? <CircleCheck size={13} aria-hidden="true" /> : i + 1}
                </span>
                <span className={`truncate font-semibold ${paso >= i ? 'text-[#011140]' : 'text-[#8BA0BF]'}`}>{nombrePaso}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {enviadoA ? (
            <div role="status" className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-[#DCFCE7] text-[#15803D]"><CircleCheck size={28} aria-hidden="true" /></span>
              <p className="text-base font-bold text-[#011140]">Recibimos tu consulta</p>
              <ol className="mt-2 max-w-sm space-y-1.5 text-left text-sm text-[#45628D]">
                <li className="flex gap-2"><span className="font-bold text-[#0439D9]">1.</span>El administrador recibe tu consulta en su bandeja de la mesa de ayuda.</li>
                <li className="flex gap-2"><span className="font-bold text-[#0439D9]">2.</span><span>Te responde al correo <b className="break-all text-[#011140]">{enviadoA}</b>.</span></li>
                <li className="flex gap-2"><span className="font-bold text-[#0439D9]">3.</span>Revisa también la carpeta de correo no deseado.</li>
              </ol>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={reiniciar} className="min-h-10 rounded-lg border border-[#C9D8F2] px-4 text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">Otra consulta</button>
                <button type="button" onClick={onClose} className="min-h-10 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0027a2]">Listo</button>
              </div>
            </div>
          ) : paso === 0 ? (
            <>
              <h3 className="text-sm font-bold text-[#011140]">¿Con qué necesitas ayuda?</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {TEMAS.map((t) => (
                  <li key={t.tipo}>
                    <button type="button" onClick={() => elegir(t)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[#E4E9F2] bg-white px-3 text-left text-sm font-semibold text-[#011140] transition-colors hover:border-[#0439D9] hover:bg-[#F6F9FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/40">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#E9F1FF] text-[#0439D9]"><t.Icono size={18} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1">{t.titulo}</span>
                      <ArrowRight size={15} className="shrink-0 text-[#8BA0BF]" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : paso === 1 && tema ? (
            <>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#E9F1FF] px-3 py-1 text-xs font-semibold text-[#0439D9]"><tema.Icono size={14} aria-hidden="true" />{tema.titulo}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#45628D]">{tema.explicacion}</p>
              <h3 className="mt-4 text-sm font-bold text-[#011140]">Sigue estos pasos</h3>
              <ol className="mt-2 space-y-2">
                {tema.pasos.map((texto, i) => (
                  <li key={texto} className="flex gap-3 rounded-xl bg-[#F6F8FC] px-3 py-2.5 text-sm text-[#011140]">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0439D9] text-[11px] font-bold text-white">{i + 1}</span>
                    <span className="leading-relaxed">{texto}</span>
                  </li>
                ))}
              </ol>
              {tema.accion && (
                <a href={tema.accion.href} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#C9D8F2] px-4 text-sm font-semibold text-[#0439D9] hover:bg-[#F1F6FF]">
                  {tema.accion.texto}<ArrowRight size={15} aria-hidden="true" />
                </a>
              )}
              <div className="mt-5 rounded-xl border border-[#E4E9F2] p-3">
                <p className="text-sm font-semibold text-[#011140]">¿Se resolvió tu problema?</p>
                <div className="mt-2 flex gap-2 [&>*]:flex-1">
                  <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-[#C9D8F2] text-sm font-semibold text-[#15803D] hover:bg-[#F0FDF4]">Sí, gracias</button>
                  <button type="button" onClick={() => setPaso(2)} className="min-h-10 rounded-lg bg-[#0439D9] text-sm font-semibold text-white hover:bg-[#0027a2]">No, quiero escribir</button>
                </div>
              </div>
              <button type="button" onClick={() => setPaso(0)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#45628D] hover:text-[#0439D9]"><ArrowLeft size={14} aria-hidden="true" />Elegir otro tema</button>
            </>
          ) : tema && (
            <form onSubmit={(e) => void enviar(e)} className="grid gap-3 sm:grid-cols-2" noValidate>
              <p className="flex items-center gap-2 sm:col-span-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#E9F1FF] px-3 py-1 text-xs font-semibold text-[#0439D9]"><tema.Icono size={14} aria-hidden="true" />{tema.titulo}</span>
                <button type="button" onClick={() => setPaso(0)} className="text-xs font-semibold text-[#45628D] underline hover:text-[#0439D9]">Cambiar tema</button>
              </p>
              <p className="text-xs leading-relaxed text-[#45628D] sm:col-span-2">
                Cuanto más claro sea tu mensaje, más rápido te ayudamos. {tema.pista.startsWith('Ej.') ? 'Por ejemplo, ' + tema.pista.slice(5) : tema.pista}
              </p>
              <label className="text-xs font-semibold text-[#011140]">Nombre completo
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={3} maxLength={120} autoComplete="name" className={`${CAMPO} mt-1 h-11`} />
              </label>
              <label className="text-xs font-semibold text-[#011140]">Correo para responderte
                <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required maxLength={150} autoComplete="email" inputMode="email" className={`${CAMPO} mt-1 h-11`} />
              </label>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#011140]">¿Qué pasa?
                  <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} required minLength={15} maxLength={1000} rows={4}
                    aria-describedby={`${id}-cuenta`} placeholder="Escribe aquí tu consulta"
                    className={`${CAMPO} mt-1 resize-y py-2`} />
                </label>
                <p id={`${id}-cuenta`} className="mt-0.5 text-right text-[11px] text-[#8BA0BF]">
                  {mensaje.trim().length < 15 ? `Mínimo 15 caracteres · ${mensaje.trim().length}/1000` : `${mensaje.trim().length}/1000`}
                </p>
              </div>
              {/* Trampa para bots: oculta para las personas. */}
              <input type="text" name="sitio" value={sitio} onChange={(e) => setSitio(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 sm:col-span-2">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <button type="button" onClick={() => setPaso(tema.pasos.length ? 1 : 0)}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-[#C9D8F2] px-4 text-sm font-semibold text-[#45628D] hover:bg-[#F1F6FF]"><ArrowLeft size={15} aria-hidden="true" />Atrás</button>
                <button type="submit" disabled={enviando || nombre.trim().length < 3 || !correo.includes('@') || mensaje.trim().length < 15}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0439D9] text-sm font-semibold text-white hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50">
                  {enviando ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                  {enviando ? 'Enviando…' : 'Enviar consulta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
