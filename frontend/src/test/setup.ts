import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { vi } from 'vitest'

// findBy…/waitFor esperan 1 s por defecto: en los runners del CI, más lentos, no alcanzaba.
configure({ asyncUtilTimeout: 5000 })

// jsdom no implementa scrollIntoView; los modales de registro lo invocan tras un setTimeout.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// Evitar peticiones HTTP reales al backend en pruebas de frontend.
// Cada prueba que necesite una respuesta específica puede sobrescribir con
// vi.mocked(api.get).mockResolvedValueOnce(...) o mockRejectedValueOnce(...).
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

// Evitar peticiones reales al backend al verificar unicidad de CI/correo en pruebas.
vi.mock('../services/userService', () => ({
  verificarDuplicados: vi.fn().mockResolvedValue({}),
}))
