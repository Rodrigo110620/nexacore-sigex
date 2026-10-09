-- ============================================================
-- SIGEX — V15: Un estudiante no puede ser docente
-- Complementa V14: la fila en docente puede quedar aunque se
-- quite el rol DOCENTE, así que también se valida contra la
-- tabla docente en ambos sentidos. No toca filas existentes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_estudiante_no_docente()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.docente d WHERE d.id_usuario = NEW.id_usuario) THEN
        RAISE EXCEPTION 'El usuario % está registrado como docente; un estudiante no puede tener roles', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_sin_roles';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_docente_no_estudiante()
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

DROP TRIGGER IF EXISTS trg_estudiante_no_docente ON public.estudiante;
CREATE TRIGGER trg_estudiante_no_docente
    BEFORE INSERT OR UPDATE OF id_usuario ON public.estudiante
    FOR EACH ROW EXECUTE FUNCTION public.fn_estudiante_no_docente();

DROP TRIGGER IF EXISTS trg_docente_no_estudiante ON public.docente;
CREATE TRIGGER trg_docente_no_estudiante
    BEFORE INSERT OR UPDATE OF id_usuario ON public.docente
    FOR EACH ROW EXECUTE FUNCTION public.fn_docente_no_estudiante();
