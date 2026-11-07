package com.nexacore.examenes.services;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
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
    private static final DateTimeFormatter HORA_FORMATO = DateTimeFormatter.ofPattern("HH:mm:ss");

    public AsistenciaExportService(AsistenciaExamenRepository asistenciaRepository, ExamenRepository examenRepository) {
        this.asistenciaRepository = asistenciaRepository;
        this.examenRepository = examenRepository; 
    }

    //VALIDACIÓN DE SEGURIDAD 
    private void validarExamenIniciado(Integer idExamen) {
        Examen examen = examenRepository.findFirstByIdIdExamen(idExamen)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "Examen no encontrado"));
        
        String estado = examen.getEstado() != null ? examen.getEstado().toLowerCase() : "programado";
        
        if (estado.equals("programado") || estado.equals("cancelado")) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, 
                "No se puede descargar la asistencia porque el examen aún no ha iniciado o está cancelado.");
        }
    }

    @Transactional(readOnly = true)
    public byte[] generarCsv(Integer idExamen) {
        validarExamenIniciado(idExamen); 

        List<AsistenciaExamen> asistencias = asistenciaRepository.buscarPorIdExamen(idExamen);
        var out = new ByteArrayOutputStream();
        var formato = CSVFormat.DEFAULT.builder()
                .setDelimiter(';')
                .setRecordSeparator("\n")
                .setHeader("Código SIS", "Nombre", "Apellidos", "Estado", "Hora")
                .build();

        try (var writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write('\uFEFF'); 
            var printer = new CSVPrinter(writer, formato);
            for (AsistenciaExamen a : asistencias) {
                boolean esAsistio = a.getFechaHoraIngreso() != null;
                String estado = esAsistio ? "Asistió" : "Ausente";
                String hora = esAsistio ? a.getFechaHoraIngreso().format(HORA_FORMATO) : "-";
                printer.printRecord(a.getEstudiante().getCodigoSis(), a.getEstudiante().getNombre(), a.getEstudiante().getApellidos(), estado, hora);
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
        
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100); 
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
             
            Sheet sheet = workbook.createSheet("Asistencia");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Código SIS");
            header.createCell(1).setCellValue("Nombre");
            header.createCell(2).setCellValue("Apellidos");
            header.createCell(3).setCellValue("Estado");
            header.createCell(4).setCellValue("Hora");

            int rowNum = 1;
            for (AsistenciaExamen a : asistencias) {
                boolean esAsistio = a.getFechaHoraIngreso() != null;
                
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(a.getEstudiante().getCodigoSis());
                row.createCell(1).setCellValue(a.getEstudiante().getNombre());
                row.createCell(2).setCellValue(a.getEstudiante().getApellidos());
                row.createCell(3).setCellValue(esAsistio ? "Asistió" : "Ausente");
                row.createCell(4).setCellValue(esAsistio ? a.getFechaHoraIngreso().format(HORA_FORMATO) : "-");
            }

            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Error al generar Excel", e);
        }
    }
}