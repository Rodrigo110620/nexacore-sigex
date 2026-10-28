-- Roles configurables: el ADMIN crea roles extra y elige sus permisos. Los roles del sistema
-- (ADMIN, DOCENTE, CONTROL y ESTUDIANTE) siempre existen, no se borran y tienen permisos fijos en el
-- código; esta tabla guarda solo los permisos de los roles extra.
ALTER TABLE public.rol ADD COLUMN IF NOT EXISTS descripcion varchar(200);

CREATE TABLE IF NOT EXISTS public.permiso (
    codigo      varchar(40)  NOT NULL,
    modulo      varchar(40)  NOT NULL,
    descripcion varchar(200) NOT NULL,
    CONSTRAINT pk_permiso PRIMARY KEY (codigo)
);

INSERT INTO public.permiso (codigo, modulo, descripcion) VALUES
    ('EXAMENES_VER_TODOS', 'Exámenes', 'Ver todos los exámenes'),
    ('EXAMENES_VER_PROPIOS', 'Exámenes', 'Ver solo los exámenes que tiene asignados como docente'),
    ('EXAMENES_GESTIONAR_TODOS', 'Exámenes', 'Crear, editar y reprogramar cualquier examen'),
    ('EXAMENES_GESTIONAR_PROPIOS', 'Exámenes', 'Crear, editar y reprogramar sus propios exámenes'),
    ('EXAMENES_CANCELAR', 'Exámenes', 'Cancelar exámenes'),
    ('AMBIENTES_GESTIONAR', 'Exámenes', 'Crear ambientes y cambiar su aforo'),
    ('HABILITACION_VER', 'Habilitación', 'Ver los estudiantes asociados a un examen y su habilitación'),
    ('HABILITACION_GESTIONAR', 'Habilitación', 'Asociar estudiantes y cambiar su habilitación'),
    ('CONTROL_INGRESO_TODOS', 'Control de ingreso', 'Registrar ingresos e incidencias en cualquier examen'),
    ('CONTROL_INGRESO_PROPIOS', 'Control de ingreso', 'Registrar ingresos e incidencias en sus propios exámenes'),
    ('EXPULSAR_TODOS', 'Control de ingreso', 'Expulsar y anular expulsiones en cualquier examen'),
    ('EXPULSAR_PROPIOS', 'Control de ingreso', 'Expulsar y anular expulsiones en sus propios exámenes'),
    ('ESTUDIANTES_VER', 'Estudiantes', 'Ver estudiantes'),
    ('ESTUDIANTES_GESTIONAR', 'Estudiantes', 'Registrar, editar e importar estudiantes y regenerar su QR'),
    ('FOTOS_REPORTAR', 'Estudiantes', 'Reportar una foto que no coincide con la persona'),
    ('FOTOS_REVISAR', 'Estudiantes', 'Revisar, aprobar y rechazar fotos'),
    ('REPORTES_VER', 'Reportes', 'Ver los reportes de intentos, expulsiones y excepciones'),
    ('NOTIFICACIONES_TODAS', 'Reportes', 'Recibir los avisos de todos los exámenes'),
    ('USUARIOS_GESTIONAR', 'Administración', 'Gestionar los usuarios del personal'),
    ('ROLES_GESTIONAR', 'Administración', 'Crear roles y asignar sus permisos')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rol_permiso (
    id_rol         integer     NOT NULL,
    codigo_permiso varchar(40) NOT NULL,
    CONSTRAINT pk_rol_permiso PRIMARY KEY (id_rol, codigo_permiso),
    CONSTRAINT fk_rol_permiso_rol FOREIGN KEY (id_rol) REFERENCES public.rol (id_rol) ON DELETE CASCADE,
    CONSTRAINT fk_rol_permiso_permiso FOREIGN KEY (codigo_permiso) REFERENCES public.permiso (codigo) ON DELETE CASCADE
);
