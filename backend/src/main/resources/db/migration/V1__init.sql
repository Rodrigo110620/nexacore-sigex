-- ** Database generated with pgModeler (PostgreSQL Database Modeler).
-- ** pgModeler version: 2.0.0-beta
-- ** PostgreSQL version: 18.0
-- ** Project Site: pgmodeler.io
-- ** Model Author: ---

-- ** Database creation must be performed outside a multi lined SQL file.
-- ** These commands were put in this file only as a convenience.

-- object: scrip | type: DATABASE --
-- DROP DATABASE IF EXISTS scrip;
-- ddl-end --


-- object: "NexaCore" | type: SCHEMA --
-- DROP SCHEMA IF EXISTS "NexaCore" CASCADE;
CREATE SCHEMA "NexaCore";
-- ddl-end --
ALTER SCHEMA "NexaCore" OWNER TO postgres;
-- ddl-end --

SET search_path TO pg_catalog,public,"NexaCore";
-- ddl-end --

-- object: public.rol | type: TABLE --
-- DROP TABLE IF EXISTS public.rol CASCADE;
CREATE TABLE public.rol (
                            id_rol serial NOT NULL,
                            nombre varchar NOT NULL,
                            CONSTRAINT pk_rol PRIMARY KEY (id_rol),
                            CONSTRAINT uq_rol_nombre UNIQUE (nombre)
);
-- ddl-end --
ALTER TABLE public.rol OWNER TO postgres;
-- ddl-end --

-- object: public.usuario | type: TABLE --
-- DROP TABLE IF EXISTS public.usuario CASCADE;
CREATE TABLE public.usuario (
                                id_usuario serial NOT NULL,
                                nombre varchar NOT NULL,
                                apellidos varchar NOT NULL,
                                ci varchar NOT NULL,
                                email varchar NOT NULL,
                                password varchar NOT NULL,
                                estado varchar DEFAULT 'activo',
                                CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
                                CONSTRAINT uq_ci UNIQUE (ci),
                                CONSTRAINT uq_emails UNIQUE (email)
);
-- ddl-end --
ALTER TABLE public.usuario OWNER TO postgres;
-- ddl-end --

-- object: public.usuario_rol | type: TABLE --
-- DROP TABLE IF EXISTS public.usuario_rol CASCADE;
CREATE TABLE public.usuario_rol (
                                    id_usuario integer NOT NULL,
                                    id_rol integer NOT NULL,
                                    CONSTRAINT pk_usuario_rol PRIMARY KEY (id_usuario,id_rol)
);
-- ddl-end --
ALTER TABLE public.usuario_rol OWNER TO postgres;
-- ddl-end --

-- object: public.auditoria_operacion | type: TABLE --
-- DROP TABLE IF EXISTS public.auditoria_operacion CASCADE;
CREATE TABLE public.auditoria_operacion (
                                            id_auditoria serial NOT NULL,
                                            id_usuario integer NOT NULL,
                                            accion varchar NOT NULL,
                                            fecha_hora timestamp DEFAULT CURRENT_TIMESTAMP,
                                            detalles text,
                                            CONSTRAINT pk_auditoria PRIMARY KEY (id_auditoria,id_usuario)
);
-- ddl-end --
ALTER TABLE public.auditoria_operacion OWNER TO postgres;
-- ddl-end --

-- object: public.estudiante | type: TABLE --
-- DROP TABLE IF EXISTS public.estudiante CASCADE;
CREATE TABLE public.estudiante (
                                   id_estudiante serial NOT NULL,
                                   id_usuario integer NOT NULL,
                                   codigo_sis varchar NOT NULL,
                                   CONSTRAINT pk_estudiante PRIMARY KEY (id_estudiante,id_usuario),
                                   CONSTRAINT uq_id_usuario UNIQUE (id_usuario),
                                   CONSTRAINT uq_codigo_sis UNIQUE (codigo_sis),
                                   CONSTRAINT uq_id_estudiante UNIQUE (id_estudiante)
);
-- ddl-end --
ALTER TABLE public.estudiante OWNER TO postgres;
-- ddl-end --

-- object: public.materia | type: TABLE --
-- DROP TABLE IF EXISTS public.materia CASCADE;
CREATE TABLE public.materia (
                                id_materia serial NOT NULL,
                                sigla varchar NOT NULL,
                                nombre varchar NOT NULL,
                                CONSTRAINT pk_materia PRIMARY KEY (id_materia),
                                CONSTRAINT uq_sigla UNIQUE (sigla)
);
-- ddl-end --
ALTER TABLE public.materia OWNER TO postgres;
-- ddl-end --

-- object: public.paralelo | type: TABLE --
-- DROP TABLE IF EXISTS public.paralelo CASCADE;
CREATE TABLE public.paralelo (
                                 id_paralelo serial NOT NULL,
                                 id_materia integer NOT NULL,
                                 id_docente integer NOT NULL,
                                 nombre_grupo varchar NOT NULL,
                                 CONSTRAINT pk_paralelo PRIMARY KEY (id_paralelo,id_materia,id_docente),
                                 CONSTRAINT uq_id_paralelo UNIQUE (id_paralelo)
);
-- ddl-end --
ALTER TABLE public.paralelo OWNER TO postgres;
-- ddl-end --

-- object: public.examen | type: TABLE --
-- DROP TABLE IF EXISTS public.examen CASCADE;
CREATE TABLE public.examen (
                               id_examen serial NOT NULL,
                               id_paralelo integer NOT NULL,
                               fecha date NOT NULL,
                               hora_inicio time NOT NULL,
                               duracion_minutos integer NOT NULL,
                               ambiente_asignado varchar NOT NULL,
                               normas text,
                               estado varchar DEFAULT 'programado',
                               CONSTRAINT pk_examen PRIMARY KEY (id_examen,id_paralelo),
                               CONSTRAINT uq_id_examen UNIQUE (id_examen)
);
-- ddl-end --
ALTER TABLE public.examen OWNER TO postgres;
-- ddl-end --

-- object: public.asistencia_examen | type: TABLE --
-- DROP TABLE IF EXISTS public.asistencia_examen CASCADE;
CREATE TABLE public.asistencia_examen (
                                          id_estudiante integer NOT NULL,
                                          id_examen integer NOT NULL,
                                          habilitado boolean DEFAULT true,
                                          motivo_inhabilitacion varchar,
                                          fecha_hora_ingreso timestamp,
                                          ambiente_ingreso varchar,
                                          CONSTRAINT pk_asistencia_examen PRIMARY KEY (id_estudiante,id_examen)
);
-- ddl-end --
ALTER TABLE public.asistencia_examen OWNER TO postgres;
-- ddl-end --

-- object: public.catalogo_incidencia | type: TABLE --
-- DROP TABLE IF EXISTS public.catalogo_incidencia CASCADE;
CREATE TABLE public.catalogo_incidencia (
                                            id_tipo_incidencia serial NOT NULL,
                                            nombre varchar NOT NULL,
                                            descripcion varchar,
                                            CONSTRAINT pk_tipo_incidencia PRIMARY KEY (id_tipo_incidencia),
                                            CONSTRAINT uq_nombre UNIQUE (nombre)
);
-- ddl-end --
ALTER TABLE public.catalogo_incidencia OWNER TO postgres;
-- ddl-end --

-- object: public.incidencia | type: TABLE --
-- DROP TABLE IF EXISTS public.incidencia CASCADE;
CREATE TABLE public.incidencia (
                                   id_incidencia serial NOT NULL,
                                   id_examen integer NOT NULL,
                                   id_estudiante integer NOT NULL,
                                   id_usuario_control integer NOT NULL,
                                   id_tipo_incidencia integer NOT NULL,
                                   descripcion text,
                                   fecha_hora timestamp DEFAULT CURRENT_TIMESTAMP,
                                   CONSTRAINT pk_incidencia PRIMARY KEY (id_incidencia,id_examen,id_estudiante,id_usuario_control,id_tipo_incidencia)
);
-- ddl-end --
ALTER TABLE public.incidencia OWNER TO postgres;
-- ddl-end --

-- object: fk_usuario_rol | type: CONSTRAINT --
-- ALTER TABLE public.usuario_rol DROP CONSTRAINT IF EXISTS fk_usuario_rol CASCADE;
ALTER TABLE public.usuario_rol ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol)
    REFERENCES public.rol (id_rol) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_usuario_usuario | type: CONSTRAINT --
-- ALTER TABLE public.usuario_rol DROP CONSTRAINT IF EXISTS fk_usuario_usuario CASCADE;
ALTER TABLE public.usuario_rol ADD CONSTRAINT fk_usuario_usuario FOREIGN KEY (id_usuario)
    REFERENCES public.usuario (id_usuario) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_auditoria_operacion_usuario | type: CONSTRAINT --
-- ALTER TABLE public.auditoria_operacion DROP CONSTRAINT IF EXISTS fk_auditoria_operacion_usuario CASCADE;
ALTER TABLE public.auditoria_operacion ADD CONSTRAINT fk_auditoria_operacion_usuario FOREIGN KEY (id_usuario)
    REFERENCES public.usuario (id_usuario) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_estudiante_usuario | type: CONSTRAINT --
-- ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS fk_estudiante_usuario CASCADE;
ALTER TABLE public.estudiante ADD CONSTRAINT fk_estudiante_usuario FOREIGN KEY (id_usuario)
    REFERENCES public.usuario (id_usuario) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_paralelo_materia | type: CONSTRAINT --
-- ALTER TABLE public.paralelo DROP CONSTRAINT IF EXISTS fk_paralelo_materia CASCADE;
ALTER TABLE public.paralelo ADD CONSTRAINT fk_paralelo_materia FOREIGN KEY (id_materia)
    REFERENCES public.materia (id_materia) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_examen_paralelo | type: CONSTRAINT --
-- ALTER TABLE public.examen DROP CONSTRAINT IF EXISTS fk_examen_paralelo CASCADE;
ALTER TABLE public.examen ADD CONSTRAINT fk_examen_paralelo FOREIGN KEY (id_paralelo)
    REFERENCES public.paralelo (id_paralelo) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fl_asistencia_examen | type: CONSTRAINT --
-- ALTER TABLE public.asistencia_examen DROP CONSTRAINT IF EXISTS fl_asistencia_examen CASCADE;
ALTER TABLE public.asistencia_examen ADD CONSTRAINT fl_asistencia_examen FOREIGN KEY (id_examen)
    REFERENCES public.examen (id_examen) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_asistencia_estudiante | type: CONSTRAINT --
-- ALTER TABLE public.asistencia_examen DROP CONSTRAINT IF EXISTS fk_asistencia_estudiante CASCADE;
ALTER TABLE public.asistencia_examen ADD CONSTRAINT fk_asistencia_estudiante FOREIGN KEY (id_estudiante)
    REFERENCES public.estudiante (id_estudiante) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_incidencia_estudiante | type: CONSTRAINT --
-- ALTER TABLE public.incidencia DROP CONSTRAINT IF EXISTS fk_incidencia_estudiante CASCADE;
ALTER TABLE public.incidencia ADD CONSTRAINT fk_incidencia_estudiante FOREIGN KEY (id_estudiante)
    REFERENCES public.estudiante (id_estudiante) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_incidencia_examen | type: CONSTRAINT --
-- ALTER TABLE public.incidencia DROP CONSTRAINT IF EXISTS fk_incidencia_examen CASCADE;
ALTER TABLE public.incidencia ADD CONSTRAINT fk_incidencia_examen FOREIGN KEY (id_examen)
    REFERENCES public.examen (id_examen) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_incidencia_usuario | type: CONSTRAINT --
-- ALTER TABLE public.incidencia DROP CONSTRAINT IF EXISTS fk_incidencia_usuario CASCADE;
ALTER TABLE public.incidencia ADD CONSTRAINT fk_incidencia_usuario FOREIGN KEY (id_usuario_control)
    REFERENCES public.usuario (id_usuario) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_catalogo_incidencia | type: CONSTRAINT --
-- ALTER TABLE public.incidencia DROP CONSTRAINT IF EXISTS fk_catalogo_incidencia CASCADE;
ALTER TABLE public.incidencia ADD CONSTRAINT fk_catalogo_incidencia FOREIGN KEY (id_tipo_incidencia)
    REFERENCES public.catalogo_incidencia (id_tipo_incidencia) MATCH SIMPLE
    ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

