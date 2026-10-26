-- INCI-03: reasignar el ambiente de un estudiante durante el examen (lo hace el ADMIN). Base de la
-- propuesta de Fernando, ajustada: solo para estudiantes asociados al examen, motivo no vacío y
-- aulas distintas. El aula actual sigue en asistencia_examen.id_ambiente_ingreso (se actualiza sin
-- tocar fecha_hora_ingreso); esta tabla guarda cada traslado para la nota y el reporte final.
CREATE TABLE IF NOT EXISTS public.traslado_ambiente (
    id_traslado          serial        NOT NULL,
    id_examen            integer       NOT NULL,
    id_estudiante        integer       NOT NULL,
    id_ambiente_origen   integer       NOT NULL,
    id_ambiente_destino  integer       NOT NULL,
    motivo               varchar(500)  NOT NULL,
    id_usuario_admin     integer       NOT NULL,
    fecha_hora_traslado  timestamp     NOT NULL DEFAULT NOW(),
    -- Comentario libre opcional del ADMIN; la nota "Trasladado desde ..." se arma con origen y destino.
    observacion          varchar(1000),
    CONSTRAINT pk_traslado_ambiente PRIMARY KEY (id_traslado),
    CONSTRAINT ck_ta_motivo CHECK (motivo ~ '[^[:space:]]'),
    CONSTRAINT ck_ta_aulas_distintas CHECK (id_ambiente_origen <> id_ambiente_destino),
    CONSTRAINT fk_ta_asistencia FOREIGN KEY (id_estudiante, id_examen)
        REFERENCES public.asistencia_examen (id_estudiante, id_examen) ON DELETE RESTRICT,
    CONSTRAINT fk_ta_origen  FOREIGN KEY (id_ambiente_origen)  REFERENCES public.ambiente (id_ambiente),
    CONSTRAINT fk_ta_destino FOREIGN KEY (id_ambiente_destino) REFERENCES public.ambiente (id_ambiente),
    CONSTRAINT fk_ta_admin   FOREIGN KEY (id_usuario_admin)    REFERENCES public.usuario (id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_traslado_ambiente_examen_fecha      ON public.traslado_ambiente (id_examen, fecha_hora_traslado);
CREATE INDEX IF NOT EXISTS idx_traslado_ambiente_examen_estudiante ON public.traslado_ambiente (id_examen, id_estudiante);
