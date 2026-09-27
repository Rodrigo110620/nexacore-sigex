-- ============================================================
-- SIGEX — V14: Un estudiante no puede tener roles
-- Los estudiantes no inician sesión: son usuarios con fila en
-- estudiante y sin filas en usuario_rol. Los roles (ADMIN,
-- DOCENTE, CONTROL) son solo para personal. Se valida en ambos
-- sentidos para que no se pueda romper ni desde la app ni con
-- inserts manuales. No toca filas existentes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_estudiante_sin_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.usuario_rol ur WHERE ur.id_usuario = NEW.id_usuario) THEN
        RAISE EXCEPTION 'El usuario % tiene roles asignados; un estudiante no puede tener roles', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_sin_roles';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_rol_no_estudiante()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.estudiante e WHERE e.id_usuario = NEW.id_usuario) THEN
        RAISE EXCEPTION 'El usuario % es estudiante; un estudiante no puede tener roles', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_sin_roles';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estudiante_sin_roles ON public.estudiante;
CREATE TRIGGER trg_estudiante_sin_roles
    BEFORE INSERT OR UPDATE OF id_usuario ON public.estudiante
    FOR EACH ROW EXECUTE FUNCTION public.fn_estudiante_sin_roles();

DROP TRIGGER IF EXISTS trg_rol_no_estudiante ON public.usuario_rol;
CREATE TRIGGER trg_rol_no_estudiante
    BEFORE INSERT OR UPDATE OF id_usuario ON public.usuario_rol
    FOR EACH ROW EXECUTE FUNCTION public.fn_rol_no_estudiante();
