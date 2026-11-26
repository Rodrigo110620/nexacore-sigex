import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRegisterUserForm } from '../components/admin/useRegisterUserForm'
import type { FormErrors } from '../types/usuario.types'

/** Renderiza el hook aislado para probar su lógica de validación por etapas. */
function montarHook() {
  return renderHook(() => useRegisterUserForm())
}

describe('Validación por etapas en registro de usuario (bug Sprint#4)', () => {
  it('no avanza de paso 2 a paso 3 si hay campos vacíos o inválidos', () => {
    const { result } = montarHook()

    // Paso 1: el rol ya viene por defecto (DOCENTE), por lo que goNext avanza a paso 2.
    act(() => {
      result.current.goNext()
    })
    expect(result.current.step).toBe(2)

    // Paso 2: dejamos todos los campos vacíos e intentamos avanzar.
    let errores: FormErrors | null = null;
    act(() => {
      errores = result.current.goNext()
    })

    // Debe devolver errores y NO avanzar de paso.
    expect(errores).toBeTruthy()
    expect(Object.keys(errores!).length).toBeGreaterThan(0)
    expect(result.current.step).toBe(2)
    expect(result.current.currentStepHasErrors).toBe(true)
  })

  it('avanza de paso 2 a paso 3 cuando los campos de la etapa 2 son válidos', () => {
    const { result } = montarHook()

    // Llegamos al paso 2 (rol por defecto válido).
    act(() => {
      result.current.goNext()
    })
    expect(result.current.step).toBe(2)

    // Rellenamos la etapa 2 con datos válidos (cada cambio en su propio act para que React encadene el estado).
    act(() => {
      result.current.handleChange('nombre', 'Juan')
    })
    act(() => {
      result.current.handleChange('apellidos', 'Pérez Quispe')
    })
    act(() => {
      result.current.handleChange('documento', '5544332')
    })
    act(() => {
      result.current.handleChange('email', 'juan.perez@umss.edu')
    })

    let errores: FormErrors | null = null;
    act(() => {
      errores = result.current.goNext()
    })

    expect(errores).toBeNull()
    expect(result.current.step).toBe(3)
    expect(result.current.currentStepHasErrors).toBe(false)
  })

  it('no avanza de paso 1 si no se selecciona un rol', () => {
    const { result } = montarHook()

    // Vaciamos el rol para simular que no se seleccionó.
    act(() => {
      result.current.handleChange('rol', '')
    })

    let errores: FormErrors | null = null;
    act(() => {
      errores = result.current.goNext()
    })

    expect(errores).toBeTruthy()
    expect(result.current.step).toBe(1)
    expect(result.current.currentStepHasErrors).toBe(true)
  })

  it('goNext desde el paso 4 devuelve null (no hay validador propio en ese paso)', () => {
    const { result } = montarHook()

    // Paso 1 → 2: rol CONTROL (válido).
    act(() => {
      result.current.handleChange('rol', 'CONTROL')
      result.current.goNext()
    })
    expect(result.current.step).toBe(2)

    // Paso 2 → 3: datos personales válidos.
    act(() => {
      result.current.handleChange('nombre', 'Juan')
    })
    act(() => {
      result.current.handleChange('apellidos', 'Pérez')
    })
    act(() => {
      result.current.handleChange('documento', '5544332')
    })
    act(() => {
      result.current.handleChange('email', 'juan@umss.edu')
    })
    act(() => {
      result.current.goNext()
    })
    expect(result.current.step).toBe(3)

    // Paso 3 → 4: CONTROL no requiere materias ni confirmaAdmin, así que avanza.
    act(() => {
      result.current.goNext()
    })
    expect(result.current.step).toBe(4)

    // Desde el paso 4, goNext devuelve null.
    let resultado: FormErrors | null = null;
    act(() => {
      resultado = result.current.goNext()
    })

    expect(resultado).toBeNull()
  })

  it('handleBlur en un campo vacío limpia el error sin dejar claves con undefined', () => {
    const { result } = montarHook()

    // Llegamos al paso 2 y forzamos errores con goNext (sí setea el estado de errores).
    act(() => {
      result.current.goNext() // paso 1 → 2
    })
    act(() => {
      result.current.goNext() // campos vacíos → errores en step 2
    })
    expect(result.current.errors.nombre).toBeDefined()
    expect(result.current.currentStepHasErrors).toBe(true)

    // Borramos el nombre y hacemos blur: debe eliminar la clave, no dejar undefined.
    act(() => {
      result.current.handleChange('nombre', '')
    })
    act(() => {
      result.current.handleBlur('nombre')
    })

    // La clave 'nombre' no debe existir en el estado de errores (ni como undefined).
    expect(Object.keys(result.current.errors)).not.toContain('nombre')
    expect(!('nombre' in result.current.errors)).toBe(true)
  })
})
