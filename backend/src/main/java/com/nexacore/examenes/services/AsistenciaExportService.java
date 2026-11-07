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

    /**
     * Solo se descarga la asistencia de un examen que ya empezó (en curso o finalizado). El estado se calcula con la
     * hora: el guardado en la base sigue diciendo "programado" aunque el examen ya haya empezado.
     */
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

    /** Nombre del archivo: asistencia_Base-de-Datos-I_G1_2026-11-06.xlsx (sin tildes ni espacios). */
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
                // Solo los habilitados: un no habilitado no tenía derecho a rendir, no es "Ausente".
                if (!Boolean.TRUE.equals(a.getHabilitado())) continue;
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
                if (!Boolean.TRUE.equals(a.getHabilitado())) continue;
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