-- INCI-01: expulsión de un estudiante durante el examen (la registra el ADMIN). Base de la
-- propuesta de Marcelo, ajustada a la base actual: timestamp (como el resto, hora de Bolivia),
-- sin UNIQUE por examen (un examen reprogramado conserva su id: la expulsión vale para su sesión)
-- y con la hora inmutable que exige la HU.
CREATE TABLE IF NOT EXISTS public.expulsion (
    id_expulsion           serial       NOT NULL,
    id_estudiante          integer      NOT NULL,
    id_examen              integer      NOT NULL,
    id_usuario_responsable integer      NOT NULL,
    motivo                 varchar(500) NOT NULL,
    fecha_hora             timestamp    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_expulsion PRIMARY KEY (id_expulsion),
    CONSTRAINT ck_expulsion_motivo CHECK (motivo ~ '[^[:space:]]'),
    -- Solo se expulsa a un estudiante asociado al examen.
    CONSTRAINT fk_expulsion_asistencia FOREIGN KEY (id_estudiante, id_examen)
        REFERENCES public.asistencia_examen (id_estudiante, id_examen) ON DELETE RESTRICT,
    CONSTRAINT fk_expulsion_responsable FOREIGN KEY (id_usuario_responsable)
        REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_expulsion_examen_fecha ON public.expulsion (id_examen, fecha_hora DESC);

-- La hora de la expulsión no se puede modificar (DoD de INCI-01), ni siquiera por SQL.
CREATE OR REPLACE FUNCTION public.expulsion_hora_inmutable() RETURNS trigger AS $$
BEGIN
    IF NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora THEN
        RAISE EXCEPTION 'La hora de la expulsión no se puede modificar';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_expulsion_hora_inmutable ON public.expulsion;
CREATE TRIGGER tg_expulsion_hora_inmutable
    BEFORE UPDATE ON public.expulsion
    FOR EACH ROW EXECUTE FUNCTION public.expulsion_hora_inmutable();
