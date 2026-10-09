package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;

/** activo=false bloquea la cuenta; activo=true la desbloquea. */
public record CambiarEstadoUsuarioRequest(
        @NotNull(message = "Indique si la cuenta queda activa")
        Boolean activo
) {}
