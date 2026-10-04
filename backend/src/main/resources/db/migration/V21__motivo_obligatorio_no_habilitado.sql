-- MAST-04: un estudiante NO habilitado (habilitado = false) debe tener la razón registrada.
-- Hasta ahora solo lo exigía HabilitacionService; la restricción lo garantiza también en la BD.

-- Filas previas sin razón: se marcan explícitamente para poder validar la restricción completa.
UPDATE public.asistencia_examen
   SET motivo_inhabilitacion = 'Motivo no registrado'
 WHERE habilitado = false
   AND (motivo_inhabilitacion IS NULL OR btrim(motivo_inhabilitacion) = '');

ALTER TABLE public.asistencia_examen
    ADD CONSTRAINT ck_asistencia_motivo_no_habilitado
    CHECK (habilitado IS DISTINCT FROM false
           OR (motivo_inhabilitacion IS NOT NULL AND btrim(motivo_inhabilitacion) <> ''));
