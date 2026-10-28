-- Anular una expulsión registrada por error: no se borra, queda en el historial como anulada,
-- con quién la anuló, cuándo (hora del servidor) y por qué.
ALTER TABLE public.expulsion
    ADD COLUMN IF NOT EXISTS anulada_en       timestamp,
    ADD COLUMN IF NOT EXISTS id_usuario_anula integer,
    ADD COLUMN IF NOT EXISTS motivo_anulacion varchar(200);

ALTER TABLE public.expulsion
    ADD CONSTRAINT fk_expulsion_usuario_anula FOREIGN KEY (id_usuario_anula)
        REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
    -- Los tres datos de la anulación van juntos, y el motivo no puede ser solo espacios.
    ADD CONSTRAINT ck_expulsion_anulacion CHECK (
        (anulada_en IS NULL AND id_usuario_anula IS NULL AND motivo_anulacion IS NULL)
        OR (anulada_en IS NOT NULL AND id_usuario_anula IS NOT NULL AND motivo_anulacion ~ '[^[:space:]]'));

-- La hora sigue inmutable (DoD de INCI-01) y una anulación no se puede cambiar ni deshacer.
CREATE OR REPLACE FUNCTION public.expulsion_hora_inmutable() RETURNS trigger AS $$
BEGIN
    IF NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora THEN
        RAISE EXCEPTION 'La hora de la expulsión no se puede modificar';
    END IF;
    IF OLD.anulada_en IS NOT NULL AND (NEW.anulada_en IS DISTINCT FROM OLD.anulada_en
        OR NEW.id_usuario_anula IS DISTINCT FROM OLD.id_usuario_anula OR NEW.motivo_anulacion IS DISTINCT FROM OLD.motivo_anulacion) THEN
        RAISE EXCEPTION 'La anulación de la expulsión no se puede modificar';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
