-- ============================================================
-- SIGEX — V5: Restaurar administrador de laboratorio
--
-- Motivo: V4 introdujo un usuario personal en el repositorio.
-- Esta migracion lo elimina y deja un admin de equipo generico.
--
-- Credenciales de laboratorio (cambiar en el primer deploy real):
--     email:    admin.tis@umss.edu.bo
--     password: Admin123*
-- ============================================================

-- 1) Quitar rol del usuario personal (si existe)
DELETE FROM public.usuario_rol
WHERE id_usuario IN (
    SELECT id_usuario FROM public.usuario
    WHERE email = '201904725@est.umss.edu'
);

-- 2) Eliminar el usuario personal
DELETE FROM public.usuario
WHERE email = '201904725@est.umss.edu';

-- 3) Restaurar admin de laboratorio (mismo hash BCrypt del V3)
INSERT INTO public.usuario (nombre, apellidos, ci, email, password, estado)
VALUES (
    'Administrador',
    'TIS',
    '0000000',
    'admin.tis@umss.edu.bo',
    '$2a$10$Ak.qxVXWi7XVkHBtDoZw2uyox/iOutGKHnq08DyO6fY17JrEcIT.O',
    'activo'
)
ON CONFLICT (email) DO NOTHING;

-- 4) Asignar rol ADMIN
INSERT INTO public.usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM public.usuario u
JOIN public.rol r ON r.nombre = 'ADMIN'
WHERE u.email = 'admin.tis@umss.edu.bo'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;
