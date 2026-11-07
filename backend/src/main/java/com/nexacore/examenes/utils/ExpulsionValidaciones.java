package com.nexacore.examenes.utils;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Objects;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import static org.springframework.http.HttpStatus.*;

/** Reglas sin acceso a BD. No registran expulsiones ni sustituyen la transacción futura. */
public final class ExpulsionValidaciones {
    // Una frase en mayúsculas no distingue palabras de siglas: lista explícita ya reconocida por INCI-01.
    private static final Set<String> SIGLAS_EXPULSION = Set.of("CI", "SIS", "QR", "PDF", "C");
    private static final Pattern PALABRA = Pattern.compile("[\\p{L}\\p{N}]+");
    private static final Pattern LETRA = Pattern.compile("\\p{L}");
    private static final Pattern ANULACION_NO_PERMITIDO = Pattern.compile("[^A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9 .,;:]");
    private static final Pattern ANULACION_SIGNOS = Pattern.compile("[.,;:]{2}");
    private static final Pattern ANULACION_INCONSISTENTE = Pattern.compile("(?iu)^(.{1,3})\\1{2,}$|[bcdfghjklmnñpqrstvwxyz]{10}");

    private ExpulsionValidaciones() {
    }

    public static String responsableAutenticado(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ControlIngresoException(UNAUTHORIZED, "Se requiere una sesión autenticada");
        }
        // Que el docente sea el de ese examen lo verifica la ruta (ExamenAccesoService.puedeExpulsar).
        boolean puede = com.nexacore.examenes.security.Permisos.alguno(authentication,
                com.nexacore.examenes.security.Permiso.EXPULSAR_TODOS, com.nexacore.examenes.security.Permiso.EXPULSAR_PROPIOS);
        if (!puede) throw new ControlIngresoException(FORBIDDEN, "Solo el administrador o el docente del examen puede expulsar estudiantes");
        return authentication.getName();
    }

    public static String motivo(String motivo) {
        motivo = ExpulsarEstudianteRequest.normalizarEspacios(motivo);
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("El motivo de expulsión es obligatorio");
        }
        String texto = ValidacionTextoLibre.validarOpcional(
                motivo, "El motivo de expulsión", ExpulsarEstudianteRequest.MOTIVO_MIN, ExpulsarEstudianteRequest.MOTIVO_MAX);
        if (texto.contains("\n") || texto.contains("\r")) {
            throw new IllegalArgumentException("El motivo solo permite un espacio entre palabras");
        }
        if (texto.codePoints().noneMatch(Character::isLetter)) {
            throw new IllegalArgumentException("El motivo debe contener palabras que expliquen la expulsión");
        }
        // Excepciones de expulsión, no de otras HU. La heurística no garantiza el significado de una frase.
        String garabato = ValidacionPalabras.primerGarabato(texto.replaceAll(
                "(?i)\\b(?:qr|ci|sis|whatsapp|pdf|chatgpt|c|smartwatch)\\b", "documento"));
        if (garabato != null) {
            throw new IllegalArgumentException("El motivo contiene contenido no válido: " + garabato);
        }
        var primeraLetra = LETRA.matcher(texto);
        int inicioOracion = primeraLetra.find() ? primeraLetra.start() : -1;
        return PALABRA.matcher(texto).replaceAll(coincidencia -> {
            String palabra = coincidencia.group();
            String sigla = palabra.toUpperCase(Locale.forLanguageTag("es"));
            if (SIGLAS_EXPULSION.contains(sigla)) return sigla;
            // Conserva la escritura de códigos con cifras; las validaciones anteriores siguen vigentes.
            if (palabra.chars().anyMatch(c -> c >= '0' && c <= '9')) return palabra;
            String minusculas = palabra.toLowerCase(Locale.forLanguageTag("es"));
            return coincidencia.start() == inicioOracion
                    ? Character.toUpperCase(minusculas.charAt(0)) + minusculas.substring(1) : minusculas;
        });
    }

    /** Motivo de la anulación (expulsión registrada por error): obligatorio, de 10 a 100 caracteres. */
    public static String motivoAnulacion(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("Indica por qué se anula la expulsión");
        }
        if (motivo.length() > 100) throw new IllegalArgumentException("El motivo de la anulación no puede superar 100 caracteres");
        if (ANULACION_NO_PERMITIDO.matcher(motivo).find()) {
            throw new IllegalArgumentException("El motivo de la anulación solo permite letras españolas, números, espacios y los signos , . ; :");
        }
        if (ANULACION_SIGNOS.matcher(motivo).find()) {
            throw new IllegalArgumentException("El motivo de la anulación no permite signos de puntuación consecutivos");
        }
        String texto = motivo.strip().replaceAll(" +", " ");
        if (texto.length() < 10) throw new IllegalArgumentException("El motivo de la anulación debe tener al menos 10 caracteres");
        if (texto.codePoints().noneMatch(Character::isLetter)) {
            throw new IllegalArgumentException("El motivo de la anulación debe incluir palabras, no solo números o signos");
        }
        if (texto.replace(" ", "").matches("(?iu)(.)\\1+")) {
            throw new IllegalArgumentException("El motivo de la anulación no puede ser un mismo carácter repetido");
        }
        var palabras = PALABRA.matcher(texto);
        while (palabras.find()) {
            String palabra = palabras.group();
            // Guardas conservadoras de tokens largos; no comprueban significado ni usan diccionario.
            if (palabra.length() >= 8 && palabra.chars().noneMatch(c -> c >= '0' && c <= '9')
                    && ANULACION_INCONSISTENTE.matcher(palabra).find()) {
                throw new IllegalArgumentException("El motivo de la anulación contiene texto inconsistente o secuencias repetitivas; describe la razón de la anulación");
            }
        }
        // Misma convención de IMP-14, aplicada solo a la anulación; motivo() permanece intacto.
        var primeraLetra = LETRA.matcher(texto);
        int inicioOracion = primeraLetra.find() ? primeraLetra.start() : -1;
        return PALABRA.matcher(texto).replaceAll(coincidencia -> {
            String palabra = coincidencia.group();
            String sigla = palabra.toUpperCase(Locale.forLanguageTag("es"));
            if (SIGLAS_EXPULSION.contains(sigla)) return sigla;
            if (palabra.chars().anyMatch(c -> c >= '0' && c <= '9')) return palabra;
            String minusculas = palabra.toLowerCase(Locale.forLanguageTag("es"));
            return coincidencia.start() == inicioOracion
                    ? Character.toUpperCase(minusculas.charAt(0)) + minusculas.substring(1) : minusculas;
        });
    }

    public static void asistencia(ExpulsarEstudianteRequest request, AsistenciaExamen asistencia) {
        if (asistencia == null || asistencia.getId() == null
                || !Objects.equals(request.idEstudiante(), asistencia.getId().getIdEstudiante())
                || !Objects.equals(request.idExamen(), asistencia.getId().getIdExamen())) {
            throw new ControlIngresoException(NOT_FOUND, "El estudiante no está asociado al examen seleccionado");
        }
        if (asistencia.getFechaHoraIngreso() == null) {
            throw new ControlIngresoException(CONFLICT, "El estudiante todavía no tiene un ingreso registrado");
        }
    }
}
