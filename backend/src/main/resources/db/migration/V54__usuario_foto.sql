-- Foto de perfil opcional del personal (ADMIN, DOCENTE y CONTROL). La del estudiante es otra cosa: es obligatoria,
-- se escanea y se usa para identificarlo en el ingreso (estudiante_foto).
CREATE TABLE IF NOT EXISTS public.usuario_foto (
    id_usuario integer NOT NULL,
    contenido bytea NOT NULL,
    tipo_contenido character varying(40) NOT NULL,
    actualizada_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_usuario_foto PRIMARY KEY (id_usuario),
    CONSTRAINT fk_usuario_foto_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE
);
