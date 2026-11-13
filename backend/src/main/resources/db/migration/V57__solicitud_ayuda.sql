-- Mesa de ayuda: consultas que llegan desde el login (sin sesión) o desde el panel (con sesión).
-- El ADMIN las ve en Configuración → Mesa de ayuda y las marca como atendidas (con respuesta por correo).
CREATE TABLE solicitud_ayuda (
    id_solicitud   SERIAL PRIMARY KEY,
    nombre         VARCHAR(120)  NOT NULL,
    correo         VARCHAR(150)  NOT NULL,
    tipo           VARCHAR(30)   NOT NULL,
    mensaje        VARCHAR(1000) NOT NULL,
    origen         VARCHAR(20)   NOT NULL DEFAULT 'LOGIN',
    id_usuario     INTEGER REFERENCES usuario (id_usuario),
    rol            VARCHAR(60),
    estado         VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE',
    creada_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respuesta      VARCHAR(1000),
    id_atendida_por INTEGER REFERENCES usuario (id_usuario),
    atendida_en    TIMESTAMP
);

CREATE INDEX idx_solicitud_ayuda_estado ON solicitud_ayuda (estado, creada_en DESC);
