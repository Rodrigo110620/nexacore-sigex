-- El C.I. del estudiante pasa a ser opcional: la administración puede registrarlo (manual o por CSV)
-- solo con código SIS, nombre, apellidos, facultad y carrera; el estudiante escribe su C.I. al activar
-- su cuenta. uq_estudiante_ci sigue vigente: en PostgreSQL varios NULL no chocan entre sí.
ALTER TABLE public.estudiante ALTER COLUMN ci DROP NOT NULL;
