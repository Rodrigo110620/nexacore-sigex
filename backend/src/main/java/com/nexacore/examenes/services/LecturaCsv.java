package com.nexacore.examenes.services;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** Lectura común de los CSV de importación masiva (estudiantes y usuarios). */
final class LecturaCsv {

    private LecturaCsv() {}

    /** Valida que el archivo exista, no esté vacío y termine en .csv; devuelve su texto sin BOM. */
    static String leerArchivo(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo está vacío.");
        }
        String nombreArchivo = file.getOriginalFilename();
        if (nombreArchivo != null && !nombreArchivo.toLowerCase(Locale.ROOT).endsWith(".csv")) {
            throw new IllegalArgumentException("El archivo debe tener formato CSV (.csv).");
        }
        try {
            String contenido = new String(file.getBytes(), StandardCharsets.UTF_8);
            // Excel guarda el CSV UTF-8 con BOM al inicio.
            return contenido.startsWith("﻿") ? contenido.substring(1) : contenido;
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo CSV.");
        }
    }

    /** Encabezados en la primera fila, sin distinguir mayúsculas, valores recortados. */
    static CSVFormat formato(String contenido) {
        return CSVFormat.DEFAULT.builder()
            .setDelimiter(detectarDelimitador(contenido))
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreHeaderCase(true)
            .setIgnoreEmptyLines(true)
            .setTrim(true)
            .build();
    }

    /** Excel en español separa con ';'; el resto suele usar ','. */
    static char detectarDelimitador(String contenido) {
        int finLinea = contenido.indexOf('\n');
        String encabezado = finLinea >= 0 ? contenido.substring(0, finLinea) : contenido;
        long puntoYComa = encabezado.chars().filter(c -> c == ';').count();
        long comas = encabezado.chars().filter(c -> c == ',').count();
        return puntoYComa > comas ? ';' : ',';
    }

    static void validarEncabezados(List<String> encabezados, List<String> requeridas) {
        Set<String> presentes = encabezados.stream()
            .map(h -> h.trim().toLowerCase(Locale.ROOT))
            .collect(Collectors.toSet());
        List<String> faltantes = requeridas.stream()
            .filter(c -> !presentes.contains(c.toLowerCase(Locale.ROOT)))
            .toList();
        if (!faltantes.isEmpty()) {
            throw new IllegalArgumentException(
                "Faltan columnas en el CSV: " + String.join(", ", faltantes) + ".");
        }
    }

    /** Valor de la columna con los espacios internos colapsados, o "" si no viene. */
    static String valor(CSVRecord fila, String columna) {
        if (!fila.isMapped(columna) || !fila.isSet(columna)) return "";
        String v = fila.get(columna);
        return v == null ? "" : v.trim().replaceAll("\\s+", " ");
    }
}
