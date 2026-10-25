-- Notificaciones en vivo de los reportes del control (foto, QR duplicado, intentos, aula
-- incorrecta, excepciones). Las ven todos los ADMIN, todo el personal de CONTROL y el DOCENTE del
-- examen. Cada usuario marca las suyas como leídas.
CREATE TABLE IF NOT EXISTS public.notificacion (
    id_notificacion serial       NOT NULL,
    tipo            varchar(40)  NOT NULL,
    titulo          varchar(200) NOT NULL,
    detalle         varchar(500),
    -- Examen del reporte; null si el reporte no es de un examen (p. ej. foto reportada desde la ficha).
    id_examen       integer,
    id_estudiante   integer,
    -- Pantalla del frontend donde se revisa el reporte.
    enlace          varchar(300),
    -- Quien hizo el reporte: no se le notifica su propio reporte.
    id_autor        integer,
    creada_en       timestamp    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_notificacion PRIMARY KEY (id_notificacion),
    CONSTRAINT fk_notificacion_examen FOREIGN KEY (id_examen) REFERENCES public.examen (id_examen) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_estudiante FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_autor FOREIGN KEY (id_autor) REFERENCES public.usuario (id_usuario) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_notificacion_examen ON public.notificacion (id_examen);

CREATE TABLE IF NOT EXISTS public.notificacion_leida (
    id_notificacion integer   NOT NULL,
    id_usuario      integer   NOT NULL,
    leida_en        timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_notificacion_leida PRIMARY KEY (id_notificacion, id_usuario),
    CONSTRAINT fk_notificacion_leida_notificacion FOREIGN KEY (id_notificacion)
        REFERENCES public.notificacion (id_notificacion) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_leida_usuario FOREIGN KEY (id_usuario)
        REFERENCES public.usuario (id_usuario) ON DELETE CASCADE
);
