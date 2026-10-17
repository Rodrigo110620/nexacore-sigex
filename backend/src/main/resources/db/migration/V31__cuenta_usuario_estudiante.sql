-- CTA-01: base para la cuenta de usuario del estudiante.
--
-- V17 separó al estudiante del usuario. Aquí se vuelve a ligar SOLO la tabla estudiante, con un
-- enlace opcional: queda NULL hasta que el estudiante active su cuenta, así los estudiantes
-- existentes no cambian. Las demás tablas siguen usando solo id_estudiante.
--
-- El estudiante inicia sesión con la tabla usuario (JWT, bloqueo por intentos de V23,
-- restablecer contraseña de V6) y el rol ESTUDIANTE. estudiante sigue siendo la fuente oficial
-- de sus datos personales.

ALTER TABLE public.estudiante
    ADD COLUMN IF NOT EXISTS id_usuario integer;

ALTER TABLE public.estudiante
    ADD CONSTRAINT uq_estudiante_id_usuario UNIQUE (id_usuario);

ALTER TABLE public.estudiante
    ADD CONSTRAINT fk_estudiante_cuenta_usuario FOREIGN KEY (id_usuario)
        REFERENCES public.usuario (id_usuario) ON DELETE SET NULL;

INSERT INTO public.rol (nombre) VALUES ('ESTUDIANTE')
ON CONFLICT (nombre) DO NOTHING;

-- Reglas (reemplazan a las de V14/V15, que V17 quitó):
--   * el usuario de un estudiante solo puede tener el rol ESTUDIANTE y no puede ser docente;
--   * el rol ESTUDIANTE solo se asigna a un usuario ligado a un estudiante.
-- Se validan en la base para que no se rompan ni desde la app ni con inserts manuales.

CREATE OR REPLACE FUNCTION public.fn_estudiante_cuenta_valida()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.id_usuario IS NULL THEN
        RETURN NEW;
    END IF;
    IF EXISTS (SELECT 1
               FROM public.usuario_rol ur
               JOIN public.rol r ON r.id_rol = ur.id_rol
               WHERE ur.id_usuario = NEW.id_usuario AND r.nombre <> 'ESTUDIANTE') THEN
        RAISE EXCEPTION 'El usuario % tiene roles de personal; no puede ser la cuenta de un estudiante', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_cuenta';
    END IF;
    IF EXISTS (SELECT 1 FROM public.docente d WHERE d.id_usuario = NEW.id_usuario) THEN
        RAISE EXCEPTION 'El usuario % es docente; no puede ser la cuenta de un estudiante', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_cuenta';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_usuario_rol_estudiante()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    es_rol_estudiante boolean;
    es_cuenta_estudiante boolean;
BEGIN
    SELECT r.nombre = 'ESTUDIANTE' INTO es_rol_estudiante FROM public.rol r WHERE r.id_rol = NEW.id_rol;
    es_cuenta_estudiante := EXISTS (SELECT 1 FROM public.estudiante e WHERE e.id_usuario = NEW.id_usuario);
    IF es_rol_estudiante AND NOT es_cuenta_estudiante THEN
        RAISE EXCEPTION 'El rol ESTUDIANTE solo se asigna a la cuenta de un estudiante (usuario %)', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_cuenta';
    END IF;
    IF NOT es_rol_estudiante AND es_cuenta_estudiante THEN
        RAISE EXCEPTION 'El usuario % es la cuenta de un estudiante; solo puede tener el rol ESTUDIANTE', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_cuenta';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_docente_no_cuenta_estudiante()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.estudiante e WHERE e.id_usuario = NEW.id_usuario) THEN
        RAISE EXCEPTION 'El usuario % es la cuenta de un estudiante; no puede ser docente', NEW.id_usuario
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_estudiante_cuenta';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estudiante_cuenta_valida ON public.estudiante;
CREATE TRIGGER trg_estudiante_cuenta_valida
    BEFORE INSERT OR UPDATE OF id_usuario ON public.estudiante
    FOR EACH ROW EXECUTE FUNCTION public.fn_estudiante_cuenta_valida();

DROP TRIGGER IF EXISTS trg_usuario_rol_estudiante ON public.usuario_rol;
CREATE TRIGGER trg_usuario_rol_estudiante
    BEFORE INSERT OR UPDATE ON public.usuario_rol
    FOR EACH ROW EXECUTE FUNCTION public.fn_usuario_rol_estudiante();

DROP TRIGGER IF EXISTS trg_docente_no_cuenta_estudiante ON public.docente;
CREATE TRIGGER trg_docente_no_cuenta_estudiante
    BEFORE INSERT OR UPDATE OF id_usuario ON public.docente
    FOR EACH ROW EXECUTE FUNCTION public.fn_docente_no_cuenta_estudiante();

-- Código de activación de la cuenta: 6 dígitos enviados al correo institucional. Solo se guarda
-- su hash; vence a los pocos minutos y admite pocos intentos.
CREATE TABLE IF NOT EXISTS public.estudiante_activacion (
    id_estudiante integer     NOT NULL,
    hash_codigo   varchar(64) NOT NULL,
    expira_en     timestamp   NOT NULL,
    intentos      integer     NOT NULL DEFAULT 0,
    creado_en     timestamp   NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_estudiante_activacion PRIMARY KEY (id_estudiante),
    CONSTRAINT fk_estudiante_activacion_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE
);

-- Foto que sube el propio estudiante. No reemplaza a estudiante_foto (la que ve el personal de
-- control) hasta que la apruebe la administración; si se rechaza, queda con su motivo.
CREATE TABLE IF NOT EXISTS public.estudiante_foto_solicitud (
    id_estudiante  integer     NOT NULL,
    contenido      bytea       NOT NULL,
    tipo_contenido varchar(30) NOT NULL,
    estado         varchar(20) NOT NULL DEFAULT 'PENDIENTE',
    motivo_rechazo varchar(200),
    enviada_en     timestamp   NOT NULL DEFAULT NOW(),
    revisada_en    timestamp,
    CONSTRAINT pk_estudiante_foto_solicitud PRIMARY KEY (id_estudiante),
    CONSTRAINT fk_estudiante_foto_solicitud_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT ck_estudiante_foto_solicitud_tipo CHECK (tipo_contenido IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT ck_estudiante_foto_solicitud_estado CHECK (estado IN ('PENDIENTE', 'RECHAZADA'))
);
