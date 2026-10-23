-- INCI-04: historial de excepciones de estudiantes no habilitados que intentan ingresar.
CREATE TABLE IF NOT EXISTS public.excepcion_no_habilitado (
    id_excepcion          serial       NOT NULL,
    id_estudiante         integer      NOT NULL,
    -- Solo id_examen (único): no cambia si el examen se mueve de paralelo (igual que V26 y V34).
    id_examen             integer      NOT NULL,
    -- Ambiente donde ocurrió el intento (criterio 3 de la HU).
    id_ambiente           integer      NOT NULL,
    id_usuario_control    integer      NOT NULL,
    -- Copia del motivo al momento del intento: si después cambia la habilitación, el registro no cambia.
    motivo_inhabilitacion varchar(255) NOT NULL,
    accion_tomada         varchar(100) NOT NULL,
    observaciones         varchar(500),
    -- Hora del servidor, sin zona como el resto de tablas (el backend fija America/La_Paz).
    fecha_hora            timestamp    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_excepcion_no_habilitado PRIMARY KEY (id_excepcion),
    CONSTRAINT fk_excepcion_estudiante FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante),
    CONSTRAINT fk_excepcion_examen FOREIGN KEY (id_examen) REFERENCES public.examen (id_examen) ON DELETE CASCADE,
    CONSTRAINT fk_excepcion_ambiente FOREIGN KEY (id_ambiente) REFERENCES public.ambiente (id_ambiente),
    CONSTRAINT fk_excepcion_usuario FOREIGN KEY (id_usuario_control) REFERENCES public.usuario (id_usuario),
    CONSTRAINT ck_excepcion_accion CHECK (btrim(accion_tomada) <> ''),
    CONSTRAINT ck_excepcion_motivo CHECK (btrim(motivo_inhabilitacion) <> '')
);

CREATE INDEX IF NOT EXISTS ix_excepcion_examen ON public.excepcion_no_habilitado (id_examen);
CREATE INDEX IF NOT EXISTS ix_excepcion_estudiante ON public.excepcion_no_habilitado (id_estudiante);
