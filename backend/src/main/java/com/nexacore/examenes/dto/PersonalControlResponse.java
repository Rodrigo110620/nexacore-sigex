package com.nexacore.examenes.dto;

/** Un usuario del personal de control (asignado a un examen o disponible para asignarlo). */
public record PersonalControlResponse(Integer idUsuario, String nombre, String apellidos, String email,
                                      boolean disponible, String conflictoHorario) {
    public PersonalControlResponse(Integer idUsuario, String nombre, String apellidos, String email) {
        this(idUsuario, nombre, apellidos, email, true, null);
    }
}
