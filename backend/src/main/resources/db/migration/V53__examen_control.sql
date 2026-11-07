-- Personal de control asignado a cada examen. Lo asigna el ADMIN o el docente del examen. El CONTROL ve
-- reportes y notificaciones solo de sus exámenes asignados; puede controlar otro examen (por ejemplo,
-- para reemplazar a un compañero), pero ese registro queda marcado como reemplazo.
CREATE TABLE IF NOT EXISTS public.examen_control (
    id_examen integer NOT NULL,
    id_usuario integer NOT NULL,
    asignado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_examen_control PRIMARY KEY (id_examen, id_usuario),
    CONSTRAINT fk_examen_control_examen FOREIGN KEY (id_examen) REFERENCES public.examen (id_examen) ON DELETE CASCADE,
    CONSTRAINT fk_examen_control_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_examen_control_usuario ON public.examen_control (id_usuario);
