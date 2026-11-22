import { useEffect, useState } from 'react'
import useEnVivo from './useEnVivo'
import { reporteIntentos } from '../services/intentoIngresoService'
import { listarExpulsionesExamen, listarExpulsionesTodas } from '../services/expulsionService'
import { listarExcepcionesNoHabilitado, listarExcepcionesTodas } from '../services/excepcionNoHabilitadoService'
import { listarFotosReportadas, textoMotivoReporte } from '../services/fotoRevisionService'
import { reporteModificacionesInhabilitados } from '../services/modificacionInhabilitadoService'
import { reporteIngresos } from '../services/ingresoService'

/** Motivo escrito a mano, corto para el gráfico (primera letra en mayúscula). */
const recortar = (texto: string) => {
  const t = (texto ?? '').trim().replace(/\s+/g, ' ')
  const corto = t.length > 34 ? `${t.slice(0, 33)}…` : t
  return corto.charAt(0).toUpperCase() + corto.slice(1)
}

/** Cuántos hay en total y cuántos se registraron hoy y ayer (hora de Bolivia, como los guarda el servidor). */
export interface Cifra {
  /** En el período elegido (o en total, sin período). */
  total: number
  hoy: number
  ayer: number
  /** Cuántos llegaron hoy en cada hora (0 a 23), para el gráfico. */
  porHora: number[]
  /** Lo mismo, de ayer: para comparar en el gráfico. */
  porHoraAyer: number[]
  /** Fecha y hora del último registro de hoy ("2026-11-18T21:31:15"), o null. */
  ultimoHoy: string | null
  /** En el período elegido, cuántos hubo por motivo (de mayor a menor; los demás juntos en «Otros»). */
  porMotivo: { etiqueta: string; n: number }[]
}

/** Agrupa por motivo: los 4 más frecuentes y el resto en «Otros». */
function motivosDe(etiquetas: string[]): { etiqueta: string; n: number }[] {
  const cuenta = new Map<string, number>()
  etiquetas.forEach((e) => { const k = e.trim() || 'Sin motivo'; cuenta.set(k, (cuenta.get(k) ?? 0) + 1) })
  const orden = [...cuenta].sort((a, b) => b[1] - a[1]).map(([etiqueta, n]) => ({ etiqueta, n }))
  if (orden.length <= 5) return orden
  return [...orden.slice(0, 4), { etiqueta: 'Otros', n: orden.slice(4).reduce((t, m) => t + m.n, 0) }]
}

const TEXTO_TIPO_INTENTO: Record<string, string> = {
  NO_CORRESPONDE: 'No inscrito en la materia', AULA_INCORRECTA: 'Aula incorrecta', NO_HABILITADO: 'No habilitado',
}

export type ClaveResumen = 'intentos' | 'expulsiones' | 'excepciones' | 'fotos' | 'modificaciones' | 'ingresos-qr' | 'ingresos-manual'
export type ResumenReportes = Record<ClaveResumen, Cifra | null>

const VACIO: ResumenReportes = { intentos: null, expulsiones: null, excepciones: null, fotos: null, modificaciones: null, 'ingresos-qr': null, 'ingresos-manual': null }

/** "2026-11-16" del día local, con {@code diasAtras} días antes. */
function dia(diasAtras: number): string {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

/** Cuenta los de hoy y ayer por la fecha de cada registro ("2026-11-16T08:05:00"). */
function porHoraDe(fechas: (string | null | undefined)[], diasAtras = 0): number[] {
  const fecha = dia(diasAtras)
  const horas = Array<number>(24).fill(0)
  fechas.forEach((f) => { if (f?.startsWith(fecha)) horas[Number(f.slice(11, 13))] += 1 })
  return horas
}

function ultimoDeHoy(fechas: (string | null | undefined)[]): string | null {
  const hoy = dia(0)
  return fechas.filter((f): f is string => !!f?.startsWith(hoy)).sort().pop() ?? null
}

function cifraDe(fechas: (string | null | undefined)[], desde?: string, motivos: string[] = []): Cifra {
  const hoy = dia(0)
  const ayer = dia(1)
  return {
    total: desde ? fechas.filter((f) => f != null && f >= desde).length : fechas.length,
    hoy: fechas.filter((f) => f?.startsWith(hoy)).length,
    ayer: fechas.filter((f) => f?.startsWith(ayer)).length,
    porHora: porHoraDe(fechas),
    porHoraAyer: porHoraDe(fechas, 1),
    ultimoHoy: ultimoDeHoy(fechas),
    porMotivo: motivosDe(motivos.filter((_, i) => !desde || (fechas[i] ?? '') >= desde)),
  }
}

/** Inicio del período del filtro de Reportes ("2026-11-10T00:00:00"), o undefined para «Todo». */
export type Periodo = 'todo' | 'hoy' | '7d' | 'mes'
export function desdePeriodo(periodo: Periodo): string | undefined {
  if (periodo === 'todo') return undefined
  if (periodo === 'hoy') return `${dia(0)}T00:00:00`
  if (periodo === '7d') return `${dia(6)}T00:00:00`
  return `${dia(0).slice(0, 8)}01T00:00:00`
}

/**
 * Resumen de Reportes: cuántos intentos incorrectos, expulsiones, excepciones y fotos reportadas hay
 * (del examen elegido o de todos los que el usuario puede ver) y cuántos llegaron hoy y ayer. Se
 * recalcula en vivo con cada cambio que afecte a esos exámenes.
 */
export default function useResumenReportes(idExamen: number | null, desde?: string): ResumenReportes {
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<{ clave: string; resumen: ResumenReportes }>()
  const clave = `${idExamen ?? 'todos'}|${desde ?? ''}`
  useEnVivo(
    (c) => c.tipo === 'FOTO' || c.tipo === 'FOTO_REPORTADA' || (idExamen == null ? c.idExamen != null : c.idExamen === idExamen),
    () => setRecarga((n) => n + 1),
  )

  useEffect(() => {
    let vigente = true
    const hoy = `${dia(0)}T00:00:00`
    const ayer = `${dia(1)}T00:00:00`
    // Cada parte por separado: si una falla, las demás se muestran igual.
    // Desde ayer, hasta 100: alcanzan para el gráfico por hora de hoy y de ayer.
    const intentos = Promise.all([
      reporteIntentos(idExamen, 0, 100, '', desde),
      reporteIntentos(idExamen, 0, 1, '', hoy),
      reporteIntentos(idExamen, 0, 100, '', ayer),
    ]).then(([t, h, a]) => {
      const fechas = a.contenido.map((i) => i.fechaHora)
      return {
        total: t.totalRegistros, hoy: h.totalRegistros, ayer: a.totalRegistros - h.totalRegistros,
        porHora: porHoraDe(fechas), porHoraAyer: porHoraDe(fechas, 1), ultimoHoy: ultimoDeHoy(fechas),
        // Por motivo: con los (hasta 100) más recientes del período.
        porMotivo: motivosDe(t.contenido.map((i) => TEXTO_TIPO_INTENTO[i.tipo] ?? 'Intento incorrecto'))
      }
    })
    const expulsiones = (idExamen == null ? listarExpulsionesTodas() : listarExpulsionesExamen(idExamen))
      .then((l) => {
        const unicas = [...new Map(l.map((e) => [e.idExpulsion, e])).values()]
        return cifraDe(unicas.map((e) => e.fechaHora), desde, unicas.map((e) => (e.anuladaEn ? 'Anuladas' : recortar(e.motivo))))
      })
    const excepciones = (idExamen == null ? listarExcepcionesTodas() : listarExcepcionesNoHabilitado(idExamen))
      .then((l) => cifraDe(l.map((e) => e.fechaHora), desde, l.map((e) => recortar(e.motivoInhabilitacion))))
    const fotos = listarFotosReportadas(idExamen).then((l) => cifraDe(l.map((f) => f.reportadoEn), desde, l.map((f) => textoMotivoReporte(f.motivo))))

    const modificaciones = reporteModificacionesInhabilitados(idExamen, desde)
      .then((l) => cifraDe(
        l.map((m) => m.fechaHora),
        desde,
        l.map((m) => m.esFallo ? 'Bloqueado' : 'Exitoso')
      ))
    const ingresos = reporteIngresos(idExamen).then((l) => {
      const qr = l.filter((i) => i.tipoIngreso === 'NORMAL').map((i) => i.fechaHora)
      const manual = l.filter((i) => i.tipoIngreso === 'MANUAL').map((i) => i.fechaHora)
      return {
        qr: cifraDe(qr, desde, qr.map(() => 'Ingreso QR')),
        manual: cifraDe(manual, desde, manual.map(() => 'Ingreso Manual'))
      }
    })

    void Promise.allSettled([intentos, expulsiones, excepciones, fotos, modificaciones, ingresos]).then(([i, e, x, f, m, ing]) => {
      if (!vigente) return
      const valor = (r: PromiseSettledResult<Cifra>) => (r.status === 'fulfilled' ? r.value : null)
      const ingVal = (ing.status === 'fulfilled' && ing.value) ? ing.value : { qr: null, manual: null }

      setResultado({
        clave, resumen: {
          intentos: valor(i),
          expulsiones: valor(e),
          excepciones: valor(x),
          fotos: valor(f),
          modificaciones: valor(m),
          'ingresos-qr': ingVal.qr,
          'ingresos-manual': ingVal.manual,
        }
      })
    })

    return () => { vigente = false }
  }, [idExamen, desde, clave, recarga])

  // Al cambiar de examen se conserva el anterior hasta tener el nuevo, salvo que sea de otro examen.
  return resultado?.clave === clave ? resultado.resumen : VACIO
}
