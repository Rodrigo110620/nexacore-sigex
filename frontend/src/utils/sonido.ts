/**
 * Avisos sonoros del control de ingreso (Web Audio, sin archivos): dos tonos agudos al autorizar y un
 * tono grave al denegar o cuando el QR no sirve. Se pueden silenciar desde el control de ingreso.
 */
const CLAVE = 'sigex:sonidoControl'

let contexto: AudioContext | null = null

export function sonidoActivo(): boolean {
  try { return localStorage.getItem(CLAVE) !== '0' } catch { return true }
}

export function activarSonido(activo: boolean) {
  try { localStorage.setItem(CLAVE, activo ? '1' : '0') } catch { /* sin almacenamiento */ }
}

function tono(ctx: AudioContext, frecuencia: number, desde: number, duracion: number, tipo: OscillatorType) {
  const osc = ctx.createOscillator()
  const volumen = ctx.createGain()
  osc.type = tipo
  osc.frequency.value = frecuencia
  // Entrada y salida suaves: sin «clic» al empezar y terminar.
  volumen.gain.setValueAtTime(0.0001, ctx.currentTime + desde)
  volumen.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + desde + 0.02)
  volumen.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + desde + duracion)
  osc.connect(volumen).connect(ctx.destination)
  osc.start(ctx.currentTime + desde)
  osc.stop(ctx.currentTime + desde + duracion + 0.02)
}

export function sonar(resultado: 'autorizado' | 'denegado') {
  if (!sonidoActivo()) return
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    contexto ??= new Ctor()
    void contexto.resume?.()
    if (resultado === 'autorizado') {
      tono(contexto, 880, 0, 0.12, 'sine')
      tono(contexto, 1320, 0.13, 0.16, 'sine')
    } else {
      tono(contexto, 220, 0, 0.35, 'square')
    }
  } catch { /* sin audio: el aviso visual y la vibración siguen */ }
}
