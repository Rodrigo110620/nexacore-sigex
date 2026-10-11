/** Lado mayor de la foto que se sube: suficiente para reconocer al estudiante en el control. */
const LADO_MAXIMO = 400
/** Calidad JPEG: con 400 px la foto queda en unos 25–45 KB, suficiente para reconocer la cara. */
const CALIDAD_JPEG = 0.75
const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp']

/** Motivo por el que el archivo no sirve como foto, o null si es una imagen aceptada. */
export function validarArchivoFoto(archivo: File): string | null {
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) return 'La fotografía debe ser una imagen JPG, PNG o WEBP.'
  if (archivo.size > 15 * 1024 * 1024) return 'La imagen es demasiado grande (máximo 15 MB antes de reducirla).'
  return null
}

/**
 * Reduce la imagen a 400 px de lado mayor y la convierte a JPEG, para que quede muy por debajo
 * del límite de 150 KB del servidor aunque venga de la cámara de un celular: las fotos se guardan
 * en la base de datos y deben ocupar poco espacio.
 */
export async function prepararFoto(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', CALIDAD_JPEG)
  })
}
