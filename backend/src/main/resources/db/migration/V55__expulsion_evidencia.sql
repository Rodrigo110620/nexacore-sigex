-- Evidencia de una expulsión (fotos o capturas, hasta 3): la sube quien expulsa (ADMIN o el docente del examen)
-- y la ven el ADMIN, el docente del examen y el personal de control asignado. No la ve el estudiante.
CREATE TABLE IF NOT EXISTS public.expulsion_evidencia (
    id_evidencia    serial       NOT NULL,
    id_expulsion    integer      NOT NULL,
    contenido       bytea        NOT NULL,
    tipo_contenido  varchar(40)  NOT NULL,
    id_usuario      integer,
    subida_en       timestamp    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_expulsion_evidencia PRIMARY KEY (id_evidencia),
    CONSTRAINT fk_expulsion_evidencia_expulsion FOREIGN KEY (id_expulsion)
        REFERENCES public.expulsion (id_expulsion) ON DELETE CASCADE,
    CONSTRAINT fk_expulsion_evidencia_usuario FOREIGN KEY (id_usuario)
        REFERENCES public.usuario (id_usuario) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_expulsion_evidencia_expulsion ON public.expulsion_evidencia (id_expulsion);
