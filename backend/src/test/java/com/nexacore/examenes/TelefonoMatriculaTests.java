package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.models.EstadoMatricula;
import com.nexacore.examenes.models.Estudiante;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** IMP-06: teléfono opcional (7 u 8 dígitos, empieza con 2, 3, 4, 6 o 7) y estado de matrícula. */
class TelefonoMatriculaTests {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private RegistrarEstudianteRequest request(String telefono, String estadoMatricula) {
        // Orden: nombre, apellidos, ci, telefono, email, codigoSis, facultad, carrera, condicion, estado
        return new RegistrarEstudianteRequest("María", "González", "7489210", telefono, "maria.gonzalez@est.umss.edu", 
                "202104010", 1, 10, null, estadoMatricula);
    }

    @ParameterizedTest
    @ValueSource(strings = {"71234567", "67890123", "4256789", "33456789", ""})
    void aceptaTelefonosValidosOVacio(String telefono) {
        assertThat(validator.validate(request(telefono, null))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"51234567", "12345678", "712345", "712345678", "7123456a", "7123 4567"})
    void rechazaTelefonosInvalidos(String telefono) {
        assertThat(validator.validate(request(telefono, null)))
                .anyMatch(v -> v.getMessage().contains("7 u 8 dígitos"));
    }

    @Test
    void aceptaElEstadoDeMatriculaSinDistinguirMayusculas() {
        assertThat(validator.validate(request(null, "no_matriculado"))).isEmpty();
        assertThat(validator.validate(request(null, "OTRO"))).isNotEmpty();
        assertThat(EstadoMatricula.normalizar("no_matriculado", EstadoMatricula.MATRICULADO))
                .isEqualTo(EstadoMatricula.NO_MATRICULADO);
        assertThat(EstadoMatricula.normalizar(null, EstadoMatricula.MATRICULADO))
                .isEqualTo(EstadoMatricula.MATRICULADO);
    }

    @Test
    void alEditarNullConservaElTelefonoYVacioLoQuita() {
        assertThat(EstadoMatricula.normalizarTelefono(null, "71234567")).isEqualTo("71234567");
        assertThat(EstadoMatricula.normalizarTelefono("", "71234567")).isNull();
        assertThat(EstadoMatricula.normalizarTelefono(" 6123 4567 ", null)).isEqualTo("61234567");
        
        // Tu lógica rechaza el 5 y el 1. 
        assertThatThrownBy(() -> EstadoMatricula.normalizarTelefono("51234567", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** La entidad se valida al guardar: debe aceptar lo mismo que el formulario y la V32. */
    @ParameterizedTest
    @ValueSource(strings = {"22345678", "7123456", "71234567", "44123456"})
    void laEntidadAceptaLosTelefonosDeLaReglaNueva(String telefono) {
        Estudiante estudiante = new Estudiante();
        estudiante.setTelefono(telefono);
        assertThat(validator.validateProperty(estudiante, "telefono")).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"51234567", "12345678", "712345", "712345678"})
    void laEntidadRechazaTelefonosFueraDeLaRegla(String telefono) {
        Estudiante estudiante = new Estudiante();
        estudiante.setTelefono(telefono);
        assertThat(validator.validateProperty(estudiante, "telefono")).isNotEmpty();
    }

    private com.nexacore.examenes.dto.ActualizarEstudianteRequest edicion(String codigoSis, String telefono, String email) {
        return new com.nexacore.examenes.dto.ActualizarEstudianteRequest("María", "González", codigoSis, "7489210",
                telefono, email, 1, 10, null, null);
    }

    @Test
    void alEditarElTelefonoVacioEsValidoYLoQuita() {
        assertThat(validator.validate(edicion("202104010", "", "maria.gonzalez@est.umss.edu"))).isEmpty();
        assertThat(EstadoMatricula.normalizarTelefono("", "71234567")).isNull();
    }

    /** La edición aplica las mismas reglas que el registro (antes aceptaba esto y fallaba al guardar). */
    @Test
    void alEditarSeAplicanLasMismasReglasQueAlRegistrar() {
        assertThat(validator.validate(edicion("12345678", null, "maria.gonzalez@est.umss.edu")))
                .anyMatch(v -> v.getPropertyPath().toString().equals("codigoSis"));
        assertThat(validator.validate(edicion("202104010", null, "maria@gmail.com")))
                .anyMatch(v -> v.getPropertyPath().toString().equals("email"));
        var nombreConNumeros = new com.nexacore.examenes.dto.ActualizarEstudianteRequest("María2", "González",
                "202104010", "7489210", null, "maria.gonzalez@est.umss.edu", 1, 10, null, null);
        assertThat(validator.validate(nombreConNumeros))
                .anyMatch(v -> v.getPropertyPath().toString().equals("nombre"));
    }
}
