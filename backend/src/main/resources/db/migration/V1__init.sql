-- ============================================================
-- SIGEX — Migración inicial del esquema
-- Sprint 1: Solo estructura base de autenticación.
-- Las tablas de negocio (examenes, estudiantes, aulas, etc.)
-- se agregarán en V2, V3... a lo largo de los Sprints.
-- ============================================================

-- Roles del sistema
CREATE TABLE IF NOT EXISTS roles (
    id      BIGSERIAL PRIMARY KEY,
    nombre  VARCHAR(50) NOT NULL UNIQUE
);

-- Usuarios del sistema (administradores, docentes, personal de control)
CREATE TABLE IF NOT EXISTS usuarios (
    id           BIGSERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en    TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Relación usuarios ↔ roles (many-to-many)
CREATE TABLE IF NOT EXISTS usuario_roles (
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id     BIGINT NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

-- Roles iniciales del sistema (según Parte B: admin, docente, personal de control)
INSERT INTO roles (nombre) VALUES
    ('ROLE_ADMIN'),
    ('ROLE_DOCENTE'),
    ('ROLE_CONTROL')
ON CONFLICT (nombre) DO NOTHING;
