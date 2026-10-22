import api from './api'

export interface ReporteQrDuplicado {
  idReporte: number; estudianteQr: string; codigoSisQr: string | null
  nombresPresentado: string; ciPresentado: string | null; presentoCarnet: boolean; codigoSisPresentado: string | null
  detalle: string; personalControl: string; estado: 'PENDIENTE' | 'PRUEBA'; fechaHora: string
}
export async function listarReportesQrDuplicado(idExamen: number) {
  const { data } = await api.get<ReporteQrDuplicado[]>(`/reportes-qr-duplicado/examen/${idExamen}`)
  return data
}
export async function obtenerFotoReporteQr(idExamen: number, idReporte: number) {
  const { data } = await api.get(`/reportes-qr-duplicado/examen/${idExamen}/${idReporte}/foto`, { responseType: 'blob' })
  return URL.createObjectURL(data as Blob)
}
