-- CTA-02: el personal de control reporta la foto de un estudiante que no coincide con la persona.
-- Mientras el reporte está abierto, el estudiante debe volver a escanear su rostro y la nueva foto
-- pasa a la revisión de la administración, igual que un cambio de foto.

ALTER TABLE public.estudiante_foto_solicitud
    ADD COLUMN IF NOT EXISTS origen varchar(10) NOT NULL DEFAULT 'CAMBIO';
ALTER TABLE public.estudiante_foto_solicitud
    ADD CONSTRAINT ck_estudiante_foto_solicitud_origen CHECK (origen IN ('CAMBIO', 'REPORTE'));

CREATE TABLE IF NOT EXISTS public.reporte_foto (
    id_reporte      serial       NOT NULL,
    id_estudiante   integer      NOT NULL,
    id_usuario      integer      NOT NULL,
    id_examen       integer,
    motivo          varchar(20)  NOT NULL,
    detalle         varchar(200),
    estado          varchar(10)  NOT NULL DEFAULT 'ABIERTO',
    resolucion      varchar(12),
    creado_en       timestamp    NOT NULL DEFAULT NOW(),
    resuelto_en     timestamp,
    CONSTRAINT pk_reporte_foto PRIMARY KEY (id_reporte),
    CONSTRAINT fk_reporte_foto_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_reporte_foto_usuario FOREIGN KEY (id_usuario)
        REFERENCES public.usuario (id_usuario),
    CONSTRAINT ck_reporte_foto_motivo CHECK (motivo IN ('NO_SE_PARECE', 'NO_CLARA', 'OTRO')),
    CONSTRAINT ck_reporte_foto_estado CHECK (estado IN ('ABIERTO', 'RESUELTO')),
    CONSTRAINT ck_reporte_foto_resolucion CHECK (resolucion IS NULL OR resolucion IN ('APROBADA', 'DESCARTADO'))
);

-- Un solo reporte abierto por estudiante: reportar de nuevo la misma foto no duplica la revisión.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reporte_foto_abierto
    ON public.reporte_foto (id_estudiante) WHERE estado = 'ABIERTO';
