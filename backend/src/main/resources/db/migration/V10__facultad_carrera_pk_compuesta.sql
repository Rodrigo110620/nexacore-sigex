-- ============================================================
-- SIGEX — V10: Facultad + PK compuesta en carrera (MAST-01 / Lia)
-- Corrige V9 aplicado: carrera tenía PK simple sin facultad.
-- Resultado: facultad → carrera(id_carrera, id_facultad) → estudiante
-- ============================================================

-- 1) Catálogo facultad
CREATE TABLE IF NOT EXISTS public.facultad (
    id_facultad serial NOT NULL,
    codigo      varchar,
    nombre      varchar NOT NULL,
    CONSTRAINT pk_facultad PRIMARY KEY (id_facultad),
    CONSTRAINT uq_facultad_nombre UNIQUE (nombre),
    CONSTRAINT uq_facultad_codigo UNIQUE (codigo)
);
ALTER TABLE public.facultad OWNER TO postgres;

COMMENT ON TABLE public.facultad IS
    'Catálogo de facultades. Contiene carreras (escalable multi-facultad).';

INSERT INTO public.facultad (codigo, nombre)
SELECT 'FCYT', 'Facultad de Ciencias y Tecnología'
WHERE NOT EXISTS (
    SELECT 1 FROM public.facultad f WHERE f.nombre = 'Facultad de Ciencias y Tecnología'
);

-- 2) Agregar id_facultad a carrera y poblar con FCyT
ALTER TABLE public.carrera
    ADD COLUMN IF NOT EXISTS id_facultad integer;

UPDATE public.carrera c
SET id_facultad = f.id_facultad
FROM public.facultad f
WHERE c.id_facultad IS NULL
  AND f.codigo = 'FCYT';

-- Por si quedara alguna fila sin facultad
UPDATE public.carrera
SET id_facultad = (SELECT id_facultad FROM public.facultad WHERE codigo = 'FCYT' LIMIT 1)
WHERE id_facultad IS NULL;

ALTER TABLE public.carrera
    ALTER COLUMN id_facultad SET NOT NULL;

ALTER TABLE public.carrera
    DROP CONSTRAINT IF EXISTS fk_carrera_facultad;
ALTER TABLE public.carrera
    ADD CONSTRAINT fk_carrera_facultad
    FOREIGN KEY (id_facultad)
    REFERENCES public.facultad (id_facultad)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS ix_carrera_facultad
    ON public.carrera (id_facultad);

-- 3) Quitar FK simple de estudiante → carrera (bloquea cambio de PK)
ALTER TABLE public.estudiante
    DROP CONSTRAINT IF EXISTS fk_estudiante_carrera;

-- 4) Cambiar PK de carrera a compuesta + UNIQUE(id_carrera)
ALTER TABLE public.carrera
    DROP CONSTRAINT IF EXISTS pk_carrera;
ALTER TABLE public.carrera
    DROP CONSTRAINT IF EXISTS uq_carrera_nombre;
ALTER TABLE public.carrera
    DROP CONSTRAINT IF EXISTS uq_carrera_codigo;

ALTER TABLE public.carrera
    ADD CONSTRAINT pk_carrera PRIMARY KEY (id_carrera, id_facultad);
ALTER TABLE public.carrera
    ADD CONSTRAINT uq_id_carrera UNIQUE (id_carrera);
ALTER TABLE public.carrera
    ADD CONSTRAINT uq_carrera_facultad_nombre UNIQUE (id_facultad, nombre);
ALTER TABLE public.carrera
    ADD CONSTRAINT uq_carrera_facultad_codigo UNIQUE (id_facultad, codigo);

COMMENT ON TABLE public.carrera IS
    'Catálogo de carreras por facultad. PK compuesta (id_carrera, id_facultad).';

-- 5) estudiante: id_facultad + FK compuesta
ALTER TABLE public.estudiante
    ADD COLUMN IF NOT EXISTS id_facultad integer;

UPDATE public.estudiante e
SET id_facultad = c.id_facultad
FROM public.carrera c
WHERE e.id_carrera IS NOT NULL
  AND e.id_facultad IS NULL
  AND e.id_carrera = c.id_carrera;

ALTER TABLE public.estudiante
    DROP CONSTRAINT IF EXISTS fk_estudiante_carrera;
ALTER TABLE public.estudiante
    ADD CONSTRAINT fk_estudiante_carrera
    FOREIGN KEY (id_carrera, id_facultad)
    REFERENCES public.carrera (id_carrera, id_facultad)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

DROP INDEX IF EXISTS public.ix_estudiante_carrera;
CREATE INDEX IF NOT EXISTS ix_estudiante_carrera
    ON public.estudiante (id_carrera, id_facultad);
CREATE INDEX IF NOT EXISTS ix_estudiante_facultad
    ON public.estudiante (id_facultad);

COMMENT ON COLUMN public.estudiante.id_carrera IS
    'Carrera del estudiante (parte de FK compuesta a carrera). Nullable hasta MAST-01.';
COMMENT ON COLUMN public.estudiante.id_facultad IS
    'Facultad del estudiante (parte de FK compuesta a carrera). Nullable hasta MAST-01.';
