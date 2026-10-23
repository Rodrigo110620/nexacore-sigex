ALTER TABLE public.reporte_qr_duplicado
    ALTER COLUMN ci_presentado DROP NOT NULL,
    ADD COLUMN presento_carnet boolean NOT NULL DEFAULT true;
