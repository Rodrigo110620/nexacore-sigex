ALTER TABLE public.registro_control_ingreso
    ADD COLUMN tipo_ingreso varchar(10) NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN justificacion_manual varchar(1000);

ALTER TABLE public.registro_control_ingreso
    ADD CONSTRAINT ck_control_tipo_ingreso CHECK (tipo_ingreso IN ('NORMAL', 'MANUAL')),
    ADD CONSTRAINT ck_control_justificacion_manual CHECK (
        tipo_ingreso <> 'MANUAL' OR
        (justificacion_manual IS NOT NULL AND length(btrim(justificacion_manual)) BETWEEN 10 AND 1000)
    );
