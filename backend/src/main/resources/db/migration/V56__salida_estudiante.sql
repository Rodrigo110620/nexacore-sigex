-- Salida del estudiante del examen: la registra el CONTROL (o el docente) cuando entrega y se retira.
-- Se reinicia al reprogramar, como el ingreso. Solo quien ingresó y no fue expulsado puede salir.
ALTER TABLE asistencia_examen ADD COLUMN fecha_hora_salida TIMESTAMP;
ALTER TABLE asistencia_examen ADD COLUMN id_usuario_salida INTEGER REFERENCES usuario (id_usuario);
