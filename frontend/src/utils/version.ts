import paquete from '../../package.json'

/** Versión de SIGEX que se muestra en el pie (la del package.json; 0.4 = Sprint 4). */
export const VERSION_SIGEX = paquete.version.split('.').slice(0, 2).join('.')

/** Pie corto de las pantallas de acceso en el celular. */
export const PIE_CORTO = `SIGEX v${VERSION_SIGEX} · UMSS`
