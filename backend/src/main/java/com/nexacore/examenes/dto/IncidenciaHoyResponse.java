package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/**
 * Una incidencia de hoy para «Incidencias → Revisar» del inicio del ADMIN: las mismas que cuenta el contador
 * (expulsión, intento incorrecto, excepción de no habilitado, ingreso manual, traslado y QR duplicado).
 */
public record IncidenciaHoyResponse(String tipo, LocalDateTime fechaHora, Integer idExamen, String examen,
                                    String estudiante, String detalle) {}
