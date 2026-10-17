-- IMP-06 (MAST-01/02): teléfono o celular y estado de matrícula del estudiante.

-- Teléfono opcional: si se registra, 8 dígitos que empiezan con 5, 6 o 7.
ALTER TABLE public.estudiante
    ADD COLUMN IF NOT EXISTS telefono varchar(8);

ALTER TABLE public.estudiante
    ADD CONSTRAINT ck_estudiante_telefono CHECK (telefono IS NULL OR telefono ~ '^[567][0-9]{7}$');

-- Estado de matrícula. El padrón actual es de estudiantes matriculados, por eso los registros
-- existentes quedan como MATRICULADO.
ALTER TABLE public.estudiante
    ADD COLUMN IF NOT EXISTS estado_matricula varchar(20) NOT NULL DEFAULT 'MATRICULADO';

ALTER TABLE public.estudiante
    ADD CONSTRAINT ck_estudiante_estado_matricula CHECK (estado_matricula IN ('MATRICULADO', 'NO_MATRICULADO'));
