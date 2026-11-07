package com.nexacore.examenes.services;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * IMP-13: convierte la primera hoja de un .xlsx en texto CSV para que la importación use las mismas
 * validaciones y mensajes por fila que con un .csv. Cada celda se toma como se ve en Excel (DataFormatter):
 * un código SIS 202100101 queda «202100101», no «2.021001E8».
 */
final class ExcelACsv {

    private ExcelACsv() {}

    static boolean esExcel(String nombreArchivo) {
        return nombreArchivo != null && nombreArchivo.toLowerCase(Locale.ROOT).endsWith(".xlsx");
    }

    static String convertir(byte[] bytes) {
        try (Workbook libro = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            if (libro.getNumberOfSheets() == 0) throw new IllegalArgumentException("El archivo Excel no tiene hojas.");
            Sheet hoja = libro.getSheetAt(0);
            DataFormatter formato = new DataFormatter(Locale.ROOT);
            int columnas = 0;
            Row encabezado = hoja.getRow(hoja.getFirstRowNum());
            if (encabezado != null) columnas = Math.max(encabezado.getLastCellNum(), 0);
            StringWriter salida = new StringWriter();
            try (CSVPrinter csv = new CSVPrinter(salida, CSVFormat.DEFAULT)) {
                for (int r = hoja.getFirstRowNum(); r <= hoja.getLastRowNum(); r++) {
                    Row fila = hoja.getRow(r);
                    List<String> valores = new ArrayList<>(columnas);
                    boolean vacia = true;
                    for (int c = 0; c < columnas; c++) {
                        Cell celda = fila == null ? null : fila.getCell(c);
                        String valor = celda == null ? "" : formato.formatCellValue(celda).trim();
                        if (!valor.isEmpty()) vacia = false;
                        valores.add(valor);
                    }
                    // Las filas totalmente vacías (p. ej. formato aplicado hasta abajo) no son estudiantes.
                    if (!vacia) csv.printRecord(valores);
                }
            }
            return salida.toString();
        } catch (IOException | RuntimeException e) {
            if (e instanceof IllegalArgumentException iae && iae.getMessage() != null && iae.getMessage().startsWith("El archivo")) throw iae;
            throw new IllegalArgumentException("No se pudo leer el archivo Excel (.xlsx). Revisa que no esté dañado ni protegido con contraseña.");
        }
    }
}
