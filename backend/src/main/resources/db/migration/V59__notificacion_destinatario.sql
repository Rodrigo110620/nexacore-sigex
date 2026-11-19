-- Notificación para una sola persona (p. ej. «la mesa de ayuda respondió tu consulta»). Sin destinatario,
-- la notificación sigue siendo para el personal según el examen, como hasta ahora.
ALTER TABLE public.notificacion ADD COLUMN IF NOT EXISTS id_destinatario INTEGER;
ALTER TABLE public.notificacion DROP CONSTRAINT IF EXISTS fk_notificacion_destinatario;
ALTER TABLE public.notificacion ADD CONSTRAINT fk_notificacion_destinatario
    FOREIGN KEY (id_destinatario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS ix_notificacion_destinatario ON public.notificacion (id_destinatario) WHERE id_destinatario IS NOT NULL;
