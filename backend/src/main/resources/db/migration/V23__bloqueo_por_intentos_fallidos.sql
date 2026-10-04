-- HU AUTH-02: tras 3 intentos fallidos consecutivos la cuenta se bloquea 15 minutos.
-- intentos_fallidos cuenta los fallos seguidos (vuelve a 0 al entrar o al bloquearse);
-- bloqueado_hasta es el fin del bloqueo, o NULL si la cuenta no está bloqueada.
ALTER TABLE public.usuario
    ADD COLUMN intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN bloqueado_hasta TIMESTAMP NULL;
