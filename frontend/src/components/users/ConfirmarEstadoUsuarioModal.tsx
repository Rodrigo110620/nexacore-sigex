import { useEffect, useState } from 'react'
import { Ban, CircleAlert, LoaderCircle, LockOpen } from 'lucide-react'
import { estaBloqueado, puedeBloquear } from './userStatus.utils'
import type { UserListItem } from '../../types/user'

interface ConfirmarEstadoUsuarioModalProps {
  user: UserListItem
  onCancel: () => void
  /** Recibe el nuevo estado (true = activo). Si lanza un Error, su mensaje se muestra en el modal. */
  onConfirm: (activo: boolean) => Promise<void>
}

/** Confirma bloquear o desbloquear a un usuario desde el listado. */
export default function ConfirmarEstadoUsuarioModal({ user, onCancel, onConfirm }: ConfirmarEstadoUsuarioModalProps) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bloquear = puedeBloquear(user)
  const fullName = `${user.nombre} ${user.apellidos}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [guardando, onCancel])

  const confirmar = async () => {
    setGuardando(true)
    setError(null)
    try {
      await onConfirm(!bloquear)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado del usuario.')
      setGuardando(false)
    }
  }

  const detalle = bloquear
    ? 'No podrá iniciar sesión y su sesión actual se cerrará en su siguiente acción. Sus registros se conservan.'
    : estaBloqueado(user) && user.estado === 'activo'
      ? 'Se levantará el bloqueo temporal por intentos fallidos y podrá volver a iniciar sesión.'
      : 'La cuenta quedará activa y podrá volver a iniciar sesión.'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#011140]/40 p-4"
      role="presentation"
      onClick={() => !guardando && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="estado-usuario-titulo"
        aria-describedby="estado-usuario-detalle"
        className="w-full max-w-sm rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              bloquear ? 'bg-[#FDECEC] text-[#B91C1C]' : 'bg-[#ECFDF5] text-[#159570]'
            }`}
          >
            {bloquear ? <Ban size={18} /> : <LockOpen size={18} />}
          </span>
          <div className="min-w-0">
            <h3 id="estado-usuario-titulo" className="text-sm font-bold text-[#011140]">
              {bloquear ? '¿Bloquear a este usuario?' : '¿Desbloquear a este usuario?'}
            </h3>
            <p className="mt-1 break-words text-sm font-semibold text-[#011140]">{fullName}</p>
            <p id="estado-usuario-detalle" className="mt-2 text-xs text-gray-600">{detalle}</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-1 text-xs text-[#B91C1C]">
            <CircleAlert size={13} aria-hidden="true" className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={guardando}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-[#011140] hover:bg-gray-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-70 ${
              bloquear ? 'bg-red-600 hover:bg-red-700' : 'bg-[#159570] hover:bg-[#0F7A5B]'
            }`}
          >
            {guardando && <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />}
            {bloquear ? 'Bloquear' : 'Desbloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}
