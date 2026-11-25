package com.nexacore.examenes.dto;

/** Personal de control; con su aula cuando está asignado a un examen de varias aulas (V66). */
public record PersonalControlResponse(Integer idUsuario, String nombre, String apellidos, String email,
                                      boolean disponible, String conflictoHorario, Integer idAmbiente, String ambiente) {
    public PersonalControlResponse(Integer idUsuario, String nombre, String apellidos, String email) {
        this(idUsuario, nombre, apellidos, email, true, null, null, null);
    }

    public PersonalControlResponse(Integer idUsuario, String nombre, String apellidos, String email,
                                   boolean disponible, String conflictoHorario) {
        this(idUsuario, nombre, apellidos, email, disponible, conflictoHorario, null, null);
    }
}
