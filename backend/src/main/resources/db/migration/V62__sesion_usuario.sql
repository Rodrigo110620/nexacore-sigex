-- Sesiones abiertas de cada usuario, con su navegador y dispositivo. Permite avisar cuando una cuenta se abre en otro
-- dispositivo, ver y cerrar las sesiones desde «Mi perfil», cerrar las demás al cambiar la contraseña y saber desde qué
-- sesión se registró cada autorización o denegación del control de ingreso.
CREATE TABLE IF NOT EXISTS public.sesion_usuario (
    id_sesion        varchar(36)  NOT NULL,
    id_usuario       integer      NOT NULL,
    dispositivo      varchar(120) NOT NULL,
    ip               varchar(64),
    iniciada_en      timestamp    NOT NULL DEFAULT NOW(),
    ultima_actividad timestamp    NOT NULL DEFAULT NOW(),
    cerrada_en       timestamp,
    motivo_cierre    varchar(40),
    CONSTRAINT pk_sesion_usuario PRIMARY KEY (id_sesion),
    CONSTRAINT fk_sesion_usuario_usuario FOREIGN KEY (id_usuario)
        REFERENCES public.usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT ck_sesion_usuario_cierre CHECK ((cerrada_en IS NULL) = (motivo_cierre IS NULL))
);
CREATE INDEX IF NOT EXISTS ix_sesion_usuario_abiertas ON public.sesion_usuario (id_usuario) WHERE cerrada_en IS NULL;

COMMENT ON TABLE public.sesion_usuario IS 'Sesiones iniciadas (una por inicio de sesión), con navegador y dispositivo.';

ALTER TABLE public.registro_control_ingreso ADD COLUMN IF NOT EXISTS id_sesion varchar(36);
ALTER TABLE public.registro_control_ingreso ADD COLUMN IF NOT EXISTS dispositivo varchar(120);
ALTER TABLE public.registro_control_ingreso DROP CONSTRAINT IF EXISTS fk_registro_control_sesion;
ALTER TABLE public.registro_control_ingreso ADD CONSTRAINT fk_registro_control_sesion
    FOREIGN KEY (id_sesion) REFERENCES public.sesion_usuario (id_sesion) ON DELETE SET NULL;
