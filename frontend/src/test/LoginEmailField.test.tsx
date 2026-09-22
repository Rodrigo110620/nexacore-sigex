import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import LoginEmailField from '../components/auth/LoginEmailField'
import { buildLoginEmail } from '../utils/validators'

function LoginEmailFieldWrapper() {
  const [value, setValue] = useState('')
  return <LoginEmailField value={value} error="" onChange={setValue} onBlur={() => {}} />
}

describe('buildLoginEmail', () => {
  it('completa el dominio institucional si no hay @', () => {
    expect(buildLoginEmail('201904725')).toBe('201904725@est.umss.edu')
  })

  it('respeta el correo completo si el usuario escribe @', () => {
    expect(buildLoginEmail('admin.tis@umss.edu.bo')).toBe('admin.tis@umss.edu.bo')
  })

  it('recorta espacios y no completa un valor vacío', () => {
    expect(buildLoginEmail('  juan.perez  ')).toBe('juan.perez@est.umss.edu')
    expect(buildLoginEmail('   ')).toBe('')
  })
})

describe('LoginEmailField', () => {
  it('muestra el dominio mientras no se escriba @', () => {
    render(<LoginEmailFieldWrapper />)

    const input = screen.getByLabelText('CORREO ELECTRÓNICO')
    fireEvent.change(input, { target: { value: '201904725' } })

    expect(screen.getByText('@est.umss.edu')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-describedby', 'login-email-domain')
  })

  it('oculta el dominio cuando se escribe un correo completo', () => {
    render(<LoginEmailFieldWrapper />)

    const input = screen.getByLabelText('CORREO ELECTRÓNICO')
    fireEvent.change(input, { target: { value: 'admin.tis@umss.edu.bo' } })

    expect(screen.queryByText('@est.umss.edu')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})
