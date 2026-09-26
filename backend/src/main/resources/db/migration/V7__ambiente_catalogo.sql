-- ============================================================
-- SIGEX — V7: Completar esquema pliego
-- ambiente, intento_ingreso, seed incidencias, docente,
-- inscripcion_paralelo
-- ============================================================

-- Catálogo (mismo patrón que materia / catalogo_incidencia)
CREATE TABLE IF NOT EXISTS public.ambiente (
    id_ambiente serial NOT NULL,
    nombre      varchar NOT NULL,
    ubicacion   varchar,
    CONSTRAINT pk_ambiente PRIMARY KEY (id_ambiente),
    CONSTRAINT uq_ambiente_nombre UNIQUE (nombre)
);
ALTER TABLE public.ambiente OWNER TO postgres;

COMMENT ON TABLE public.ambiente IS
    'Catálogo de ambientes de evaluación. Permite incorporar espacios sin tocar el esquema.';

-- Migrar nombres ya usados en examen → catálogo
INSERT INTO public.ambiente (nombre, ubicacion)
SELECT DISTINCT TRIM(e.ambiente_asignado), NULL
FROM public.examen e
WHERE e.ambiente_asignado IS NOT NULL
  AND TRIM(e.ambiente_asignado) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM public.ambiente a
      WHERE a.nombre = TRIM(e.ambiente_asignado)
  );

-- Migrar nombres ya usados en asistencia → catálogo
INSERT INTO public.ambiente (nombre, ubicacion)
SELECT DISTINCT TRIM(a.ambiente_ingreso), NULL
FROM public.asistencia_examen a
WHERE a.ambiente_ingreso IS NOT NULL
  AND TRIM(a.ambiente_ingreso) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM public.ambiente am
      WHERE am.nombre = TRIM(a.ambiente_ingreso)
  );

-- Fallback si queda algún examen sin match
INSERT INTO public.ambiente (nombre, ubicacion)
SELECT 'SIN ASIGNAR', 'Pendiente de asignación'
WHERE NOT EXISTS (
    SELECT 1 FROM public.ambiente WHERE nombre = 'SIN ASIGNAR'
);

-- examen: nueva columna FK
ALTER TABLE public.examen
    ADD COLUMN IF NOT EXISTS id_ambiente integer;

UPDATE public.examen e
SET id_ambiente = am.id_ambiente
FROM public.ambiente am
WHERE e.id_ambiente IS NULL
  AND e.ambiente_asignado IS NOT NULL
  AND TRIM(e.ambiente_asignado) = am.nombre;

UPDATE public.examen
SET id_ambiente = (SELECT id_ambiente FROM public.ambiente WHERE nombre = 'SIN ASIGNAR')
WHERE id_ambiente IS NULL;

ALTER TABLE public.examen
    ALTER COLUMN id_ambiente SET NOT NULL;

ALTER TABLE public.examen
    DROP CONSTRAINT IF EXISTS fk_examen_ambiente;
ALTER TABLE public.examen
    ADD CONSTRAINT fk_examen_ambiente
    FOREIGN KEY (id_ambiente)
    REFERENCES public.ambiente (id_ambiente)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.examen
    DROP COLUMN IF EXISTS ambiente_asignado;

-- asistencia_examen: ambiente de ingreso (nullable = aún no ingresó)
ALTER TABLE public.asistencia_examen
    ADD COLUMN IF NOT EXISTS id_ambiente_ingreso integer;

UPDATE public.asistencia_examen a
SET id_ambiente_ingreso = am.id_ambiente
FROM public.ambiente am
WHERE a.id_ambiente_ingreso IS NULL
  AND a.ambiente_ingreso IS NOT NULL
  AND TRIM(a.ambiente_ingreso) = am.nombre;

ALTER TABLE public.asistencia_examen
    DROP CONSTRAINT IF EXISTS fk_asistencia_ambiente_ingreso;
ALTER TABLE public.asistencia_examen
    ADD CONSTRAINT fk_asistencia_ambiente_ingreso
    FOREIGN KEY (id_ambiente_ingreso)
    REFERENCES public.ambiente (id_ambiente)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.asistencia_examen
    DROP COLUMN IF EXISTS ambiente_ingreso;

-- Habilitación previa (pliego req. 3 y 6):
-- Se cubre precargando asistencia_examen (habilitado=true, fecha_hora_ingreso NULL)
-- al programar el examen; el día del control solo se actualiza fecha_hora_ingreso
-- e id_ambiente_ingreso. No se requiere tabla inscripcion_paralelo adicional.
COMMENT ON TABLE public.asistencia_examen IS
    'Lista de habilitación e ingreso por examen. Precargar inscritos (habilitado); fecha_hora_ingreso NULL = aún no ingresó.';

-- ============================================================
-- intento_ingreso (req. 9): quien intenta entrar a un examen
-- que no le corresponde. ci_o_codigo siempre; estudiante opcional.
-- PK compuesta al estilo V1/V2.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intento_ingreso (
    id_intento         serial NOT NULL,
    id_examen          integer NOT NULL,
    id_paralelo        integer NOT NULL,
    id_usuario_control integer NOT NULL,
    ci_o_codigo        varchar NOT NULL,
    id_estudiante      integer,
    id_usuario         integer,
    fecha_hora         timestamp DEFAULT CURRENT_TIMESTAMP,
    observacion        varchar,
    CONSTRAINT pk_intento_ingreso PRIMARY KEY (id_intento, id_examen, id_paralelo),
    CONSTRAINT uq_id_intento UNIQUE (id_intento)
);
ALTER TABLE public.intento_ingreso OWNER TO postgres;

COMMENT ON TABLE public.intento_ingreso IS
    'Intentos de ingreso a un examen que no corresponde al estudiante (pliego req. 9 y 13).';

ALTER TABLE public.intento_ingreso
    DROP CONSTRAINT IF EXISTS fk_intento_examen;
ALTER TABLE public.intento_ingreso
    ADD CONSTRAINT fk_intento_examen
    FOREIGN KEY (id_examen, id_paralelo)
    REFERENCES public.examen (id_examen, id_paralelo)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.intento_ingreso
    DROP CONSTRAINT IF EXISTS fk_intento_usuario_control;
ALTER TABLE public.intento_ingreso
    ADD CONSTRAINT fk_intento_usuario_control
    FOREIGN KEY (id_usuario_control)
    REFERENCES public.usuario (id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.intento_ingreso
    DROP CONSTRAINT IF EXISTS fk_intento_estudiante;
ALTER TABLE public.intento_ingreso
    ADD CONSTRAINT fk_intento_estudiante
    FOREIGN KEY (id_estudiante, id_usuario)
    REFERENCES public.estudiante (id_estudiante, id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS ix_intento_examen
    ON public.intento_ingreso (id_examen, id_paralelo);
CREATE INDEX IF NOT EXISTS ix_intento_fecha
    ON public.intento_ingreso (fecha_hora);

-- ============================================================
-- Seed tipos de incidencia (req. 14-15)
-- ============================================================
INSERT INTO public.catalogo_incidencia (nombre, descripcion)
SELECT v.nombre, v.descripcion
FROM (VALUES
    ('NO_HABILITADO', 'Estudiante no habilitado para el examen'),
    ('PROBLEMA_IDENTIFICACION', 'Problema al verificar identidad (CI, SIS o QR)'),
    ('CAMBIO_AMBIENTE', 'Cambio de ambiente de evaluación'),
    ('EXPULSION', 'Estudiante expulsado del examen'),
    ('INTENTO_NO_CORRESPONDE', 'Intento de ingreso a examen que no le corresponde')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM public.catalogo_incidencia c WHERE c.nombre = v.nombre
);

-- ============================================================
-- docente (extensión 1:1 de usuario, como estudiante)
-- paralelo.id_docente sigue siendo id_usuario del docente.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.docente (
    id_usuario   integer NOT NULL,
    titulo       varchar,
    especialidad varchar,
    -- UMSS/CEUB: TITULAR (ordinario), INTERINO, INVITADO (extraordinarios)
    categoria    varchar NOT NULL DEFAULT 'INTERINO',
    CONSTRAINT pk_docente PRIMARY KEY (id_usuario),
    CONSTRAINT ck_docente_categoria CHECK (categoria IN ('TITULAR', 'INTERINO', 'INVITADO'))
);
ALTER TABLE public.docente OWNER TO postgres;

COMMENT ON TABLE public.docente IS
    'Datos propios del docente. categoria: TITULAR | INTERINO | INVITADO (régimen UMSS/CEUB).';
COMMENT ON COLUMN public.docente.categoria IS
    'TITULAR=ordinario; INTERINO/INVITADO=extraordinarios. INVITADO incluye visitantes/externos.';

ALTER TABLE public.docente
    DROP CONSTRAINT IF EXISTS fk_docente_usuario;
ALTER TABLE public.docente
    ADD CONSTRAINT fk_docente_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuario (id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

-- Docentes ya referenciados en paralelo
INSERT INTO public.docente (id_usuario, categoria)
SELECT DISTINCT p.id_docente, 'INTERINO'
FROM public.paralelo p
WHERE NOT EXISTS (
    SELECT 1 FROM public.docente d WHERE d.id_usuario = p.id_docente
);

-- Usuarios con rol DOCENTE aún sin fila
INSERT INTO public.docente (id_usuario, categoria)
SELECT DISTINCT ur.id_usuario, 'INTERINO'
FROM public.usuario_rol ur
JOIN public.rol r ON r.id_rol = ur.id_rol
WHERE UPPER(r.nombre) = 'DOCENTE'
  AND NOT EXISTS (
      SELECT 1 FROM public.docente d WHERE d.id_usuario = ur.id_usuario
  );

-- Redirigir FK de paralelo: usuario → docente
ALTER TABLE public.paralelo
    DROP CONSTRAINT IF EXISTS fk_paralelo_docente;
ALTER TABLE public.paralelo
    ADD CONSTRAINT fk_paralelo_docente
    FOREIGN KEY (id_docente)
    REFERENCES public.docente (id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

-- ============================================================
-- inscripcion_paralelo (habilitación a materia/grupo antes del examen)
-- asistencia_examen queda para el examen concreto (ingreso del día).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inscripcion_paralelo (
    id_estudiante     integer NOT NULL,
    id_usuario        integer NOT NULL,
    id_paralelo       integer NOT NULL,
    id_materia        integer NOT NULL,
    id_docente        integer NOT NULL,
    fecha_inscripcion timestamp DEFAULT CURRENT_TIMESTAMP,
    estado            varchar DEFAULT 'inscrito',
    CONSTRAINT pk_inscripcion_paralelo
        PRIMARY KEY (id_estudiante, id_paralelo, id_materia, id_docente)
);
ALTER TABLE public.inscripcion_paralelo OWNER TO postgres;

COMMENT ON TABLE public.inscripcion_paralelo IS
    'Inscripción del estudiante a un paralelo. Base para precargar asistencia_examen al crear un examen.';

ALTER TABLE public.inscripcion_paralelo
    DROP CONSTRAINT IF EXISTS fk_inscripcion_estudiante;
ALTER TABLE public.inscripcion_paralelo
    ADD CONSTRAINT fk_inscripcion_estudiante
    FOREIGN KEY (id_estudiante, id_usuario)
    REFERENCES public.estudiante (id_estudiante, id_usuario)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

ALTER TABLE public.inscripcion_paralelo
    DROP CONSTRAINT IF EXISTS fk_inscripcion_paralelo;
ALTER TABLE public.inscripcion_paralelo
    ADD CONSTRAINT fk_inscripcion_paralelo
    FOREIGN KEY (id_paralelo, id_materia, id_docente)
    REFERENCES public.paralelo (id_paralelo, id_materia, id_docente)
    MATCH SIMPLE
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS ix_inscripcion_paralelo
    ON public.inscripcion_paralelo (id_paralelo, id_materia, id_docente);
CREATE INDEX IF NOT EXISTS ix_inscripcion_estudiante
    ON public.inscripcion_paralelo (id_estudiante, id_usuario);
