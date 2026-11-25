-- Sigla provisional: si el ADMIN no conoce la sigla oficial al crear la materia, SIGEX sugiere una a partir del nombre
-- (p. ej. «Teoría de Grafos» → TG-101) y la marca como provisional hasta que se reemplace por la del plan de estudios.
ALTER TABLE public.materia ADD COLUMN IF NOT EXISTS sigla_provisional boolean NOT NULL DEFAULT false;
