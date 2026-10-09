-- ============================================================
-- SIGEX — V26: aulas adicionales por examen
-- Cuando los estudiantes no caben en un aula, el examen se reparte en varias.
-- examen.id_ambiente sigue siendo el aula principal (orden 0); esta tabla
-- guarda las adicionales en el orden en que se llenan (1, 2, ...).
-- El reparto de estudiantes se calcula por orden alfabético y aforo, no se guarda.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.examen_aula (
    id_examen   integer  NOT NULL,
    id_ambiente integer  NOT NULL,
    orden       smallint NOT NULL,
    CONSTRAINT pk_examen_aula PRIMARY KEY (id_examen, id_ambiente),
    CONSTRAINT uq_examen_aula_orden UNIQUE (id_examen, orden),
    CONSTRAINT ck_examen_aula_orden CHECK (orden > 0),
    -- uq_id_examen permite referenciar solo id_examen: no cambia al mover el examen de paralelo.
    CONSTRAINT fk_examen_aula_examen FOREIGN KEY (id_examen)
        REFERENCES public.examen (id_examen) ON DELETE CASCADE,
    CONSTRAINT fk_examen_aula_ambiente FOREIGN KEY (id_ambiente)
        REFERENCES public.ambiente (id_ambiente)
);

CREATE INDEX IF NOT EXISTS ix_examen_aula_ambiente ON public.examen_aula (id_ambiente);

COMMENT ON TABLE public.examen_aula IS
    'Aulas adicionales de un examen (la principal es examen.id_ambiente). Se llenan en orden.';
