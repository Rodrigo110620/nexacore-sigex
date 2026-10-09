-- =============================================================================
-- SIGEX — V18: un estudiante puede cursar varias carreras
-- La carrera deja de ser columna de estudiante y pasa a la tabla estudiante_carrera,
-- con PK compuesta (id_estudiante, id_carrera, id_facultad).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.estudiante_carrera (
    id_estudiante integer NOT NULL,
    id_carrera    integer NOT NULL,
    id_facultad   integer NOT NULL,
    CONSTRAINT pk_estudiante_carrera PRIMARY KEY (id_estudiante, id_carrera, id_facultad),
    CONSTRAINT fk_estudiante_carrera_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_estudiante_carrera_carrera FOREIGN KEY (id_carrera, id_facultad)
        REFERENCES public.carrera (id_carrera, id_facultad)
);

CREATE INDEX IF NOT EXISTS ix_estudiante_carrera_carrera
    ON public.estudiante_carrera (id_carrera, id_facultad);

-- id_carrera es único en carrera: la facultad se toma de ahí aunque en estudiante venga en null.
INSERT INTO public.estudiante_carrera (id_estudiante, id_carrera, id_facultad)
SELECT e.id_estudiante, c.id_carrera, c.id_facultad
FROM public.estudiante e
JOIN public.carrera c ON c.id_carrera = e.id_carrera
ON CONFLICT DO NOTHING;

ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS fk_estudiante_carrera;
DROP INDEX IF EXISTS public.ix_estudiante_carrera;
DROP INDEX IF EXISTS public.ix_estudiante_facultad;
ALTER TABLE public.estudiante DROP COLUMN IF EXISTS id_carrera;
ALTER TABLE public.estudiante DROP COLUMN IF EXISTS id_facultad;

COMMENT ON TABLE public.estudiante IS
    'Estudiantes (no inician sesión). Datos propios; sus carreras están en estudiante_carrera.';
COMMENT ON TABLE public.estudiante_carrera IS
    'Carreras que cursa cada estudiante (puede ser más de una).';
