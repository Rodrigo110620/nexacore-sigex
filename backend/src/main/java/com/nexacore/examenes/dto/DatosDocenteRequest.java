package com.nexacore.examenes.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Datos profesionales del DOCENTE; los registra y los cambia solo el ADMIN. Título y especialidad son opcionales.
 * La especialidad, si se escribe, solo admite letras con un espacio entre palabras y tiene entre 10 y 100 caracteres;
 * se guarda sin espacios sobrantes y en formato oración (UsuarioService).
 */
public record DatosDocenteRequest(
        @Size(max = 40, message = "El título no puede superar 40 caracteres")
        String titulo,
        @Size(max = 100, message = "La especialidad no puede superar 100 caracteres")
        @Pattern(regexp = "^\\s*$|^\\s*\\p{L}+( \\p{L}+)*\\s*$", message = "La especialidad solo admite letras, con un espacio entre palabras")
        String especialidad,
        @Pattern(regexp = "TITULAR|INTERINO|INVITADO", message = "La categoría debe ser Titular, Interino o Invitado")
        String categoria) {

    public static final int ESPECIALIDAD_MIN = 10;

    /** Vacía está bien (es opcional); escrita, al menos 10 caracteres. */
    @JsonIgnore
    @Hidden
    @AssertTrue(message = "La especialidad debe tener al menos 10 caracteres")
    public boolean isEspecialidadLargoValido() {
        return especialidad == null || especialidad.isBlank() || especialidad.strip().length() >= ESPECIALIDAD_MIN;
    }
}
