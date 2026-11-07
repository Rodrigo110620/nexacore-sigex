import { useCallback } from 'react'
import VistaPreviaDescarga, { type FormatoDescarga } from '../ui/VistaPreviaDescarga'
import { obtenerArchivo } from '../../services/descargas'
import { mensajeDescarga } from '../../services/asistenciaService'

/**
 * Vista previa del acta en PDF (DASH-04) y de la asistencia en Excel (DASH-05) de un examen, antes de descargarlas.
 * {@code formato} null: cerrada.
 */
export default function VistaPreviaExamen({ idExamen, formato, onClose }: {
  idExamen: number | null
  formato: 'pdf' | 'xlsx' | null
  onClose: () => void
}) {
  const obtener = useCallback((f: FormatoDescarga) => f === 'pdf'
    ? obtenerArchivo(`/reportes/examenes/${idExamen}/acta.pdf`, undefined, `acta_examen_${idExamen}.pdf`)
    : obtenerArchivo(`/examenes/${idExamen}/asistencia.${f}`, undefined, `asistencia.${f}`), [idExamen])
  const obtenerCsv = useCallback(() => obtenerArchivo(`/examenes/${idExamen}/asistencia.csv`, undefined, 'asistencia.csv'), [idExamen])
  return (
    <VistaPreviaDescarga open={formato !== null && idExamen !== null} titulo="Acta y asistencia del examen"
      formatos={FORMATOS} inicial={formato ?? 'pdf'} obtener={obtener} obtenerCsv={obtenerCsv} onClose={onClose} mensajeError={mensajeDescarga} />
  )
}

const FORMATOS: FormatoDescarga[] = ['pdf', 'xlsx']
