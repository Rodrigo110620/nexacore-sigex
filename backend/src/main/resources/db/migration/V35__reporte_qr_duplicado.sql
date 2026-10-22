CREATE TABLE public.reporte_qr_duplicado (
    id_reporte serial PRIMARY KEY,
    id_examen integer NOT NULL,
    id_estudiante_qr integer NOT NULL,
    id_usuario_control integer NOT NULL,
    nombres_presentado varchar(160) NOT NULL,
    ci_presentado varchar(30) NOT NULL,
    codigo_sis_presentado varchar(30),
    detalle varchar(1000) NOT NULL,
    foto_contenido bytea NOT NULL,
    foto_tipo_contenido varchar(30) NOT NULL,
    fecha_hora_dispositivo timestamp NOT NULL,
    fecha_hora_servidor timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reporte_qr_examen FOREIGN KEY (id_examen) REFERENCES public.examen(id_examen),
    CONSTRAINT fk_reporte_qr_estudiante FOREIGN KEY (id_estudiante_qr) REFERENCES public.estudiante(id_estudiante),
    CONSTRAINT fk_reporte_qr_control FOREIGN KEY (id_usuario_control) REFERENCES public.usuario(id_usuario)
);

CREATE INDEX ix_reporte_qr_duplicado_examen ON public.reporte_qr_duplicado(id_examen, fecha_hora_servidor DESC);
COMMENT ON TABLE public.reporte_qr_duplicado IS 'Reporte de posible uso indebido de un QR ya registrado; no constituye una conclusión de suplantación.';
