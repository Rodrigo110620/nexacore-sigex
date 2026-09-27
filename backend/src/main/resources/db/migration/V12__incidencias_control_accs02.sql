INSERT INTO public.catalogo_incidencia (nombre, descripcion)
SELECT v.nombre, v.descripcion FROM (VALUES
 ('LLEGADA_TARDE', 'Estudiante llegó tarde'),
 ('DOCUMENTO_MAL_ESTADO', 'Documento en mal estado'),
 ('OTRA_INCIDENCIA', 'Otra incidencia')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM public.catalogo_incidencia c WHERE c.nombre = v.nombre);
