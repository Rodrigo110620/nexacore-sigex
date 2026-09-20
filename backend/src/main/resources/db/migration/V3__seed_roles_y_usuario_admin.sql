-- ============================================================
-- SIGEX — V3: Seed de roles RBAC y usuario administrador inicial
-- Tarea B6 (Sprint 1) — Responsable: Marcelo Vallejos Tinta
--
-- Credenciales de prueba del administrador:
--     email:    admin.tis@umss.edu.bo
--     password: Admin123*   (BCrypt $2a$, costo 10)
-- ¡Cambiar la contraseña en el primer despliegue del laboratorio TIS!
--
-- Convención: los roles se guardan SIN el prefijo "ROLE_".
-- Spring Security lo agrega en código ("ROLE_" + rol.nombre).
-- ============================================================

-- 1) Roles del sistema
INSERT INTO public.rol (nombre) VALUES
    ('ADMIN'),
    ('DOCENTE'),
    ('CONTROL')
ON CONFLICT (nombre) DO NOTHING;

-- 2) Usuario administrador inicial
--    ci es NOT NULL y UNIQUE en el esquema: se usa un valor reservado.
INSERT INTO public.usuario (nombre, apellidos, ci, email, password, estado) VALUES
    ('Administrador',
     'TIS',
     '0000000',
     'admin.tis@umss.edu.bo',
     '$2a$10$Ak.qxVXWi7XVkHBtDoZw2uyox/iOutGKHnq08DyO6fY17JrEcIT.O',
     'activo')
ON CONFLICT (email) DO NOTHING;

-- 3) Asignación del rol ADMIN (por subconsulta, sin IDs fijos)
INSERT INTO public.usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM public.usuario u
JOIN public.rol r ON r.nombre = 'ADMIN'
WHERE u.email = 'admin.tis@umss.edu.bo'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;
