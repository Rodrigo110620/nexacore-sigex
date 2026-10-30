package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Crear o editar un rol extra. Al editar, el nombre no cambia (se ignora). */
public record GuardarRolRequest(
        @Pattern(regexp = "^[A-Z][A-Z_]{2,29}$",
                message = "El nombre debe tener de 3 a 30 letras mayúsculas o guiones bajos, sin espacios (p. ej. SUPERVISOR)")
        String nombre,
        @Size(max = 200, message = "La descripción no puede superar 200 caracteres")
        String descripcion,
        @NotNull(message = "Indica los permisos del rol")
        List<String> permisos
) {}
