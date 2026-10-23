import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** QR con la dirección de inicio de sesión de SIGEX, para seguir en el celular cuando la PC no tiene cámara. */
export default function QrContinuarCelular() {
  const direccion = `${window.location.origin}/login`
  const [imagen, setImagen] = useState('')

  useEffect(() => {
    let vigente = true
    QRCode.toDataURL(direccion, { margin: 1, width: 176, color: { dark: '#011140', light: '#FFFFFF' } })
      .then((url) => { if (vigente) setImagen(url) })
      .catch(() => { /* sin QR queda la dirección escrita */ })
    return () => { vigente = false }
  }, [direccion])

  return (
    <div className="flex flex-col items-center gap-2">
      {imagen ? (
        <img src={imagen} alt="Código QR para abrir SIGEX en tu celular" className="h-44 w-44 rounded-lg border border-[#D8E3F5] bg-white p-1" />
      ) : (
        <div aria-hidden="true" className="h-44 w-44 animate-pulse rounded-lg bg-[#E9F1FF]" />
      )}
      <p className="break-all text-xs font-semibold text-[#0439D9]">{direccion}</p>
    </div>
  )
}
