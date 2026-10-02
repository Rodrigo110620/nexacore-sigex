-- MAST-04 / HU#04: al asociar un estudiante a un examen queda PENDIENTE de habilitación.
-- habilitado: true = habilitado, false = no habilitado (con motivo), NULL = pendiente.
ALTER TABLE asistencia_examen ALTER COLUMN habilitado DROP DEFAULT;

COMMENT ON COLUMN asistencia_examen.habilitado IS
    'true = habilitado; false = no habilitado (motivo_inhabilitacion obligatorio); NULL = pendiente de habilitación.';
