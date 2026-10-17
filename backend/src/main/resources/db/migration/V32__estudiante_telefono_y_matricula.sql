-- =============================================================================
-- SIGEX — V32: Agregar teléfono/celular y estado de matrícula al estudiante
-- =============================================================================

ALTER TABLE public.estudiante
ADD COLUMN IF NOT EXISTS telefono VARCHAR(8);

ALTER TABLE public.estudiante
DROP CONSTRAINT IF EXISTS chk_estudiante_telefono;

ALTER TABLE public.estudiante
ADD CONSTRAINT chk_estudiante_telefono
CHECK (telefono IS NULL OR telefono ~ '^[23467]\d{6,7}$');

COMMENT ON COLUMN public.estudiante.telefono IS
    'Teléfono o celular del estudiante (opcional). 7 u 8 dígitos, prefijos válidos de Bolivia.';


ALTER TABLE public.estudiante
    ADD COLUMN IF NOT EXISTS estado_matricula varchar(20) NOT NULL DEFAULT 'MATRICULADO';

ALTER TABLE public.estudiante
    DROP CONSTRAINT IF EXISTS ck_estudiante_estado_matricula;

ALTER TABLE public.estudiante
    ADD CONSTRAINT ck_estudiante_estado_matricula CHECK (estado_matricula IN ('MATRICULADO', 'NO_MATRICULADO'));