import { useEffect, useState } from 'react'
import useEnVivo from './useEnVivo'
import { reporteIntentos } from '../services/intentoIngresoService'
import { listarExpulsionesExamen, listarExpulsionesTodas } from '../services/expulsionService'
import { listarExcepcionesNoHabilitado, listarExcepcionesTodas } from '../services/excepcionNoHabilitadoService'
import { listarFotosReportadas } from '../services/fotoRevisionService'

/** Cuántos hay en total y cuántos se registraron hoy y ayer (hora de Bolivia, como los guarda el servidor). */
export interface Cifra {
  /** En el período elegido (o en total, sin período). */
  total: number
  hoy: number
  ayer: number
  /** Cuántos llegaron hoy en cada hora (0 a 23), para el gráfico. */
  porHora: number[]
}

export type ClaveResumen = 'intentos' | 'expulsiones' | 'excepciones' | 'fotos'
export type ResumenReportes = Record<ClaveResumen, Cifra | null>

const VACIO: ResumenReportes = { intentos: null, expulsiones: null, excepciones: null, fotos: null }

/** "2026-11-16" del día local, con {@code diasAtras} días antes. */
function dia(diasAtras: number): string {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

/** Cuenta los de hoy y ayer por la fecha de cada registro ("2026-11-16T08:05:00"). */
function porHoraDe(fechas: (string | null | undefined)[]): number[] {
  const hoy = dia(0)
  const horas = Array<number>(24).fill(0)
  fechas.forEach((f) => { if (f?.startsWith(hoy)) horas[Number(f.slice(11, 13))] += 1 })
  return horas
}

function cifraDe(fechas: (string | null | undefined)[], desde?: string): Cifra {
  const hoy = dia(0)
  const ayer = dia(1)
  return {
    total: desde ? fechas.filter((f) => f != null && f >= desde).length : fechas.length,
    hoy: fechas.filter((f) => f?.startsWith(hoy)).length,
    ayer: fechas.filter((f) => f?.startsWith(ayer)).length,
    porHora: porHoraDe(fechas),
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
    // Los de hoy, hasta 100, alcanzan para el gráfico por hora.
    const intentos = Promise.all([
      reporteIntentos(idExamen, 0, 1, '', desde),
      reporteIntentos(idExamen, 0, 100, '', hoy),
      reporteIntentos(idExamen, 0, 1, '', ayer),
    ]).then(([t, h, a]) => ({ total: t.totalRegistros, hoy: h.totalRegistros, ayer: a.totalRegistros - h.totalRegistros,
      porHora: porHoraDe(h.contenido.map((i) => i.fechaHora)) }))
    const expulsiones = (idExamen == null ? listarExpulsionesTodas() : listarExpulsionesExamen(idExamen))
      .then((l) => cifraDe([...new Map(l.map((e) => [e.idExpulsion, e])).values()].map((e) => e.fechaHora), desde))
    const excepciones = (idExamen == null ? listarExcepcionesTodas() : listarExcepcionesNoHabilitado(idExamen))
      .then((l) => cifraDe(l.map((e) => e.fechaHora), desde))
    const fotos = listarFotosReportadas(idExamen).then((l) => cifraDe(l.map((f) => f.reportadoEn), desde))

    void Promise.allSettled([intentos, expulsiones, excepciones, fotos]).then(([i, e, x, f]) => {
      if (!vigente) return
      const valor = (r: PromiseSettledResult<Cifra>) => (r.status === 'fulfilled' ? r.value : null)
      setResultado({ clave, resumen: { intentos: valor(i), expulsiones: valor(e), excepciones: valor(x), fotos: valor(f) } })
    })
    return () => { vigente = false }
  }, [idExamen, desde, clave, recarga])

  // Al cambiar de examen se conserva el anterior hasta tener el nuevo, salvo que sea de otro examen.
  return resultado?.clave === clave ? resultado.resumen : VACIO
}
