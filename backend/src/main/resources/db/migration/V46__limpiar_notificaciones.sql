-- Cada usuario puede limpiar sus notificaciones cuando quiera, sin borrárselas a los demás (las
-- notificaciones son compartidas entre ADMIN, CONTROL y el DOCENTE del examen).
-- Quitar una sola: queda oculta solo para ese usuario.
ALTER TABLE public.notificacion_leida ADD COLUMN IF NOT EXISTS oculta boolean NOT NULL DEFAULT false;

-- "Limpiar todas": desde qué notificación vuelve a ver (las anteriores ya no se le muestran). Una
-- fila por usuario, así la tabla no crece con cada limpieza.
CREATE TABLE IF NOT EXISTS public.notificacion_limpieza (
    id_usuario   integer   NOT NULL,
    hasta_id     integer   NOT NULL,
    limpiada_en  timestamp NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_notificacion_limpieza PRIMARY KEY (id_usuario),
    CONSTRAINT fk_notificacion_limpieza_usuario FOREIGN KEY (id_usuario)
        REFERENCES public.usuario (id_usuario) ON DELETE CASCADE
);
