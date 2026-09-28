-- SIGEX — V16: índice por examen para el listado y el resumen de "Control del examen" (ACCS-01).
CREATE INDEX IF NOT EXISTS ix_asistencia_examen_examen ON public.asistencia_examen (id_examen);
