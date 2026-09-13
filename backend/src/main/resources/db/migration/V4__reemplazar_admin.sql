-- ============================================================
-- SIGEX — V4: Reemplazar usuario administrador de prueba
-- Elimina el usuario de prueba del V3 e inserta el admin real.
--
-- Credenciales del administrador:
--     email:    201904725@est.umss.edu
--     password: dfigueroa2026  (BCrypt $2a$, costo 10)
-- ============================================================

-- 1) Quitar la asignación de rol del usuario de prueba
DELETE FROM public.usuario_rol
WHERE id_usuario = (
    SELECT id_usuario FROM public.usuario
    WHERE email = 'admin.tis@umss.edu.bo'
);

-- 2) Eliminar el usuario de prueba
DELETE FROM public.usuario
WHERE email = 'admin.tis@umss.edu.bo';

-- 3) Insertar el administrador real
INSERT INTO public.usuario (nombre, apellidos, ci, email, password, estado)
VALUES (
    'Rodrigo',
    'Figueroa Camacho',
    '12433163',
    '201904725@est.umss.edu',
    '$2a$10$Hc3sDLUOHbCRyxz6wrNKrust0.T681.5Z8IaAc7ejGGGo2XjkwHt6',
    'activo'
)
ON CONFLICT (email) DO NOTHING;

-- 4) Asignar rol ADMIN
INSERT INTO public.usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM public.usuario u
JOIN public.rol r ON r.nombre = 'ADMIN'
WHERE u.email = '201904725@est.umss.edu'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;
