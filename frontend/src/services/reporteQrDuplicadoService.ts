import api from './api'

export async function registrarReporteQrDuplicado(datos: {
  idExamen: number; idEstudianteQr: number; nombresPresentado: string; ciPresentado: string
  codigoSisPresentado: string; detalle: string; fechaHoraDispositivo: string; foto: Blob
}): Promise<number> {
  const form = new FormData()
  form.append('idExamen', String(datos.idExamen))
  form.append('idEstudianteQr', String(datos.idEstudianteQr))
  form.append('nombresPresentado', datos.nombresPresentado)
  form.append('ciPresentado', datos.ciPresentado)
  form.append('codigoSisPresentado', datos.codigoSisPresentado)
  form.append('detalle', datos.detalle)
  form.append('fechaHoraDispositivo', datos.fechaHoraDispositivo)
  form.append('foto', datos.foto, 'evidencia.jpg')
  const { data } = await api.post<number>('/reportes-qr-duplicado', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
