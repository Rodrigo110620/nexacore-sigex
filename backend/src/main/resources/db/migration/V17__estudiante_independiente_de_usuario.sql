-- ============================================================
-- SIGEX — V17: Estudiante independiente de usuario
-- Los estudiantes no inician sesión: dejan de ser filas de
-- usuario y guardan sus propios datos (nombre, apellidos, CI,
-- email). PK simple id_estudiante; las tablas que apuntaban a
-- (id_estudiante, id_usuario) pasan a apuntar solo a id_estudiante.
-- Reemplaza los triggers de V14/V15, que ya no hacen falta.
-- ============================================================

-- 1) Triggers de V14/V15 (un estudiante sin roles ni docente)
DROP TRIGGER IF EXISTS trg_estudiante_sin_roles ON public.estudiante;
DROP TRIGGER IF EXISTS trg_rol_no_estudiante ON public.usuario_rol;
DROP TRIGGER IF EXISTS trg_estudiante_no_docente ON public.estudiante;
DROP TRIGGER IF EXISTS trg_docente_no_estudiante ON public.docente;
DROP FUNCTION IF EXISTS public.fn_estudiante_sin_roles();
DROP FUNCTION IF EXISTS public.fn_rol_no_estudiante();
DROP FUNCTION IF EXISTS public.fn_estudiante_no_docente();
DROP FUNCTION IF EXISTS public.fn_docente_no_estudiante();

-- 2) Datos propios del estudiante, copiados desde usuario
ALTER TABLE public.estudiante ADD COLUMN IF NOT EXISTS nombre varchar;
ALTER TABLE public.estudiante ADD COLUMN IF NOT EXISTS apellidos varchar;
ALTER TABLE public.estudiante ADD COLUMN IF NOT EXISTS ci varchar;
ALTER TABLE public.estudiante ADD COLUMN IF NOT EXISTS email varchar;

UPDATE public.estudiante e
SET nombre    = u.nombre,
    apellidos = u.apellidos,
    ci        = u.ci,
    email     = u.email
FROM public.usuario u
WHERE u.id_usuario = e.id_usuario;

ALTER TABLE public.estudiante ALTER COLUMN nombre SET NOT NULL;
ALTER TABLE public.estudiante ALTER COLUMN apellidos SET NOT NULL;
ALTER TABLE public.estudiante ALTER COLUMN ci SET NOT NULL;

ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS uq_estudiante_ci;
ALTER TABLE public.estudiante ADD CONSTRAINT uq_estudiante_ci UNIQUE (ci);
ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS uq_estudiante_email;
ALTER TABLE public.estudiante ADD CONSTRAINT uq_estudiante_email UNIQUE (email);

-- Usuarios que eran estudiantes; se limpian al final
CREATE TEMP TABLE tmp_usuario_estudiante ON COMMIT DROP AS
SELECT id_usuario FROM public.estudiante;

-- 3) Quitar FKs compuestas hacia estudiante
ALTER TABLE public.asistencia_examen DROP CONSTRAINT IF EXISTS fk_asistencia_estudiante;
ALTER TABLE public.incidencia DROP CONSTRAINT IF EXISTS fk_incidencia_estudiante;
ALTER TABLE public.inscripcion_paralelo DROP CONSTRAINT IF EXISTS fk_inscripcion_estudiante;
ALTER TABLE public.intento_ingreso DROP CONSTRAINT IF EXISTS fk_intento_estudiante;
ALTER TABLE public.registro_control_ingreso DROP CONSTRAINT IF EXISTS fk_registro_control_estudiante;

-- 4) registro_control_ingreso: PK sin id_usuario
ALTER TABLE public.registro_control_ingreso DROP CONSTRAINT IF EXISTS pk_registro_control_ingreso;
ALTER TABLE public.registro_control_ingreso
    ADD CONSTRAINT pk_registro_control_ingreso
        PRIMARY KEY (id_examen, id_paralelo, id_estudiante, id_control);

-- 5) Quitar id_usuario (del estudiante) de las tablas dependientes
DROP INDEX IF EXISTS public.ix_inscripcion_estudiante;
DROP INDEX IF EXISTS public.ix_registro_control_estudiante;

ALTER TABLE public.asistencia_examen DROP COLUMN IF EXISTS id_usuario;
ALTER TABLE public.incidencia DROP COLUMN IF EXISTS id_usuario;
ALTER TABLE public.inscripcion_paralelo DROP COLUMN IF EXISTS id_usuario;
ALTER TABLE public.intento_ingreso DROP COLUMN IF EXISTS id_usuario;
ALTER TABLE public.registro_control_ingreso DROP COLUMN IF EXISTS id_usuario;

CREATE INDEX IF NOT EXISTS ix_inscripcion_estudiante
    ON public.inscripcion_paralelo (id_estudiante);
CREATE INDEX IF NOT EXISTS ix_registro_control_estudiante
    ON public.registro_control_ingreso (id_estudiante);

-- 6) estudiante: PK simple y sin vínculo a usuario
ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS fk_estudiante_usuario;
ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS uq_id_usuario;
ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS pk_estudiante;
ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS uq_id_estudiante;
ALTER TABLE public.estudiante DROP COLUMN IF EXISTS id_usuario;
ALTER TABLE public.estudiante ADD CONSTRAINT pk_estudiante PRIMARY KEY (id_estudiante);

-- 7) FKs simples hacia estudiante
ALTER TABLE public.asistencia_examen
    ADD CONSTRAINT fk_asistencia_estudiante
    FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.incidencia
    ADD CONSTRAINT fk_incidencia_estudiante
    FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.inscripcion_paralelo
    ADD CONSTRAINT fk_inscripcion_estudiante
    FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.intento_ingreso
    ADD CONSTRAINT fk_intento_estudiante
    FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.registro_control_ingreso
    ADD CONSTRAINT fk_registro_control_estudiante
    FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 8) Borrar los usuarios que eran estudiantes. Si alguno sigue
--    referenciado (p. ej. en auditoria_operacion) queda inactivo.
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT id_usuario FROM tmp_usuario_estudiante LOOP
        BEGIN
            DELETE FROM public.usuario_rol WHERE id_usuario = r.id_usuario;
            DELETE FROM public.usuario WHERE id_usuario = r.id_usuario;
        EXCEPTION WHEN foreign_key_violation THEN
            UPDATE public.usuario SET estado = 'inactivo' WHERE id_usuario = r.id_usuario;
        END;
    END LOOP;
END $$;

COMMENT ON TABLE public.estudiante IS
    'Estudiantes (no inician sesión). Datos propios; carrera/facultad por FK compuesta a carrera.';
COMMENT ON COLUMN public.estudiante.ci IS 'Carnet de identidad del estudiante (único).';
COMMENT ON COLUMN public.estudiante.email IS 'Correo del estudiante (opcional, único).';
