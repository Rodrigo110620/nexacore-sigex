package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Datos profesionales del DOCENTE; los registra y los cambia solo el ADMIN. Título y especialidad son opcionales. */
public record DatosDocenteRequest(
        @Size(max = 40, message = "El título no puede superar 40 caracteres")
        String titulo,
        @Size(max = 100, message = "La especialidad no puede superar 100 caracteres")
        String especialidad,
        @Pattern(regexp = "TITULAR|INTERINO|INVITADO", message = "La categoría debe ser Titular, Interino o Invitado")
        String categoria) {}
