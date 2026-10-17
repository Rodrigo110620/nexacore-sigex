package com.nexacore.examenes.dto;

import java.time.Instant;

/** QR temporal del estudiante: el contenido para dibujarlo y la misma imagen en PNG (base64). */
public record MiQrResponse(
        String contenido,
        String pngBase64,
        Instant expiraEn,
        int segundosValidez
) {}
