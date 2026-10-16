-- Credencial aleatoria por estudiante. Solo se conserva su hash SHA-256; el secreto
-- viaja una sola vez dentro del QR y puede revocarse/regenerarse sin borrar al estudiante.
CREATE TABLE IF NOT EXISTS public.estudiante_qr_credencial (
    id_estudiante integer NOT NULL,
    hash_credencial varchar(64) NOT NULL,
    version uuid NOT NULL,
    revocado boolean NOT NULL DEFAULT false,
    generado_en timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_estudiante_qr_credencial PRIMARY KEY (id_estudiante),
    CONSTRAINT fk_estudiante_qr_credencial_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES public.estudiante(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT uq_estudiante_qr_credencial_hash UNIQUE (hash_credencial)
);
