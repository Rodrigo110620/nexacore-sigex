import { useState } from 'react'
import { Mail, QrCode, RefreshCw } from 'lucide-react'
import ResultadoModal, { type Resultado } from '../ui/ResultadoModal'
import { mensajeDeError, regenerarQr } from '../../services/fotoRevisionService'
import { isOffline } from '../../utils/examFormUtils'

interface RegenerarQrModalProps {
  idEstudiante: number
  nombre: string
  email: string | null | undefined
  onClose: () => void
}

/** CTA-02: revoca el QR del estudiante y le envía uno nuevo a su correo institucional. */
export default function RegenerarQrModal({ idEstudiante, nombre, email, onClose }: RegenerarQrModalProps) {
  const [saving, setSaving] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const confirmar = async () => {
    if (isOffline()) {
      setResultado({ tipo: 'offline', mensaje: `No se regeneró el QR de ${nombre}. Su QR actual sigue sin cambios.` })
      return
    }
    setSaving(true)
    try {
      await regenerarQr(idEstudiante)
      setResultado({
        tipo: 'exito',
        mensaje: `Se envió un QR nuevo a ${email || 'su correo institucional'}. El QR anterior de ${nombre} ya no funciona.`,
      })
    } catch (err) {
      setResultado({
        tipo: 'error',
        mensaje: mensajeDeError(err, `No pudimos regenerar el QR de ${nombre}. Su QR actual sigue sin cambios; inténtalo de nuevo en unos minutos.`),
      })
    } finally {
      setSaving(false)
    }
  }

  if (resultado) {
    return (
      <ResultadoModal
        resultado={resultado}
        onClose={() => { if (resultado.tipo === 'exito') onClose(); else setResultado(null) }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="regenerar-qr-titulo" className="w-full max-w-sm rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
            <QrCode size={18} aria-hidden="true" />
          </span>
          <h3 id="regenerar-qr-titulo" className="text-base font-bold text-[#011140]">¿Regenerar y reenviar el QR?</h3>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#334155]">
          El QR actual de {nombre} dejará de funcionar de inmediato y se enviará uno nuevo a su correo institucional.
        </p>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
          <Mail size={16} className="shrink-0 text-[#627A9B]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] text-[#627A9B]">Se enviará a</p>
            <p className="truncate text-sm font-semibold text-[#0439D9]">{email || 'Correo institucional no registrado'}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#627A9B]">
          Úsalo si el estudiante no recibió el correo o si su QR pudo ser compartido.
        </p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-[#D8E3F5] py-2.5 text-sm font-semibold text-[#011140]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={saving || !email}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0439D9] py-2.5 text-sm font-semibold text-white hover:bg-[#032db0] disabled:opacity-60"
          >
            <RefreshCw size={15} className={saving ? 'animate-spin' : ''} aria-hidden="true" />
            {saving ? 'Enviando…' : 'Regenerar y enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
