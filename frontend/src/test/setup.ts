import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

// findBy…/waitFor esperan 1 s por defecto: en los runners del CI, más lentos, no alcanzaba.
configure({ asyncUtilTimeout: 5000 })

// jsdom no implementa scrollIntoView; los modales de registro lo invocan tras un setTimeout.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
