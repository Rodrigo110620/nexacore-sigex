package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Una sesión abierta del usuario; actual = la del dispositivo desde el que consulta. */
public record SesionResponse(String idSesion, String dispositivo, String ip, LocalDateTime iniciadaEn,
                             LocalDateTime ultimaActividad, boolean actual) {}
