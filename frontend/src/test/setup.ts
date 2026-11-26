import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { vi } from 'vitest'

// findBy…/waitFor esperan 1 s por defecto: en los runners del CI, más lentos, no alcanzaba.
configure({ asyncUtilTimeout: 5000 })

// jsdom no implementa scrollIntoView; los modales de registro lo invocan tras un setTimeout.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// Evitar peticiones reales al backend al verificar unicidad de CI/correo en pruebas.
vi.mock('../services/userService', () => ({
  verificarDuplicados: vi.fn().mockResolvedValue({}),
}))
