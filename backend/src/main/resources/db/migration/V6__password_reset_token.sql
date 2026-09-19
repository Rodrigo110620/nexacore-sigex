-- ============================================================
-- SIGEX — V6: Tokens de restablecimiento de contraseña
-- Guarda solo el hash SHA-256 del token (nunca el valor en claro).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.password_reset_token (
    id          SERIAL PRIMARY KEY,
    id_usuario  INTEGER NOT NULL,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_usuario
        FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_password_reset_usuario ON public.password_reset_token (id_usuario);
CREATE INDEX IF NOT EXISTS ix_password_reset_expires ON public.password_reset_token (expires_at);
