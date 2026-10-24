-- Historial de sesiones del examen. Al reprogramar un examen ya finalizado (para repetirlo), la
-- sesión que terminó se guarda aquí con el resultado de cada estudiante, y el examen vuelve a
-- empezar con todos "no ingresados". Los registros del control, incidencias y reportes no se
-- borran: cada sesión queda delimitada por su cerrada_en.
CREATE TABLE IF NOT EXISTS public.examen_sesion (
    id_sesion             serial       NOT NULL,
    id_examen             integer      NOT NULL,
    numero                integer      NOT NULL,
    fecha                 date         NOT NULL,
    hora_inicio           time         NOT NULL,
    duracion_minutos      integer      NOT NULL,
    id_ambiente           integer,
    asociados             integer      NOT NULL,
    ingresaron            integer      NOT NULL,
    motivo_reprogramacion varchar(200) NOT NULL,
    id_usuario            integer,
    cerrada_en            timestamp    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_examen_sesion PRIMARY KEY (id_sesion),
    CONSTRAINT uq_examen_sesion_numero UNIQUE (id_examen, numero),
    CONSTRAINT fk_examen_sesion_examen FOREIGN KEY (id_examen) REFERENCES public.examen (id_examen) ON DELETE CASCADE,
    CONSTRAINT fk_examen_sesion_ambiente FOREIGN KEY (id_ambiente) REFERENCES public.ambiente (id_ambiente),
    CONSTRAINT fk_examen_sesion_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE SET NULL,
    CONSTRAINT ck_examen_sesion_motivo CHECK (btrim(motivo_reprogramacion) <> '')
);

CREATE TABLE IF NOT EXISTS public.asistencia_sesion (
    id_sesion             integer NOT NULL,
    id_estudiante         integer NOT NULL,
    habilitado            boolean,
    motivo_inhabilitacion varchar,
    fecha_hora_ingreso    timestamp,
    id_ambiente_ingreso   integer,
    CONSTRAINT pk_asistencia_sesion PRIMARY KEY (id_sesion, id_estudiante),
    CONSTRAINT fk_asistencia_sesion_sesion FOREIGN KEY (id_sesion) REFERENCES public.examen_sesion (id_sesion) ON DELETE CASCADE,
    CONSTRAINT fk_asistencia_sesion_estudiante FOREIGN KEY (id_estudiante) REFERENCES public.estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_asistencia_sesion_ambiente FOREIGN KEY (id_ambiente_ingreso) REFERENCES public.ambiente (id_ambiente)
);
