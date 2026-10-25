-- Hora real de cada registro (clock_timestamp), no la del inicio de su transacción (NOW()).
-- Los registros de un examen reprogramado se separan por la hora de cierre de la sesión: con NOW(),
-- algo guardado justo después de reprogramar podía quedar con una hora anterior al cierre y caer en
-- la sesión equivocada. Misma idea que la corrección de expulsiones de INCI-01.
ALTER TABLE public.registro_control_ingreso ALTER COLUMN fecha_hora SET DEFAULT clock_timestamp();
ALTER TABLE public.intento_ingreso ALTER COLUMN fecha_hora SET DEFAULT clock_timestamp();
ALTER TABLE public.incidencia ALTER COLUMN fecha_hora SET DEFAULT clock_timestamp();
ALTER TABLE public.reporte_qr_duplicado ALTER COLUMN fecha_hora_servidor SET DEFAULT clock_timestamp();
ALTER TABLE public.excepcion_no_habilitado ALTER COLUMN fecha_hora SET DEFAULT clock_timestamp();
ALTER TABLE public.traslado_ambiente ALTER COLUMN fecha_hora_traslado SET DEFAULT clock_timestamp();
ALTER TABLE public.expulsion ALTER COLUMN fecha_hora SET DEFAULT clock_timestamp();
