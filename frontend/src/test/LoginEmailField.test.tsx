import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import LoginEmailField from '../components/auth/LoginEmailField'
import { buildLoginEmail, validateLoginEmail } from '../utils/validators'

function LoginEmailFieldWrapper() {
  const [value, setValue] = useState('')
  return <LoginEmailField value={value} error="" onChange={setValue} onBlur={() => {}} />
}

describe('buildLoginEmail', () => {
  it('el código SIS solo (9 dígitos) se completa con el dominio de estudiantes', () => {
    expect(buildLoginEmail('201904725')).toBe('201904725@est.umss.edu')
    expect(buildLoginEmail('  201904725  ')).toBe('201904725@est.umss.edu')
  })

  it('respeta el correo completo si el usuario escribe @', () => {
    expect(buildLoginEmail('admin.tis@umss.edu.bo')).toBe('admin.tis@umss.edu.bo')
  })

  it('un usuario sin dominio no se completa: debe elegirlo', () => {
    expect(buildLoginEmail('  juan.perez  ')).toBe('juan.perez')
    expect(buildLoginEmail('   ')).toBe('')
  })
})

describe('validateLoginEmail', () => {
  it('pide elegir el dominio si no es un código SIS', () => {
    expect(validateLoginEmail('juan.perez')).toBe('Elige tu dominio: @umss.edu (personal) o @est.umss.edu (estudiantes)')
  })

  it('acepta el código SIS solo y los correos completos', () => {
    expect(validateLoginEmail('201904725')).toBe('')
    expect(validateLoginEmail('juan.perez@umss.edu')).toBe('')
    expect(validateLoginEmail('201904725@est.umss.edu')).toBe('')
  })
})

describe('LoginEmailField', () => {
  it('ofrece los dos dominios mientras no se escriba @ y completa el elegido', () => {
    render(<LoginEmailFieldWrapper />)

    const input = screen.getByLabelText('CORREO ELECTRÓNICO')
    fireEvent.change(input, { target: { value: 'juan.perez' } })
    expect(input).toHaveAttribute('aria-describedby', 'login-email-domain')
    expect(screen.getByRole('button', { name: 'Completar con @est.umss.edu (estudiante)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Completar con @umss.edu (personal)' }))
    expect(input).toHaveValue('juan.perez@umss.edu')
  })

  it('oculta los dominios cuando se escribe un correo completo', () => {
    render(<LoginEmailFieldWrapper />)

    const input = screen.getByLabelText('CORREO ELECTRÓNICO')
    fireEvent.change(input, { target: { value: 'admin.tis@umss.edu.bo' } })

    expect(screen.queryByRole('button', { name: /Completar con/ })).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})
