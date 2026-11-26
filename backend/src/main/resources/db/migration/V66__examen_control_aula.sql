-- Aula de cada personal de control (V66). Cuando el examen se reparte en varias aulas, cada control queda a cargo de
-- una. NULL: sin aula fija (exámenes de una sola aula o asignaciones anteriores a esta migración).
ALTER TABLE public.examen_control ADD COLUMN IF NOT EXISTS id_ambiente integer;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_examen_control_ambiente') THEN
        ALTER TABLE public.examen_control ADD CONSTRAINT fk_examen_control_ambiente
            FOREIGN KEY (id_ambiente) REFERENCES public.ambiente (id_ambiente) ON DELETE SET NULL;
    END IF;
END $$;
