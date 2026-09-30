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
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteCarrera;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Planilla con los estudiantes registrados, en CSV o PDF.
 *
 * El CSV usa las mismas columnas que la importación masiva (con IDs), así sirve de
 * plantilla para volver a importar. El PDF es para leer o imprimir: muestra los
 * nombres de facultad y carrera en lugar de sus IDs.
 * Un estudiante con varias carreras aparece en una fila por carrera, como en la importación.
 */
@Service
public class PlanillaEstudiantesService {

    private static final Color PRIMARIO = new Color(0x04, 0x39, 0xD9);
    private static final Color TINTA = new Color(0x01, 0x11, 0x40);
    private static final Color SUAVE = new Color(0x62, 0x7A, 0x9B);
    private static final Color BORDE = new Color(0xB8, 0xC4, 0xD4);
    private static final Color FONDO = new Color(0xF8, 0xFA, 0xFC);

    private final EstudianteRepository estudianteRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;

    public PlanillaEstudiantesService(
        EstudianteRepository estudianteRepository,
        EstudianteCarreraRepository estudianteCarreraRepository
    ) {
        this.estudianteRepository = estudianteRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
    }

    /** Una fila de la planilla. Facultad y carrera en null si el estudiante no tiene carrera. */
    record Fila(
        String codigoSis, String nombre, String apellidos, String ci, String email,
        Integer idFacultad, String facultad, Integer idCarrera, String carrera
    ) {}

    @Transactional(readOnly = true)
    public List<Fila> filas() {
        Map<Integer, List<EstudianteCarrera>> carrerasPorEstudiante = estudianteCarreraRepository
            .findAllConCarreraYFacultad().stream()
            .collect(Collectors.groupingBy(ec -> ec.getId().getIdEstudiante()));

        List<Fila> filas = new ArrayList<>();
        for (Estudiante e : estudianteRepository.findAll(Sort.by("apellidos", "nombre", "id"))) {
            List<EstudianteCarrera> carreras = carrerasPorEstudiante.getOrDefault(e.getId(), List.of());
            if (carreras.isEmpty()) {
                filas.add(new Fila(e.getCodigoSis(), e.getNombre(), e.getApellidos(), e.getCi(), e.getEmail(),
                    null, null, null, null));
                continue;
            }
            carreras.stream()
                .sorted(Comparator.comparing(ec -> ec.getCarrera().getNombre()))
                .forEach(ec -> filas.add(new Fila(
                    e.getCodigoSis(), e.getNombre(), e.getApellidos(), e.getCi(), e.getEmail(),
                    ec.getId().getIdFacultad(), ec.getCarrera().getFacultad().getNombre(),
                    ec.getId().getIdCarrera(), ec.getCarrera().getNombre()
                )));
        }
        return filas;
    }

    /** CSV con ';' y BOM, igual que la plantilla, para que Excel en español lo abra en columnas. */
    public byte[] csv() {
        var out = new ByteArrayOutputStream();
        var formato = CSVFormat.DEFAULT.builder()
            .setDelimiter(';')
            .setRecordSeparator("\n")
            .setHeader(ImportacionEstudiantesService.COLUMNAS.toArray(String[]::new))
            .build();
        try (var writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            // El BOM va antes de crear el printer: CSVPrinter escribe el encabezado al construirse.
            writer.write('\uFEFF');
            var printer = new CSVPrinter(writer, formato);
            for (Fila f : filas()) {
                printer.printRecord(f.codigoSis(), f.nombre(), f.apellidos(), f.ci(), f.email(),
                    f.idFacultad(), f.idCarrera());
            }
            printer.flush();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar la planilla CSV.", e);
        }
        return out.toByteArray();
    }

    public byte[] pdf() {
        List<Fila> filas = filas();
        var out = new ByteArrayOutputStream();
        var document = new Document(PageSize.A4.rotate(), 36, 36, 30, 30);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont negrita = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);

            long estudiantes = filas.stream().map(Fila::codigoSis).distinct().count();
            document.add(encabezado(base, negrita, estudiantes));
            document.add(tabla(filas, base, negrita));
            document.close();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar la planilla PDF.", e);
        }
        return out.toByteArray();
    }

    private PdfPTable encabezado(BaseFont base, BaseFont negrita, long total) throws IOException {
        var tabla = new PdfPTable(new float[]{1, 2});
        tabla.setWidthPercentage(100);
        tabla.setSpacingAfter(10);

        try (InputStream logo = new ClassPathResource("planilla/logo.png").getInputStream()) {
            Image imagen = Image.getInstance(logo.readAllBytes());
            imagen.scaleToFit(110, 32);
            var celda = new PdfPCell(imagen, false);
            celda.setBorder(Rectangle.NO_BORDER);
            celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
            tabla.addCell(celda);
        }

        var titulo = new Paragraph();
        titulo.add(new Phrase("Planilla de estudiantes\n", new Font(negrita, 16, Font.NORMAL, TINTA)));
        titulo.add(new Phrase(
            total + (total == 1 ? " estudiante registrado" : " estudiantes registrados")
                + " · " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
            new Font(base, 9, Font.NORMAL, SUAVE)));
        var celda = new PdfPCell(titulo);
        celda.setBorder(Rectangle.NO_BORDER);
        celda.setHorizontalAlignment(Element.ALIGN_RIGHT);
        celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
        tabla.addCell(celda);
        return tabla;
    }

    private PdfPTable tabla(List<Fila> filas, BaseFont base, BaseFont negrita) {
        var tabla = new PdfPTable(new float[]{0.5f, 1.5f, 1.8f, 2.1f, 1.2f, 3f, 3.9f, 2.7f});
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);

        var fuenteEncabezado = new Font(negrita, 9, Font.NORMAL, Color.WHITE);
        for (String columna : List.of("#", "Código SIS", "Nombre", "Apellidos", "CI", "Correo", "Facultad", "Carrera")) {
            var celda = celda(columna, fuenteEncabezado);
            celda.setBackgroundColor(PRIMARIO);
            celda.setBorderColor(PRIMARIO);
            tabla.addCell(celda);
        }

        var fuente = new Font(base, 9, Font.NORMAL, TINTA);
        var fuenteNumero = new Font(base, 8, Font.NORMAL, SUAVE);
        if (filas.isEmpty()) {
            var vacia = celda("No hay estudiantes registrados.", fuenteNumero);
            vacia.setColspan(8);
            vacia.setHorizontalAlignment(Element.ALIGN_CENTER);
            vacia.setPadding(12);
            tabla.addCell(vacia);
            return tabla;
        }

        int numero = 1;
        for (Fila f : filas) {
            Color fondo = numero % 2 == 0 ? FONDO : Color.WHITE;
            List<PdfPCell> celdas = List.of(
                celda(String.valueOf(numero), fuenteNumero),
                celda(f.codigoSis(), fuente),
                celda(f.nombre(), fuente),
                celda(f.apellidos(), fuente),
                celda(f.ci(), fuente),
                celda(f.email(), fuente),
                celda(f.facultad() == null ? "—" : f.facultad(), fuente),
                celda(f.carrera() == null ? "—" : f.carrera(), fuente)
            );
            for (PdfPCell celda : celdas) {
                celda.setBackgroundColor(fondo);
                tabla.addCell(celda);
            }
            numero++;
        }
        return tabla;
    }

    private static PdfPCell celda(String texto, Font fuente) {
        var celda = new PdfPCell(new Phrase(texto, fuente));
        celda.setPadding(5);
        celda.setPaddingBottom(7);
        celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
        celda.setBorderColor(BORDE);
        celda.setBorderWidth(0.5f);
        return celda;
    }
}
