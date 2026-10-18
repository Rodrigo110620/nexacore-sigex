-- MAST-03: las normas de cada examen pasan a su propia tabla.
-- Antes se guardaban como JSON en examen.normas: no se podían consultar ni relacionar con el
-- estudiante. Una norma GENERAL aplica a todo el examen; una PARTICULAR, a un estudiante.
-- Las eliminadas se conservan (activa = false) como historial.

CREATE TABLE IF NOT EXISTS public.norma_examen (
    id_norma          serial       NOT NULL,
    id_examen         integer      NOT NULL,
    tipo              varchar(10)  NOT NULL,
    id_estudiante     integer,
    -- Nombre con el que se registró la norma particular; las anteriores a exigir el estudiante
    -- registrado solo tienen el nombre.
    nombre_estudiante varchar(200),
    texto             text         NOT NULL,
    activa            boolean      NOT NULL DEFAULT true,
    creada_en         timestamp    NOT NULL DEFAULT NOW(),
    eliminada_en      timestamp,
    CONSTRAINT pk_norma_examen PRIMARY KEY (id_norma),
    -- uq_id_examen permite referenciar solo id_examen: no cambia al mover el examen de paralelo.
    CONSTRAINT fk_norma_examen_examen FOREIGN KEY (id_examen)
        REFERENCES public.examen (id_examen) ON DELETE CASCADE,
    CONSTRAINT fk_norma_examen_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT ck_norma_examen_tipo CHECK (tipo IN ('GENERAL', 'PARTICULAR')),
    CONSTRAINT ck_norma_examen_particular CHECK (
        (tipo = 'GENERAL' AND id_estudiante IS NULL AND nombre_estudiante IS NULL)
        OR (tipo = 'PARTICULAR' AND (id_estudiante IS NOT NULL OR nombre_estudiante IS NOT NULL)))
);

CREATE INDEX IF NOT EXISTS ix_norma_examen_examen ON public.norma_examen (id_examen);
CREATE INDEX IF NOT EXISTS ix_norma_examen_estudiante ON public.norma_examen (id_estudiante);

-- Pasa las normas guardadas como JSON. Un texto que no es JSON (exámenes muy antiguos) se toma
-- como una norma general, igual que lo hacía el backend al leerlo.
DO $$
DECLARE
    fila      record;
    doc       jsonb;
    elemento  jsonb;
    id_est    integer;
    lista     text;
BEGIN
    FOR fila IN SELECT id_examen, normas FROM public.examen
                WHERE normas IS NOT NULL AND btrim(normas) <> '' LOOP
        BEGIN
            doc := fila.normas::jsonb;
        EXCEPTION WHEN others THEN
            doc := NULL;
        END;

        IF doc IS NULL OR jsonb_typeof(doc) <> 'object' THEN
            INSERT INTO public.norma_examen (id_examen, tipo, texto)
            VALUES (fila.id_examen, 'GENERAL', fila.normas);
            CONTINUE;
        END IF;

        FOREACH lista IN ARRAY ARRAY['generales', 'generalesEliminadas'] LOOP
            IF jsonb_typeof(doc -> lista) = 'array' THEN
                FOR elemento IN SELECT * FROM jsonb_array_elements(doc -> lista) LOOP
                    IF elemento #>> '{}' IS NOT NULL AND btrim(elemento #>> '{}') <> '' THEN
                        INSERT INTO public.norma_examen (id_examen, tipo, texto, activa, eliminada_en)
                        VALUES (fila.id_examen, 'GENERAL', elemento #>> '{}',
                                lista = 'generales', CASE WHEN lista = 'generales' THEN NULL ELSE NOW() END);
                    END IF;
                END LOOP;
            END IF;
        END LOOP;

        FOREACH lista IN ARRAY ARRAY['particulares', 'particularesEliminadas'] LOOP
            IF jsonb_typeof(doc -> lista) = 'array' THEN
                FOR elemento IN SELECT * FROM jsonb_array_elements(doc -> lista) LOOP
                    IF jsonb_typeof(elemento) <> 'object'
                       OR coalesce(btrim(elemento ->> 'texto'), '') = '' THEN
                        CONTINUE;
                    END IF;
                    -- Solo se conserva el id si el estudiante todavía existe.
                    id_est := NULL;
                    IF (elemento ->> 'idEstudiante') ~ '^[0-9]+$' THEN
                        SELECT e.id_estudiante INTO id_est FROM public.estudiante e
                        WHERE e.id_estudiante = (elemento ->> 'idEstudiante')::integer;
                    END IF;
                    IF id_est IS NULL AND coalesce(btrim(elemento ->> 'estudiante'), '') = '' THEN
                        CONTINUE;
                    END IF;
                    INSERT INTO public.norma_examen
                        (id_examen, tipo, id_estudiante, nombre_estudiante, texto, activa, eliminada_en)
                    VALUES (fila.id_examen, 'PARTICULAR', id_est,
                            coalesce(nullif(btrim(elemento ->> 'estudiante'), ''), 'Estudiante ' || id_est),
                            elemento ->> 'texto',
                            lista = 'particulares', CASE WHEN lista = 'particulares' THEN NULL ELSE NOW() END);
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END $$;

COMMENT ON COLUMN public.examen.normas IS
    'Obsoleta desde V34: las normas están en norma_examen. Se conserva solo como respaldo.';
