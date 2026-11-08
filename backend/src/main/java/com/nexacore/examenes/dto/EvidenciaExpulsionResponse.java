package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Una evidencia de la expulsión (sin la imagen, que se pide aparte). */
public record EvidenciaExpulsionResponse(Integer idEvidencia, String tipo, long tamano, LocalDateTime subidaEn) {}
