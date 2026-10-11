-- ACCS-01/03/04: fotografía y condición del estudiante en la identificación y el control de ingreso.

-- Condición o tipo de estudiante. Los registros existentes quedan como REGULAR.
ALTER TABLE public.estudiante
    ADD COLUMN IF NOT EXISTS condicion varchar(20) NOT NULL DEFAULT 'REGULAR';

ALTER TABLE public.estudiante
    ADD CONSTRAINT ck_estudiante_condicion CHECK (condicion IN ('REGULAR', 'POSTULANTE'));

-- La foto va en su propia tabla para no leer la imagen en cada consulta del estudiante.
CREATE TABLE IF NOT EXISTS public.estudiante_foto (
    id_estudiante   integer      NOT NULL,
    contenido       bytea        NOT NULL,
    tipo_contenido  varchar(30)  NOT NULL,
    actualizado_en  timestamp    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_estudiante_foto PRIMARY KEY (id_estudiante),
    CONSTRAINT fk_estudiante_foto_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT ck_estudiante_foto_tipo CHECK (tipo_contenido IN ('image/jpeg', 'image/png', 'image/webp'))
);
