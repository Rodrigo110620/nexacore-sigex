ALTER TABLE public.reporte_qr_duplicado
    ADD COLUMN estado varchar(20) NOT NULL DEFAULT 'PENDIENTE';

ALTER TABLE public.reporte_qr_duplicado
    ADD CONSTRAINT ck_reporte_incidencia_estado CHECK (estado IN ('PENDIENTE', 'PRUEBA'));
