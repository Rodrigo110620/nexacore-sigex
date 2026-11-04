-- Exportar el acta de asistencia (PDF) y la asistencia (Excel) de un examen. Solo el ADMIN lo tiene
-- por defecto (recibe todos los permisos); aquí se registra para poder darlo a un rol extra.
INSERT INTO public.permiso (codigo, modulo, descripcion) VALUES
    ('REPORTES_EXPORTAR', 'Reportes', 'Exportar el acta de asistencia en PDF y la asistencia en Excel')
ON CONFLICT (codigo) DO NOTHING;
