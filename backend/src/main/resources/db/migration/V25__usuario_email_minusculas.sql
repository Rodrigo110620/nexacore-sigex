-- ============================================================
-- SIGEX — V25: correos de usuario en minúsculas
-- El backend ahora guarda y busca los correos en minúsculas (alta, edición,
-- login y recuperación). Normaliza los existentes para que puedan iniciar sesión.
-- No toca un correo si su versión en minúsculas ya pertenece a otro usuario:
-- ese caso queda para revisarlo a mano en vez de romper uq_emails.
-- ============================================================

UPDATE public.usuario u
SET email = lower(u.email)
WHERE u.email <> lower(u.email)
  AND NOT EXISTS (
      SELECT 1 FROM public.usuario o
      WHERE o.id_usuario <> u.id_usuario
        AND lower(o.email) = lower(u.email)
  );
