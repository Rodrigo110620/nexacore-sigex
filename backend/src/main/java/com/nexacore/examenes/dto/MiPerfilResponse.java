package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Datos del estudiante para su propio panel. Solo lectura, salvo la foto y la contraseña. */
public record MiPerfilResponse(
        Integer id,
        String codigoSis,
        String nombre,
        String apellidos,
        /** C.I. enmascarado: solo los 3 últimos dígitos. */
        String ciEnmascarado,
        String email,
        String telefono,
        String estadoMatricula,
        String condicion,
        List<EstudianteListResponse.CarreraInfo> carreras,
        /** Ruta de la foto aprobada (la que ve el personal de control), o null. */
        String fotoUrl,
        /** Foto enviada por el estudiante: null, PENDIENTE o RECHAZADA. */
        SolicitudFoto solicitudFoto
) {
    public record SolicitudFoto(String estado, String motivoRechazo, LocalDateTime enviadaEn) {}
}
