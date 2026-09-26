-- ============================================================
-- SIGEX — V9: Catálogo carrera + vínculo en estudiante (MAST-01 / Lia)
-- Catálogo simple (como ambiente / materia). estudiante conserva PK
-- compuesta (id_estudiante, id_usuario); id_carrera es FK opcional
-- hasta que el alta de estudiantes la exija.
--
-- NOTA: Versión YA APLICADA en Supabase. No modificar este archivo.
-- Mejoras (facultad + PK compuesta) van en V10.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.carrera (
    id_carrera serial NOT NULL,
    codigo     varchar,
    nombre     varchar NOT NULL,
    CONSTRAINT pk_carrera PRIMARY KEY (id_carrera),
    CONSTRAINT uq_carrera_nombre UNIQUE (nombre),
    CONSTRAINT uq_carrera_codigo UNIQUE (codigo)
);
ALTER TABLE public.carrera OWNER TO postgres;

COMMENT ON TABLE public.carrera IS
    'Catálogo de carreras. Referenciado por estudiante (MAST-01).';

-- Seed FCyT / UMSS (idempotente por nombre)
INSERT INTO public.carrera (codigo, nombre)
SELECT v.codigo, v.nombre
FROM (VALUES
    ('INF',  'Ingeniería Informática'),
    ('SIS',  'Ingeniería de Sistemas'),
    ('MAT',  'Ingeniería Matemática'),
    ('CIV',  'Ingeniería Civil'),
    ('ELE',  'Ingeniería Eléctrica'),
    ('IND',  'Ingeniería Industrial'),
    ('MEC',  'Ingeniería Mecánica'),
    ('QUI',  'Ingeniería Química')
) AS v(codigo, nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM public.carrera c WHERE c.nombre = v.nombre
);

ALTER TABLE public.estudiante
    ADD COLUMN IF NOT EXISTS id_carrera integer;

ALTER TABLE public.estudiante
    DROP CONSTRAINT IF EXISTS fk_estudiante_carrera;
ALTER TABLE public.estudiante
    ADD CONSTRAINT fk_estudiante_carrera
    FOREIGN KEY (id_carrera)
    REFERENCES public.carrera (id_carrera)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS ix_estudiante_carrera
    ON public.estudiante (id_carrera);

COMMENT ON COLUMN public.estudiante.id_carrera IS
    'Carrera del estudiante (FK a carrera). Nullable hasta completar altas MAST-01.';
