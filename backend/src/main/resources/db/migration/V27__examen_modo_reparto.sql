-- ============================================================
-- SIGEX — V27: cómo se reparten los estudiantes entre las aulas del examen
-- ALFABETICO: cada estudiante tiene su aula de antemano (apellidos y nombre).
-- LLEGADA: el aula se asigna en el control de ingreso; se llena la primera
--          aula con los que van llegando y, cuando se completa, la siguiente.
-- Solo importa cuando el examen tiene más de un aula.
-- ============================================================

ALTER TABLE public.examen
    ADD COLUMN IF NOT EXISTS modo_reparto varchar(12) NOT NULL DEFAULT 'ALFABETICO';

ALTER TABLE public.examen
    DROP CONSTRAINT IF EXISTS ck_examen_modo_reparto;
ALTER TABLE public.examen
    ADD CONSTRAINT ck_examen_modo_reparto CHECK (modo_reparto IN ('ALFABETICO', 'LLEGADA'));
