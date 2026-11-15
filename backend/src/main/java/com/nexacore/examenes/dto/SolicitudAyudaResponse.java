package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Una consulta de la mesa de ayuda, para la bandeja del ADMIN. */
public record SolicitudAyudaResponse(
        Integer id, String nombre, String correo, String tipo, String mensaje, String origen, String rol,
        String estado, LocalDateTime creadaEn, String respuesta, String atendidaPor, LocalDateTime atendidaEn) {}
