-- ============================================================
-- SIGEX — V11: Control de ingreso (ACCS-02 / Aaron + Rodrigo)
-- asistencia_examen: quién autorizó y observaciones del control.
-- registro_control_ingreso: historial de cada autorización/denegación.
-- No toca intento_ingreso ni incidencia (ya cubiertos en V7).
-- ============================================================

-- Estado actual del ingreso: personal CONTROL y observaciones.
-- fecha_hora_ingreso ya existe SIN DEFAULT: se asigna con NOW()
-- al autorizar (UPDATE), no al precargar la asistencia.
ALTER TABLE public.asistencia_examen
    ADD COLUMN IF NOT EXISTS id_usuario_control integer;

ALTER TABLE public.asistencia_examen
    ADD COLUMN IF NOT EXISTS observaciones_control text;

ALTER TABLE public.asistencia_examen
    DROP CONSTRAINT IF EXISTS fk_asistencia_usuario_control;
ALTER TABLE public.asistencia_examen
    ADD CONSTRAINT fk_asistencia_usuario_control
    FOREIGN KEY (id_usuario_control)
    REFERENCES public.usuario (id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS ix_asistencia_usuario_control
    ON public.asistencia_examen (id_usuario_control);

COMMENT ON COLUMN public.asistencia_examen.fecha_hora_ingreso IS
    'Ingreso efectivo. NULL = aún no ingresó. Asignar explícitamente con NOW() al autorizar; no usar DEFAULT.';
COMMENT ON COLUMN public.asistencia_examen.id_usuario_control IS
    'Usuario con rol CONTROL que autorizó el último ingreso efectivo.';
COMMENT ON COLUMN public.asistencia_examen.observaciones_control IS
    'Observaciones del último control de ingreso autorizado.';

-- Historial: un INSERT por cada intento de control (autorizado o denegado).
-- fecha_hora sí puede llevar DEFAULT NOW() porque es fila nueva.
-- PK al estilo V2: llaves compuestas primero (examen + estudiante), serial al final.
CREATE TABLE IF NOT EXISTS public.registro_control_ingreso (
    id_examen                    integer NOT NULL,
    id_paralelo                  integer NOT NULL,
    id_estudiante                integer NOT NULL,
    id_usuario                   integer NOT NULL,
    id_control                   serial NOT NULL,
    id_usuario_control           integer NOT NULL,
    resultado_autorizacion       varchar NOT NULL,
    motivo_denegacion            text,
    verificaciones_adicionales   jsonb,
    observaciones                text,
    fecha_hora                   timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_registro_control_ingreso
        PRIMARY KEY (id_examen, id_paralelo, id_estudiante, id_usuario, id_control),
    CONSTRAINT uq_id_control UNIQUE (id_control),
    CONSTRAINT ck_registro_control_resultado
        CHECK (resultado_autorizacion IN ('AUTORIZADO', 'DENEGADO')),
    CONSTRAINT ck_registro_control_motivo
        CHECK (resultado_autorizacion <> 'DENEGADO' OR motivo_denegacion IS NOT NULL)
);
ALTER TABLE public.registro_control_ingreso OWNER TO postgres;

COMMENT ON TABLE public.registro_control_ingreso IS
    'Historial de cada autorización o denegación de ingreso (ACCS-02). asistencia_examen refleja el estado actual.';
COMMENT ON COLUMN public.registro_control_ingreso.resultado_autorizacion IS
    'AUTORIZADO | DENEGADO.';
COMMENT ON COLUMN public.registro_control_ingreso.verificaciones_adicionales IS
    'Evidencia del control (identidad, habilitación, ambiente, normas, etc.) en JSON.';
COMMENT ON COLUMN public.registro_control_ingreso.fecha_hora IS
    'Timestamp del servidor al registrar el control. DEFAULT NOW() válido porque es INSERT.';

ALTER TABLE public.registro_control_ingreso
    DROP CONSTRAINT IF EXISTS fk_registro_control_examen;
ALTER TABLE public.registro_control_ingreso
    ADD CONSTRAINT fk_registro_control_examen
    FOREIGN KEY (id_examen, id_paralelo)
    REFERENCES public.examen (id_examen, id_paralelo)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.registro_control_ingreso
    DROP CONSTRAINT IF EXISTS fk_registro_control_estudiante;
ALTER TABLE public.registro_control_ingreso
    ADD CONSTRAINT fk_registro_control_estudiante
    FOREIGN KEY (id_estudiante, id_usuario)
    REFERENCES public.estudiante (id_estudiante, id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.registro_control_ingreso
    DROP CONSTRAINT IF EXISTS fk_registro_control_usuario_control;
ALTER TABLE public.registro_control_ingreso
    ADD CONSTRAINT fk_registro_control_usuario_control
    FOREIGN KEY (id_usuario_control)
    REFERENCES public.usuario (id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS ix_registro_control_examen
    ON public.registro_control_ingreso (id_examen, id_paralelo);
CREATE INDEX IF NOT EXISTS ix_registro_control_estudiante
    ON public.registro_control_ingreso (id_estudiante, id_usuario);
CREATE INDEX IF NOT EXISTS ix_registro_control_fecha
    ON public.registro_control_ingreso (fecha_hora);
CREATE INDEX IF NOT EXISTS ix_registro_control_usuario_control
    ON public.registro_control_ingreso (id_usuario_control);
