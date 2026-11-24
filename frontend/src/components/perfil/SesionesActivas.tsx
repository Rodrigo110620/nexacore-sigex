import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, LaptopMinimal, LoaderCircle, LogOut, Smartphone } from 'lucide-react'
import { cerrarOtrasSesiones, cerrarSesionDe, listarMisSesiones, type SesionDto } from '../../services/sesionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

const MOVIL = /Android|iPhone|iPad/

/**
 * Mi perfil → Sesiones abiertas (V62): en qué navegadores y dispositivos está abierta la cuenta. Si hay otra que el
 * usuario no reconoce, la cierra (su token deja de servir) y cambia la contraseña.
 */
export default function SesionesActivas() {
  const [sesiones, setSesiones] = useState<SesionDto[] | null>(null)
  const [error, setError] = useState('')
  const [cerrando, setCerrando] = useState<string | null>(null)

  const cargar = useCallback(() => {
    listarMisSesiones()
      .then((l) => { setSesiones(l); setError('') })
      .catch(() => setError('No se pudieron cargar tus sesiones.'))
  }, [])
  useEffect(() => {
    cargar()
    // Al volver a esta pestaña se actualiza: pudo abrirse la cuenta en otro dispositivo mientras tanto.
    window.addEventListener('focus', cargar)
    return () => window.removeEventListener('focus', cargar)
  }, [cargar])

  const cerrar = async (id: string | 'otras') => {
    setCerrando(id)
    setError('')
    try {
      if (id === 'otras') await cerrarOtrasSesiones()
      else await cerrarSesionDe(id)
      cargar()
    } catch {
      setError('No se pudo cerrar la sesión. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setCerrando(null)
    }
  }

  const otras = sesiones?.filter((s) => !s.actual) ?? []

  return (
    <section aria-labelledby="sesiones-titulo" className="rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="sesiones-titulo" className="text-base font-bold text-[#011140]">Sesiones abiertas</h2>
          <p className="text-xs text-[#627A9B]">
            Dónde está abierta tu cuenta. Si ves una que no reconoces, ciérrala y cambia tu contraseña.
          </p>
        </div>
        {otras.length > 0 && (
          <button type="button" onClick={() => void cerrar('otras')} disabled={cerrando !== null}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#FDA29B] px-3 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-50">
            {cerrando === 'otras' ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <LogOut size={14} aria-hidden="true" />}
            Cerrar las demás
          </button>
        )}
      </div>

      {otras.length > 0 && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-[#FFFAEB] px-3 py-2 text-xs text-[#7A2E0E]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Tu cuenta está abierta en {otras.length === 1 ? 'otro dispositivo' : `${otras.length} dispositivos más`} al mismo tiempo.
          Lo que se registre desde cada uno queda con su navegador y dispositivo.
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-[#B42318]">{error}</p>}

      {sesiones === null && !error ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-[#627A9B]"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Cargando…</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#EEF2F8]">
          {(sesiones ?? []).map((s) => {
            const Icono = MOVIL.test(s.dispositivo) ? Smartphone : LaptopMinimal
            return (
              <li key={s.idSesion} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icono size={18} className="shrink-0 text-[#45628D]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#011140]">
                      {s.dispositivo}
                      {s.actual && <span className="ml-2 rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[11px] font-semibold text-[#05603A]">Este dispositivo</span>}
                    </p>
                    <p className="break-words text-xs text-[#627A9B]">
                      Inició {fechaHoraNumerica(s.iniciadaEn)} · última actividad {fechaHoraNumerica(s.ultimaActividad)}{s.ip ? ` · IP ${s.ip}` : ''}
                    </p>
                  </div>
                </div>
                {!s.actual && (
                  <button type="button" onClick={() => void cerrar(s.idSesion)} disabled={cerrando !== null}
                    aria-label={`Cerrar la sesión de ${s.dispositivo}`}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-50">
                    {cerrando === s.idSesion && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
                    Cerrar
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
