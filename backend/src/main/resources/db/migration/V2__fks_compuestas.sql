-- ============================================================
-- Alinear FKs con PKs compuestas (requerido por Hibernate/JPA)
-- ============================================================

-- paralelo → usuario (docente)
ALTER TABLE public.paralelo
    DROP CONSTRAINT IF EXISTS fk_paralelo_docente;
ALTER TABLE public.paralelo
    ADD CONSTRAINT fk_paralelo_docente
    FOREIGN KEY (id_docente)
    REFERENCES public.usuario (id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

-- examen: columnas faltantes para FK completa a paralelo (id_paralelo, id_materia, id_docente)
ALTER TABLE public.examen
    ADD COLUMN IF NOT EXISTS id_materia integer;
ALTER TABLE public.examen
    ADD COLUMN IF NOT EXISTS id_docente integer;

UPDATE public.examen e
SET id_materia = p.id_materia,
    id_docente = p.id_docente
FROM public.paralelo p
WHERE e.id_paralelo = p.id_paralelo
  AND (e.id_materia IS NULL OR e.id_docente IS NULL);

ALTER TABLE public.examen
    ALTER COLUMN id_materia SET NOT NULL;
ALTER TABLE public.examen
    ALTER COLUMN id_docente SET NOT NULL;

ALTER TABLE public.examen
    DROP CONSTRAINT IF EXISTS fk_examen_paralelo;
ALTER TABLE public.examen
    ADD CONSTRAINT fk_examen_paralelo
    FOREIGN KEY (id_paralelo, id_materia, id_docente)
    REFERENCES public.paralelo (id_paralelo, id_materia, id_docente)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

-- asistencia_examen: columnas para FK completa a estudiante y examen
ALTER TABLE public.asistencia_examen
    ADD COLUMN IF NOT EXISTS id_usuario integer;
ALTER TABLE public.asistencia_examen
    ADD COLUMN IF NOT EXISTS id_paralelo integer;

UPDATE public.asistencia_examen a
SET id_usuario = e.id_usuario
FROM public.estudiante e
WHERE a.id_estudiante = e.id_estudiante
  AND a.id_usuario IS NULL;

UPDATE public.asistencia_examen a
SET id_paralelo = x.id_paralelo
FROM public.examen x
WHERE a.id_examen = x.id_examen
  AND a.id_paralelo IS NULL;

-- Solo forzar NOT NULL si ya hay forma de completar (tablas vacías o ya actualizadas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.asistencia_examen WHERE id_usuario IS NULL OR id_paralelo IS NULL
    ) THEN
        ALTER TABLE public.asistencia_examen ALTER COLUMN id_usuario SET NOT NULL;
        ALTER TABLE public.asistencia_examen ALTER COLUMN id_paralelo SET NOT NULL;
    END IF;
END $$;

ALTER TABLE public.asistencia_examen
    DROP CONSTRAINT IF EXISTS fk_asistencia_estudiante;
ALTER TABLE public.asistencia_examen
    DROP CONSTRAINT IF EXISTS fl_asistencia_examen;

ALTER TABLE public.asistencia_examen
    ADD CONSTRAINT fk_asistencia_estudiante
    FOREIGN KEY (id_estudiante, id_usuario)
    REFERENCES public.estudiante (id_estudiante, id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.asistencia_examen
    ADD CONSTRAINT fk_asistencia_examen
    FOREIGN KEY (id_examen, id_paralelo)
    REFERENCES public.examen (id_examen, id_paralelo)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

-- incidencia: columnas para FK completa
ALTER TABLE public.incidencia
    ADD COLUMN IF NOT EXISTS id_usuario integer;
ALTER TABLE public.incidencia
    ADD COLUMN IF NOT EXISTS id_paralelo integer;

UPDATE public.incidencia i
SET id_usuario = e.id_usuario
FROM public.estudiante e
WHERE i.id_estudiante = e.id_estudiante
  AND i.id_usuario IS NULL;

UPDATE public.incidencia i
SET id_paralelo = x.id_paralelo
FROM public.examen x
WHERE i.id_examen = x.id_examen
  AND i.id_paralelo IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.incidencia WHERE id_usuario IS NULL OR id_paralelo IS NULL
    ) THEN
        ALTER TABLE public.incidencia ALTER COLUMN id_usuario SET NOT NULL;
        ALTER TABLE public.incidencia ALTER COLUMN id_paralelo SET NOT NULL;
    END IF;
END $$;

ALTER TABLE public.incidencia
    DROP CONSTRAINT IF EXISTS fk_incidencia_estudiante;
ALTER TABLE public.incidencia
    DROP CONSTRAINT IF EXISTS fk_incidencia_examen;

ALTER TABLE public.incidencia
    ADD CONSTRAINT fk_incidencia_estudiante
    FOREIGN KEY (id_estudiante, id_usuario)
    REFERENCES public.estudiante (id_estudiante, id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.incidencia
    ADD CONSTRAINT fk_incidencia_examen
    FOREIGN KEY (id_examen, id_paralelo)
    REFERENCES public.examen (id_examen, id_paralelo)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;
