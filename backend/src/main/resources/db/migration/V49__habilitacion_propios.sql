-- El DOCENTE asocia estudiantes y cambia su habilitación en sus propios exámenes. Sus permisos son
-- fijos en el código (Permisos.POR_DEFECTO); aquí solo se registra el permiso para los roles extra.
INSERT INTO public.permiso (codigo, modulo, descripcion) VALUES
    ('HABILITACION_GESTIONAR_PROPIOS', 'Habilitación', 'Asociar estudiantes y cambiar su habilitación en sus propios exámenes')
ON CONFLICT (codigo) DO NOTHING;

UPDATE public.permiso
SET descripcion = 'Asociar estudiantes y cambiar su habilitación en cualquier examen'
WHERE codigo = 'HABILITACION_GESTIONAR';
