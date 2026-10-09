import '@testing-library/jest-dom'

// jsdom no implementa scrollIntoView; los modales de registro lo invocan tras un setTimeout.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
