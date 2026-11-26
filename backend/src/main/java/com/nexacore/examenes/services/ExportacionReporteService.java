package com.nexacore.examenes.services;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.nexacore.examenes.dto.ExportarReporteRequest;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Descarga de los reportes (Intentos, Expulsiones, Excepciones, Fotos, Ingresos, Uso de Ambientes…) en Excel o PDF, con
 * el mismo encabezado del acta: título, filtros aplicados, quién lo generó y cuándo.
 */
@Service
public class ExportacionReporteService {

    private static final Color PRIMARIO = new Color(0x04, 0x39, 0xD9);
    private static final Color TINTA = new Color(0x01, 0x11, 0x40);
    private static final Color SUAVE = new Color(0x62, 0x7A, 0x9B);
    private static final Color BORDE = new Color(0xD8, 0xE3, 0xF5);
    private static final Color FONDO = new Color(0xF8, 0xFA, 0xFF);
    private static final DateTimeFormatter GENERADO = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private static String ahora() {
        return LocalDateTime.now(ZoneId.of("America/La_Paz")).format(GENERADO);
    }

    /** Excel: una hoja con el título, los filtros, quién lo generó y la tabla (encabezado fijo y filtros de columna). */
    public byte[] excel(ExportarReporteRequest r, String generadoPor) {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet(nombreHoja(r.titulo()));
            var negrita = libro.createFont(); negrita.setBold(true);
            var tituloFuente = libro.createFont(); tituloFuente.setBold(true); tituloFuente.setFontHeightInPoints((short) 14);
            CellStyle titulo = libro.createCellStyle(); titulo.setFont(tituloFuente);
            var blanca = libro.createFont(); blanca.setBold(true); blanca.setColor(IndexedColors.WHITE.getIndex());
            CellStyle cabecera = libro.createCellStyle();
            cabecera.setFont(blanca);
            cabecera.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            cabecera.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            CellStyle celda = libro.createCellStyle();
            celda.setWrapText(true);
            celda.setBorderBottom(BorderStyle.THIN);
            celda.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());

            int fila = 0;
            Row t = hoja.createRow(fila++);
            t.createCell(0).setCellValue("SIGEX · " + r.titulo());
            t.getCell(0).setCellStyle(titulo);
            for (String f : filtros(r)) hoja.createRow(fila++).createCell(0).setCellValue(f);
            hoja.createRow(fila++).createCell(0).setCellValue("Generado por " + generadoPor + " el " + ahora()
                    + " · " + r.filas().size() + (r.filas().size() == 1 ? " registro" : " registros"));
            fila++;
            int filaCabecera = fila;
            Row cab = hoja.createRow(fila++);
            for (int c = 0; c < r.columnas().size(); c++) {
                cab.createCell(c).setCellValue(r.columnas().get(c));
                cab.getCell(c).setCellStyle(cabecera);
            }
            for (List<String> datos : r.filas()) {
                Row fil = hoja.createRow(fila++);
                for (int c = 0; c < r.columnas().size(); c++) {
                    fil.createCell(c).setCellValue(c < datos.size() && datos.get(c) != null ? datos.get(c) : "");
                    fil.getCell(c).setCellStyle(celda);
                }
            }
            for (int c = 0; c < r.columnas().size(); c++) {
                hoja.autoSizeColumn(c);
                hoja.setColumnWidth(c, Math.min(Math.max(hoja.getColumnWidth(c), 3000), 16000));
            }
            hoja.createFreezePane(0, filaCabecera + 1);
            if (!r.filas().isEmpty()) {
                hoja.setAutoFilter(new CellRangeAddress(filaCabecera, fila - 1, 0, r.columnas().size() - 1));
            }
            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el Excel del reporte.", e);
        }
    }

    /** PDF horizontal: encabezado con el logo, título y filtros; la tabla repite su cabecera en cada página. */
    public byte[] pdf(ExportarReporteRequest r, String generadoPor) {
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Document documento = new Document(PageSize.A4.rotate(), 30, 30, 30, 36);
            PdfWriter escritor = PdfWriter.getInstance(documento, salida);
            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont negrita = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            String pie = "SIGEX · " + r.titulo() + " · generado el " + ahora();
            escritor.setPageEvent(new PdfPageEventHelper() {
                @Override public void onEndPage(PdfWriter w, Document d) {
                    ColumnText.showTextAligned(w.getDirectContent(), Element.ALIGN_LEFT,
                            new Phrase(pie, new Font(base, 7, Font.NORMAL, SUAVE)), d.left(), d.bottom() - 18, 0);
                    ColumnText.showTextAligned(w.getDirectContent(), Element.ALIGN_RIGHT,
                            new Phrase("Página " + w.getPageNumber(), new Font(base, 7, Font.NORMAL, SUAVE)), d.right(), d.bottom() - 18, 0);
                }
            });
            documento.open();

            PdfPTable encabezado = new PdfPTable(new float[]{1, 6});
            encabezado.setWidthPercentage(100);
            PdfPCell logo = new PdfPCell();
            logo.setBorder(Rectangle.NO_BORDER);
            try (InputStream in = new ClassPathResource("planilla/logo.png").getInputStream()) {
                Image img = Image.getInstance(in.readAllBytes());
                img.scaleToFit(80, 40);
                logo.addElement(img);
            } catch (IOException | RuntimeException e) {
                logo.addElement(new Phrase("SIGEX", new Font(negrita, 14, Font.BOLD, PRIMARIO)));
            }
            encabezado.addCell(logo);
            PdfPCell textos = new PdfPCell();
            textos.setBorder(Rectangle.NO_BORDER);
            textos.addElement(new Paragraph("UNIVERSIDAD MAYOR DE SAN SIMÓN · FACULTAD DE CIENCIAS Y TECNOLOGÍA", new Font(base, 7.5f, Font.NORMAL, SUAVE)));
            textos.addElement(new Paragraph(r.titulo(), new Font(negrita, 15, Font.BOLD, TINTA)));
            encabezado.addCell(textos);
            documento.add(encabezado);

            Paragraph datos = new Paragraph();
            datos.setSpacingBefore(4);
            datos.setSpacingAfter(8);
            for (String f : filtros(r)) datos.add(new Phrase(f + "\n", new Font(base, 8.5f, Font.NORMAL, TINTA)));
            datos.add(new Phrase("Generado por " + generadoPor + " el " + ahora() + " · " + r.filas().size()
                    + (r.filas().size() == 1 ? " registro" : " registros"), new Font(base, 8.5f, Font.NORMAL, SUAVE)));
            documento.add(datos);

            PdfPTable tabla = new PdfPTable(r.columnas().size());
            tabla.setWidthPercentage(100);
            tabla.setHeaderRows(1);
            Font fCab = new Font(negrita, 8, Font.BOLD, Color.WHITE);
            Font fCelda = new Font(base, 8, Font.NORMAL, TINTA);
            for (String c : r.columnas()) {
                PdfPCell celda = new PdfPCell(new Phrase(c, fCab));
                celda.setBackgroundColor(TINTA);
                celda.setBorderColor(TINTA);
                celda.setPadding(5);
                tabla.addCell(celda);
            }
            int n = 0;
            for (List<String> fila : r.filas()) {
                Color fondo = n++ % 2 == 1 ? FONDO : Color.WHITE;
                for (int c = 0; c < r.columnas().size(); c++) {
                    String v = c < fila.size() && fila.get(c) != null ? fila.get(c) : "";
                    PdfPCell celda = new PdfPCell(new Phrase(v, fCelda));
                    celda.setBackgroundColor(fondo);
                    celda.setBorderColor(BORDE);
                    celda.setPadding(4);
                    tabla.addCell(celda);
                }
            }
            if (r.filas().isEmpty()) {
                PdfPCell vacio = new PdfPCell(new Phrase("Sin registros con estos filtros.", fCelda));
                vacio.setColspan(r.columnas().size());
                vacio.setPadding(8);
                vacio.setBorderColor(BORDE);
                tabla.addCell(vacio);
            }
            documento.add(tabla);
            documento.close();
            return salida.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar el PDF del reporte.", e);
        }
    }

    private static List<String> filtros(ExportarReporteRequest r) {
        return r.filtros() == null ? List.of() : r.filtros().stream().filter(f -> f != null && !f.isBlank()).toList();
    }

    /** Excel no admite ciertos caracteres ni más de 31 en el nombre de la hoja. */
    private static String nombreHoja(String titulo) {
        String limpio = titulo.replaceAll("[\\\\/?*\\[\\]:]", " ").trim();
        return limpio.isEmpty() ? "Reporte" : limpio.substring(0, Math.min(31, limpio.length()));
    }
}
