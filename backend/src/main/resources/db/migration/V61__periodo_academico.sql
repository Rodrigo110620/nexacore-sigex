-- Periodo académico (semestre): I-2026, II-2026, VERANO-2027, INVIERNO-2027. Cada grupo (paralelo) es de un periodo;
-- sus inscritos, su docente y sus exámenes lo heredan. Así, al empezar otro semestre se vuelven a crear los grupos
-- (Cálculo I G1 del I-2027) sin chocar con los del semestre anterior, que quedan como historial.
-- Siempre hay un solo periodo activo: el que usan el registro de grupos y exámenes y las listas por defecto.
CREATE TABLE IF NOT EXISTS public.periodo_academico (
    id_periodo   serial      NOT NULL,
    nombre       varchar(20) NOT NULL,
    fecha_inicio date        NOT NULL,
    fecha_fin    date        NOT NULL,
    activo       boolean     NOT NULL DEFAULT false,
    CONSTRAINT pk_periodo_academico PRIMARY KEY (id_periodo),
    CONSTRAINT uq_periodo_academico_nombre UNIQUE (nombre),
    CONSTRAINT ck_periodo_academico_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT ck_periodo_academico_nombre CHECK (nombre ~ '^(I|II|VERANO|INVIERNO)-[0-9]{4}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_periodo_academico_activo ON public.periodo_academico (activo) WHERE activo;

COMMENT ON TABLE public.periodo_academico IS 'Semestres o gestiones; solo uno activo a la vez.';

-- Todo lo registrado hasta hoy es del II-2026.
INSERT INTO public.periodo_academico (nombre, fecha_inicio, fecha_fin, activo)
SELECT 'II-2026', DATE '2026-07-01', DATE '2026-12-31', true
WHERE NOT EXISTS (SELECT 1 FROM public.periodo_academico);

ALTER TABLE public.paralelo ADD COLUMN IF NOT EXISTS id_periodo integer;
UPDATE public.paralelo
SET id_periodo = (SELECT id_periodo FROM public.periodo_academico ORDER BY activo DESC, id_periodo LIMIT 1)
WHERE id_periodo IS NULL;
ALTER TABLE public.paralelo ALTER COLUMN id_periodo SET NOT NULL;
ALTER TABLE public.paralelo DROP CONSTRAINT IF EXISTS fk_paralelo_periodo;
ALTER TABLE public.paralelo ADD CONSTRAINT fk_paralelo_periodo
    FOREIGN KEY (id_periodo) REFERENCES public.periodo_academico (id_periodo);
CREATE INDEX IF NOT EXISTS ix_paralelo_periodo ON public.paralelo (id_periodo);

-- Un grupo nuevo sin periodo toma el activo (cubre los INSERT que no lo indican).
CREATE OR REPLACE FUNCTION public.paralelo_periodo_activo() RETURNS trigger AS $$
BEGIN
    IF NEW.id_periodo IS NULL THEN
        SELECT id_periodo INTO NEW.id_periodo FROM public.periodo_academico WHERE activo;
        IF NEW.id_periodo IS NULL THEN
            RAISE EXCEPTION 'No hay un periodo académico activo';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_paralelo_periodo_activo ON public.paralelo;
CREATE TRIGGER tg_paralelo_periodo_activo BEFORE INSERT ON public.paralelo
    FOR EACH ROW EXECUTE FUNCTION public.paralelo_periodo_activo();

-- El grupo único (V60) pasa a ser por materia y periodo: el G1 de Cálculo I puede existir en cada semestre.
DROP INDEX IF EXISTS public.ux_paralelo_materia_grupo;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.paralelo
        GROUP BY id_materia, id_periodo, UPPER(REGEXP_REPLACE(TRIM(nombre_grupo), '^([0-9]+)$', 'G\1'))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE NOTICE 'Hay grupos repetidos en alguna materia: no se creó ux_paralelo_materia_periodo_grupo.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS ux_paralelo_materia_periodo_grupo
            ON public.paralelo (id_materia, id_periodo, UPPER(REGEXP_REPLACE(TRIM(nombre_grupo), '^([0-9]+)$', 'G\1')));
    END IF;
END $$;
