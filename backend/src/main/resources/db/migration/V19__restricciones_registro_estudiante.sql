-- MAST-01: protege en PostgreSQL las reglas obligatorias del registro.
-- NOT VALID evita bloquear el despliegue por datos históricos que todavía
-- deban depurarse, pero PostgreSQL aplica ambas reglas a filas nuevas o editadas.
ALTER TABLE public.estudiante
    ADD CONSTRAINT ck_estudiante_codigo_sis_nueve_digitos
    CHECK (codigo_sis ~ '^[0-9]{9}$') NOT VALID;

ALTER TABLE public.estudiante
    ADD CONSTRAINT ck_estudiante_email_obligatorio
    CHECK (email IS NOT NULL AND btrim(email) <> '') NOT VALID;
