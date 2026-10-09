import { useEffect, useState } from 'react'

/**
 * True solo en teléfono/tablet táctil.
 * En laptop/PC (aunque la ventana sea angosta) se considera escritorio.
 */
function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  const ua = navigator.userAgent || ''
  const uaMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
  // iPadOS 13+ a veces se reporta como Mac; el táctil lo delata
  const iPadDesktopUa = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const noHover = window.matchMedia('(hover: none)').matches

  return uaMobile || iPadDesktopUa || (coarsePointer && noHover)
}

export function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(detectMobileDevice)

  useEffect(() => {
    const update = () => setIsMobile(detectMobileDevice())
    update()

    const coarse = window.matchMedia('(pointer: coarse)')
    const hover = window.matchMedia('(hover: none)')
    coarse.addEventListener('change', update)
    hover.addEventListener('change', update)
    window.addEventListener('orientationchange', update)

    return () => {
      coarse.removeEventListener('change', update)
      hover.removeEventListener('change', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return isMobile
}
