import { useEffect, useRef, useState, type RefObject } from 'react'
import QrScanner from 'qr-scanner'
import { extraerCodigoSis } from '../utils/extraerCodigoSis'

export type EstadoEscaner =
  | { status: 'iniciando' | 'escaneando' }
  | { status: 'leido'; codigo: string }
  | { status: 'error'; mensaje: string }

export const MENSAJE_SIN_HTTPS =
  'La cámara solo funciona en HTTPS o en localhost. Abre SIGEX con https:// para escanear.'
export const MENSAJE_SIN_CAMARA = 'No se encontró ninguna cámara en este dispositivo.'
export const MENSAJE_SIN_PERMISO =
  'No se pudo acceder a la cámara. Permite el acceso en el navegador o cierra otra aplicación que la esté usando.'
const MENSAJE_QR_VACIO = 'El código QR no contiene un código universitario.'

/**
 * Enciende la cámara (la trasera en celulares) sobre el <video> y lee un solo QR.
 * Al leerlo detiene la cámara y entrega el código SIS; al desmontar la apaga.
 * qr-scanner reporta cualquier fallo de getUserMedia como "Camera not found.",
 * por eso HTTPS y la existencia de cámara se comprueban antes de iniciar.
 */
export default function useEscanerQr(
  video: RefObject<HTMLVideoElement>,
  onLeer: (codigo: string) => void,
): EstadoEscaner {
  const camaraPermitida = window.isSecureContext && Boolean(navigator.mediaDevices)
  const [estado, setEstado] = useState<EstadoEscaner>(
    camaraPermitida ? { status: 'iniciando' } : { status: 'error', mensaje: MENSAJE_SIN_HTTPS },
  )
  const onLeerRef = useRef(onLeer)

  useEffect(() => {
    onLeerRef.current = onLeer
  })

  useEffect(() => {
    const elemento = video.current
    if (!camaraPermitida || !elemento) return
    let cancelado = false
    let leido = false
    let escaner: QrScanner | undefined

    const leer = (resultado: QrScanner.ScanResult) => {
      if (leido) return
      leido = true
      escaner?.stop()
      const codigo = extraerCodigoSis(resultado.data)
      if (!codigo) {
        setEstado({ status: 'error', mensaje: MENSAJE_QR_VACIO })
        return
      }
      setEstado({ status: 'leido', codigo })
      onLeerRef.current(codigo)
    }

    const iniciar = async () => {
      const hayCamara = await QrScanner.hasCamera()
      if (cancelado) return
      if (!hayCamara) {
        setEstado({ status: 'error', mensaje: MENSAJE_SIN_CAMARA })
        return
      }
      escaner = new QrScanner(elemento, leer, { preferredCamera: 'environment', returnDetailedScanResult: true })
      try {
        await escaner.start()
        if (!cancelado) setEstado({ status: 'escaneando' })
      } catch {
        if (!cancelado) setEstado({ status: 'error', mensaje: MENSAJE_SIN_PERMISO })
      }
    }

    void iniciar()
    return () => {
      cancelado = true
      escaner?.destroy()
    }
  }, [video, camaraPermitida])

  return estado
}
