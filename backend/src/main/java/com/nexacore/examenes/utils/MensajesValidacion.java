package com.nexacore.examenes.utils;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.lang.annotation.Annotation;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Une los errores de validación de una fila importada en un solo mensaje.
 *
 * <p>Si un campo viene vacío solo se informa que es obligatorio: decir además que «debe tener 9
 * dígitos» no ayuda a corregirlo.</p>
 */
public final class MensajesValidacion {

    private MensajesValidacion() {
    }

    public static String unir(Collection<? extends ConstraintViolation<?>> violaciones) {
        Set<String> camposVacios = violaciones.stream()
                .filter(MensajesValidacion::esObligatorio)
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
        return violaciones.stream()
                .filter(v -> esObligatorio(v) || !camposVacios.contains(v.getPropertyPath().toString()))
                .map(ConstraintViolation::getMessage)
                .distinct()
                .sorted()
                .collect(Collectors.joining("; ")) + ".";
    }

    private static boolean esObligatorio(ConstraintViolation<?> v) {
        Annotation a = v.getConstraintDescriptor().getAnnotation();
        return a instanceof NotBlank || a instanceof NotNull || a instanceof NotEmpty;
    }
}
