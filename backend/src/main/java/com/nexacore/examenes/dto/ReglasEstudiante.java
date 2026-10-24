package com.nexacore.examenes.dto;

import com.nexacore.examenes.models.EstadoMatricula;

/**
 * Reglas de los datos del estudiante en un solo lugar: las usan el registro, la edición y la
 * entidad, para que una regla no quede distinta en cada lado (como pasó con el teléfono).
 * El frontend las repite en utils/validators.ts.
 */
public final class ReglasEstudiante {

    /** Solo letras (con tildes y ñ); cada palabra con al menos 2, separadas por espacio, ' o -. */
    public static final String NOMBRE = "^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]{2,}(?:[ '\\-][A-Za-záéíóúÁÉÍÓÚüÜñÑ]{2,})*$";
    public static final int NOMBRE_MIN = 2;
    public static final int NOMBRE_MAX = 50;
    public static final int APELLIDOS_MIN = 2;
    public static final int APELLIDOS_MAX = 80;
    public static final String MSG_NOMBRE = "El nombre solo puede contener letras; cada palabra minimo 2 letras";
    public static final String MSG_APELLIDOS = "Los apellidos solo pueden contener letras; cada palabra minimo 2 letras";

    public static final String CI = "^\\d{7,8}$";
    public static final String MSG_CI = "El CI debe tener 7 u 8 dígitos";

    public static final String CODIGO_SIS = "^\\d{9}$";
    public static final String MSG_CODIGO_SIS = "El código SIS debe tener 9 dígitos";

    /** Para asociar a un examen: código SIS (9 dígitos) o CI (7 u 8), solo números. */
    public static final String IDENTIFICADOR = "^\\d{7,9}$";
    public static final String MSG_IDENTIFICADOR = "Usa solo números: código SIS de 9 dígitos o CI de 7 u 8";

    /** Correo institucional UMSS: al menos 3 caracteres antes de @ y no un mismo carácter repetido. */
    public static final String EMAIL = "(?i)^(?!([A-Za-z0-9_])\\1+@)[A-Za-z0-9._%+-]{3,}@(est\\.)?umss\\.edu(\\.bo)?$";
    public static final int EMAIL_MAX = 100;
    public static final String MSG_EMAIL =
            "Use un correo institucional UMSS con al menos 3 caracteres antes de @; no se aceptan caracteres repetidos";

    /** Vacío = sin teléfono (al editar, lo quita). */
    public static final String TELEFONO = EstadoMatricula.PATRON_TELEFONO;
    public static final String MSG_TELEFONO = "El teléfono debe tener 7 u 8 dígitos y empezar con 2, 3, 4, 6 o 7";

    private ReglasEstudiante() {
    }
}
