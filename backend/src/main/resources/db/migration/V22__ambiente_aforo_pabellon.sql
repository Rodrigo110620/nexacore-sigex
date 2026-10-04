-- HU#03 CA-55: el ambiente muestra su aforo y su pabellón al elegirlo para un examen.
-- Ambos son opcionales: los ambientes ya cargados quedan sin datos hasta que se completen.

ALTER TABLE public.ambiente ADD COLUMN IF NOT EXISTS capacidad integer;
ALTER TABLE public.ambiente ADD COLUMN IF NOT EXISTS pabellon varchar(60);

ALTER TABLE public.ambiente
    ADD CONSTRAINT ck_ambiente_capacidad_positiva CHECK (capacidad IS NULL OR capacidad > 0);
