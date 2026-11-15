package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Consulta a la mesa de ayuda. {@code sitio} es una trampa para bots: el formulario lo oculta, así que una
 * persona lo deja vacío; si llega con algo, la consulta se descarta en silencio.
 */
public record SolicitudAyudaRequest(
        @NotBlank(message = "Escribe tu nombre") @Size(min = 3, max = 120, message = "El nombre debe tener entre 3 y 120 caracteres")
        String nombre,
        @NotBlank(message = "Escribe tu correo") @Email(message = "El correo no es válido") @Size(max = 150)
        String correo,
        @NotBlank(message = "Elige el tipo de problema")
        @Pattern(regexp = "CUENTA|CONTRASENA|ACTIVACION|QR|FOTO|EXAMEN|OTRO", message = "Tipo de problema no válido")
        String tipo,
        @NotBlank(message = "Cuéntanos qué pasa") @Size(min = 15, max = 1000, message = "El mensaje debe tener entre 15 y 1000 caracteres")
        String mensaje,
        String sitio
) {}
