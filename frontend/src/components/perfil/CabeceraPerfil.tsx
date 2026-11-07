import { useRef, useState } from 'react'
import axios from 'axios'
import { Camera, LoaderCircle, Mail, ShieldCheck, Trash2 } from 'lucide-react'
import FotoEstudiante from '../estudiantes/FotoEstudiante'
import { quitarMiFoto, subirMiFoto } from '../../services/profileService'
import { prepararFoto, validarArchivoFoto } from '../../utils/fotoEstudiante'

const ROL: Record<string, string> = { ADMIN: 'Administrador', DOCENTE: 'Docente', CONTROL: 'Personal de control' }

/**
 * Cabecera de Mi perfil: la foto de perfil (opcional pero recomendable; si no hay, las iniciales), el nombre, los
 * roles y el correo. La foto se reduce en el navegador antes de subirla, igual que la del estudiante.
 */
export default function CabeceraPerfil({ nombre, iniciales, email, roles, fotoUrl, onFotoCambiada }: {
  nombre: string
  iniciales: string
  email: string
  roles: string[]
  fotoUrl: string | null
  onFotoCambiada: () => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [version, setVersion] = useState(0)
  const [guardando, setGuardando] = useState<'subir' | 'quitar' | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return
    const invalido = validarArchivoFoto(archivo)
    if (invalido) { setMensaje({ tipo: 'error', texto: invalido }); return }
    setGuardando('subir')
    setMensaje(null)
    try {
      await subirMiFoto(await prepararFoto(archivo))
      setVersion((v) => v + 1)
      setMensaje({ tipo: 'ok', texto: 'Tu foto de perfil se actualizó.' })
      onFotoCambiada()
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (axios.isAxiosError(err) && err.response?.data?.mensaje) || 'No se pudo subir la foto. Intenta con otra imagen.' })
    } finally {
      setGuardando(null)
      if (entrada.current) entrada.current.value = ''
    }
  }

  const quitar = async () => {
    setGuardando('quitar')
    setMensaje(null)
    try {
      await quitarMiFoto()
      setMensaje({ tipo: 'ok', texto: 'Quitaste tu foto de perfil.' })
      onFotoCambiada()
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo quitar la foto.' })
    } finally {
      setGuardando(null)
    }
  }

  return (
    <section aria-label="Mi perfil" className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#0B2FB8] via-[#2563EB] to-[#6D28D9] p-5 text-white shadow-[0_10px_28px_-6px_rgba(37,64,217,0.45)] sm:p-7">
      <span className="pointer-events-none absolute -right-10 -top-28 h-64 w-64 rounded-full bg-white/[0.08]" aria-hidden="true" />
      <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="relative shrink-0">
          <FotoEstudiante key={`${fotoUrl}-${version}`} fotoUrl={fotoUrl ? `${fotoUrl}?v=${version}` : null} nombre={nombre} iniciales={iniciales} ampliable
            className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/20 text-3xl font-bold text-white ring-4 ring-white/40 sm:h-32 sm:w-32" />
          <button type="button" onClick={() => entrada.current?.click()} disabled={guardando !== null}
            aria-label={fotoUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
            className="absolute bottom-1 right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0439D9] shadow-md hover:bg-[#EEF3FF] disabled:opacity-60">
            {guardando === 'subir' ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
          </button>
          <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1}
            aria-label="Elegir foto de perfil" onChange={(e) => void elegir(e.target.files?.[0])} />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold sm:text-[28px]">{nombre}</h2>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {roles.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                <ShieldCheck size={13} aria-hidden="true" />{ROL[r] ?? r}
              </span>
            ))}
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 break-all text-sm text-[#DBE6FF]"><Mail size={14} aria-hidden="true" />{email}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs sm:justify-start">
            {fotoUrl ? (
              <button type="button" onClick={() => void quitar()} disabled={guardando !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20 disabled:opacity-60">
                <Trash2 size={13} aria-hidden="true" />Quitar foto
              </button>
            ) : (
              <p className="text-[#DBE6FF]">Agrega una foto de perfil (opcional, recomendable): así te reconocen tus compañeros.</p>
            )}
          </div>
          {mensaje && (
            <p role={mensaje.tipo === 'error' ? 'alert' : 'status'}
              className={`mt-2 inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${mensaje.tipo === 'error' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#15803D]'}`}>
              {mensaje.texto}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
