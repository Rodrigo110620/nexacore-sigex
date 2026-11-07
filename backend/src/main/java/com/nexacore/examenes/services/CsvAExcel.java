package com.nexacore.examenes.services;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/** Convierte un reporte CSV (con BOM y ';' o ',') en un Excel .xlsx con el mismo contenido, todo como texto. */
public final class CsvAExcel {

    private CsvAExcel() {
    }

    public static byte[] convertir(byte[] csv, String hoja) {
        String texto = new String(csv, StandardCharsets.UTF_8).replaceFirst("^﻿", "");
        CSVFormat formato = CSVFormat.DEFAULT.builder().setDelimiter(LecturaCsv.detectarDelimitador(texto)).build();
        try (var libro = new XSSFWorkbook(); var out = new ByteArrayOutputStream(); var parser = CSVParser.parse(texto, formato)) {
            var pagina = libro.createSheet(hoja);
            var negrita = libro.createFont();
            negrita.setBold(true);
            var estiloEncabezado = libro.createCellStyle();
            estiloEncabezado.setFont(negrita);
            int r = 0;
            int columnas = 0;
            for (CSVRecord registro : parser) {
                var fila = pagina.createRow(r);
                for (int c = 0; c < registro.size(); c++) {
                    var celda = fila.createCell(c);
                    celda.setCellValue(registro.get(c));
                    if (r == 0) celda.setCellStyle(estiloEncabezado);
                }
                columnas = Math.max(columnas, registro.size());
                r++;
            }
            for (int c = 0; c < columnas; c++) pagina.setColumnWidth(c, 22 * 256);
            pagina.createFreezePane(0, 1);
            libro.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el Excel.", e);
        }
    }
}
