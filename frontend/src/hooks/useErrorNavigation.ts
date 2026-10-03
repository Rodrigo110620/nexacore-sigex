import { useCallback, useState } from 'react'

export type TooltipType = 'info' | 'error' | 'success'

interface UseErrorNavigationResult {
  showTooltip: boolean
  tooltipMessage: string
  tooltipType: TooltipType
  startNavigation: (
    errors: Record<string, string | undefined>,
    fieldOrder: string[],
  ) => void
  handleFieldValidated: (
    field: string,
    isOk: boolean,
    message: string,
    allErrors: Record<string, string | undefined>,
    fieldOrder: string[],
  ) => void
  hideTooltip: () => void
}

export function useErrorNavigation(): UseErrorNavigationResult {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipMessage, setTooltipMessage] = useState('')
  const [tooltipType, setTooltipType] = useState<TooltipType>('info')

  const focusField = useCallback((field: string) => {
    setTimeout(() => {
      const input = document.querySelector(
        `[name="${field}"]`,
      ) as HTMLInputElement | null
      if (input) {
        input.focus()
        input.select()
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 150)
  }, [])

  const startNavigation = useCallback(
    (
      errors: Record<string, string | undefined>,
      fieldOrder: string[],
    ) => {
      // Buscar el primer error según el orden de campos
      const firstErrorField = fieldOrder.find((f) => errors[f])
      if (!firstErrorField) return

      const message = errors[firstErrorField] ?? ''
      setTooltipMessage(`Corrige: ${message} · Presiona Tab`)
      setTooltipType('info')
      setShowTooltip(true)
      focusField(firstErrorField)
    },
    [focusField],
  )

  const handleFieldValidated = useCallback(
    (
      currentField: string,
      isOk: boolean,
      message: string,
      allErrors: Record<string, string | undefined>,
      fieldOrder: string[],
    ) => {
      if (!isOk) {
        // Sigue mal: mostrar tooltip rojo
        setTooltipMessage(`Aún tiene error: ${message}`)
        setTooltipType('error')
        setShowTooltip(true)
        return
      }

      // El campo está OK. Buscar el siguiente con error
      const currentIndex = fieldOrder.indexOf(currentField)
      const nextErrorField = fieldOrder
        .slice(currentIndex + 1)
        .find((f) => allErrors[f])

      if (nextErrorField) {
        // Hay otro error: ir a ese campo
        const nextMessage = allErrors[nextErrorField] ?? ''
        setTooltipMessage(`Corrige: ${nextMessage} · Presiona Tab`)
        setTooltipType('info')
        setShowTooltip(true)
        focusField(nextErrorField)
      } else {
        // No hay más errores
        setTooltipMessage('¡Todo listo! Presiona Siguiente')
        setTooltipType('success')
        setShowTooltip(true)
        setTimeout(() => setShowTooltip(false), 3500)
      }
    },
    [focusField],
  )

  const hideTooltip = useCallback(() => setShowTooltip(false), [])

  return {
    showTooltip,
    tooltipMessage,
    tooltipType,
    startNavigation,
    handleFieldValidated,
    hideTooltip,
  }
}