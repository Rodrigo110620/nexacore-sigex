package com.nexacore.examenes.services;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.Expulsion;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AsistenciaExportService {

    private final AsistenciaExamenRepository asistenciaRepository;
    private final ExamenRepository examenRepository;
    private final ExpulsionRepository expulsionRepository;
    private final SalidaExamenService salidaExamenService; 
    private static final DateTimeFormatter HORA_FORMATO = DateTimeFormatter.ofPattern("HH:mm:ss");

    public AsistenciaExportService(
            AsistenciaExamenRepository asistenciaRepository, 
            ExamenRepository examenRepository,
            ExpulsionRepository expulsionRepository,
            @Autowired(required = false) SalidaExamenService salidaExamenService) { 
        this.asistenciaRepository = asistenciaRepository;
        this.examenRepository = examenRepository;
        this.expulsionRepository = expulsionRepository;
        this.salidaExamenService = salidaExamenService;
    }

    private Examen validarExamenIniciado(Integer idExamen) {
        Examen examen = examenRepository.findFirstByIdIdExamen(idExamen)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen));
        String estado = com.nexacore.examenes.utils.EstadoExamen.de(examen, java.time.LocalDateTime.now());
        if (com.nexacore.examenes.utils.EstadoExamen.PROGRAMADO.equals(estado) || com.nexacore.examenes.utils.EstadoExamen.CANCELADO.equals(estado)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "No se puede descargar la asistencia porque el examen aún no ha iniciado o está cancelado.");
        }
        return examen;
    }

    @Transactional(readOnly = true)
    public String nombreArchivo(Integer idExamen, String extension) {
        Examen examen = examenRepository.findFirstByIdIdExamen(idExamen)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen));
        String materia = examen.getParalelo() != null && examen.getParalelo().getMateria() != null
                ? examen.getParalelo().getMateria().getNombre() : "examen";
        String grupo = examen.getParalelo() != null ? examen.getParalelo().getNombreGrupo() : null;
        String base = String.join("_", java.util.stream.Stream.of("asistencia", materia, grupo, String.valueOf(examen.getFecha()))
                .filter(java.util.Objects::nonNull).toList());
        String limpio = java.text.Normalizer.normalize(base, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9_.-]+", "-").replaceAll("-{2,}", "-");
        return limpio + "." + extension;
    }

    @Transactional(readOnly = true)
    public byte[] generarCsv(Integer idExamen) {
        validarExamenIniciado(idExamen); 

        List<AsistenciaExamen> asistencias = asistenciaRepository.buscarPorIdExamen(idExamen);
        java.time.LocalDateTime fin = salidaExamenService == null ? null : salidaExamenService.finSiTermino(idExamen);
        java.util.Set<Integer> expulsados = salidaExamenService == null ? java.util.Set.of() : salidaExamenService.expulsados(idExamen);
        var out = new ByteArrayOutputStream();
        var formato = CSVFormat.DEFAULT.builder()
                .setDelimiter(';')
                .setRecordSeparator("\n")
                .setHeader("Código SIS", "Nombre", "Apellidos", "Estado", "Hora de ingreso", "Hora de salida")
                .build();

        try (var writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write('\uFEFF'); 
            var printer = new CSVPrinter(writer, formato);
            for (AsistenciaExamen a : asistencias) {
                if (!Boolean.TRUE.equals(a.getHabilitado())) continue;
                
                Expulsion expulsion = expulsionRepository.findFirstByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNullOrderByFechaHoraAsc(
                        a.getEstudiante().getId(), idExamen, ExpulsionRepository.DESDE_SIEMPRE).orElse(null);
                
                String estado;
                String horaSalida;

                if (expulsion != null) {
                    estado = "Expulsado";
                    horaSalida = expulsion.getFechaHora().format(HORA_FORMATO);
                } else {
                    boolean esAsistio = a.getFechaHoraIngreso() != null;
                    estado = esAsistio ? "Asistió" : "Ausente";
                    horaSalida = salida(a, fin, expulsados);
                }

                String horaIngreso = a.getFechaHoraIngreso() != null ? a.getFechaHoraIngreso().format(HORA_FORMATO) : "-";
                printer.printRecord(a.getEstudiante().getCodigoSis(), a.getEstudiante().getNombre(), a.getEstudiante().getApellidos(), estado, horaIngreso, horaSalida);
            }
            printer.flush();
        } catch (IOException e) {
            throw new UncheckedIOException("Error al generar CSV", e);
        }
        return out.toByteArray();
    }

    @Transactional(readOnly = true)
    public byte[] generarExcel(Integer idExamen) {
        validarExamenIniciado(idExamen);

        List<AsistenciaExamen> asistencias = asistenciaRepository.buscarPorIdExamen(idExamen);
        java.time.LocalDateTime fin = salidaExamenService == null ? null : salidaExamenService.finSiTermino(idExamen);
        java.util.Set<Integer> expulsados = salidaExamenService == null ? java.util.Set.of() : salidaExamenService.expulsados(idExamen);
        
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100); 
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
             
            Sheet sheet = workbook.createSheet("Asistencia");
            
            // Estilos
            CellStyle estiloEncabezado = crearEstiloEncabezado(workbook);
            CellStyle estiloAsistio = crearEstiloColor(workbook, IndexedColors.GREEN);
            CellStyle estiloAusente = crearEstiloColor(workbook, IndexedColors.ORANGE);
            CellStyle estiloExpulsado = crearEstiloColor(workbook, IndexedColors.RED);

            Row header = sheet.createRow(0);
            String[] columnas = {"Código SIS", "Nombre", "Apellidos", "Estado", "Hora de ingreso", "Hora de salida"};
            for (int i = 0; i < columnas.length; i++) {
                Cell celdaHeader = header.createCell(i);
                celdaHeader.setCellValue(columnas[i]);
                celdaHeader.setCellStyle(estiloEncabezado);
            }

            int rowNum = 1;
            for (AsistenciaExamen a : asistencias) {
                if (!Boolean.TRUE.equals(a.getHabilitado())) continue;

                Expulsion expulsion = expulsionRepository.findFirstByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNullOrderByFechaHoraAsc(
                        a.getEstudiante().getId(), idExamen, ExpulsionRepository.DESDE_SIEMPRE).orElse(null);

                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(a.getEstudiante().getCodigoSis());
                row.createCell(1).setCellValue(a.getEstudiante().getNombre());
                row.createCell(2).setCellValue(a.getEstudiante().getApellidos());
                
                Cell celdaEstado = row.createCell(3);
                Cell celdaSalida = row.createCell(5);

                if (expulsion != null) {
                    celdaEstado.setCellValue("Expulsado");
                    celdaEstado.setCellStyle(estiloExpulsado);
                    celdaSalida.setCellValue(expulsion.getFechaHora().format(HORA_FORMATO));
                } else {
                    boolean esAsistio = a.getFechaHoraIngreso() != null;
                    celdaEstado.setCellValue(esAsistio ? "Asistió" : "Ausente");
                    celdaEstado.setCellStyle(esAsistio ? estiloAsistio : estiloAusente);
                    celdaSalida.setCellValue(salida(a, fin, expulsados));
                }

                row.createCell(4).setCellValue(a.getFechaHoraIngreso() != null ? a.getFechaHoraIngreso().format(HORA_FORMATO) : "-");
            }

            // Ajustar ancho de columnas para que se vea bien
            for (int i = 0; i < columnas.length; i++) {
                sheet.setColumnWidth(i, 5000);
            }

            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Error al generar Excel", e);
        }
    }

    private CellStyle crearEstiloEncabezado(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.BLACK.getIndex());
        style.setFont(font);
        
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        
        return style;
    }

    private CellStyle crearEstiloColor(Workbook workbook, IndexedColors color) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setColor(color.getIndex());
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private String salida(AsistenciaExamen a, java.time.LocalDateTime fin, java.util.Set<Integer> expulsados) {
        if (a.getFechaHoraSalida() != null) return a.getFechaHoraSalida().format(HORA_FORMATO);
        // Si no hay hora de ingreso, o no ha terminado el examen, o está expulsado, no hay hora de salida normal.
        if (a.getFechaHoraIngreso() == null || fin == null || expulsados.contains(a.getEstudiante().getId())) return "-";
        return fin.format(HORA_FORMATO) + SalidaExamenService.AL_CIERRE;
    }
}