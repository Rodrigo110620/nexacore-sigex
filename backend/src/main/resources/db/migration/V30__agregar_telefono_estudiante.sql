-- =============================================================================
-- SIGEX — V33: Agregar teléfono/celular al estudiante
-- El campo es opcional. Acepta 7 u 8 dígitos para cubrir celulares y fijos.
-- =============================================================================

ALTER TABLE public.estudiante
ADD COLUMN IF NOT EXISTS telefono VARCHAR(8);

ALTER TABLE public.estudiante
DROP CONSTRAINT IF EXISTS chk_estudiante_telefono;

-- Validación a nivel de Base de Datos:
-- Empieza con 2, 3, 4 (fijos) o 6, 7 (celulares). Permite 7 u 8 dígitos.
ALTER TABLE public.estudiante
ADD CONSTRAINT chk_estudiante_telefono
CHECK (telefono IS NULL OR telefono ~ '^[23467]\d{6,7}$');

COMMENT ON COLUMN public.estudiante.telefono IS
    'Teléfono o celular del estudiante (opcional). 7 u 8 dígitos, prefijos válidos de Bolivia.';