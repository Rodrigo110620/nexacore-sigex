-- Catálogo de materias administrable: el ADMIN crea, edita, importa y desactiva materias desde Configuración → Materias.
-- El catálogo es general (la misma materia todos los semestres); lo que cambia por periodo es la oferta: los grupos
-- (paralelo.id_periodo, V61). Una materia desactivada no se ofrece para programar exámenes ni para asignarla a un
-- docente, pero se conserva con su historial. La sigla sigue siendo única (uq_sigla); el nombre puede repetirse entre
-- planes de estudio distintos (p. ej. «Cálculo I» con siglas diferentes).
ALTER TABLE public.materia ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT true;
