package com.nexacore.examenes.validation;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import com.nexacore.examenes.utils.ValidacionNombre;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Nombre o apellidos que parecen reales (ValidacionNombre): rechaza «Aaaa», «Qwerty», «Bbbb Cccc». El mensaje dice
 * qué falla y sale en el mismo campo, como las demás validaciones del formulario.
 */
@Documented
@Constraint(validatedBy = NombreReal.Validador.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface NombreReal {
    /** «El nombre» o «Los apellidos»: el mensaje queda «El nombre no parece un nombre real». */
    String campo() default "El nombre";

    String message() default "";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validador implements ConstraintValidator<NombreReal, String> {
        private String campo;

        @Override
        public void initialize(NombreReal anotacion) {
            campo = anotacion.campo();
        }

        @Override
        public boolean isValid(String valor, ConstraintValidatorContext contexto) {
            String problema = ValidacionNombre.problema(valor);
            if (problema == null) return true;
            contexto.disableDefaultConstraintViolation();
            contexto.buildConstraintViolationWithTemplate(campo + ": " + problema).addConstraintViolation();
            return false;
        }
    }
}
