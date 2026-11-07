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
    public record Fila(
        String codigoSis, String nombre, String apellidos, String ci, String email,
        Integer idFacultad, String facultad, Integer idCarrera, String carrera,
        String telefono, String estadoMatricula
    ) {}

    /**
     * Filtros de la planilla, los mismos de la pantalla de Estudiantes. {@code idDocente}: el DOCENTE solo descarga a
     * los estudiantes de sus materias y grupos. Todo null: todos los estudiantes (planilla completa del ADMIN).
     */
    public record Filtro(String search, Integer idFacultad, Integer idCarrera, Integer idDocente, Integer idMateria, Integer idParalelo) {
        public static final Filtro NINGUNO = new Filtro(null, null, null, null, null, null);

        boolean vacio() {
            return (search == null || search.isBlank()) && idFacultad == null && idCarrera == null
                && idDocente == null && idMateria == null && idParalelo == null;
        }
    }

    /** Para describir los filtros en el PDF; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<Fila> filas() {
        return filas(Filtro.NINGUNO);
    }

    @Transactional(readOnly = true)
    public List<Fila> filas(Filtro filtro) {
        Map<Integer, List<EstudianteCarrera>> carrerasPorEstudiante = estudianteCarreraRepository
            .findAllConCarreraYFacultad().stream()
            .collect(Collectors.groupingBy(ec -> ec.getId().getIdEstudiante()));

        List<Fila> filas = new ArrayList<>();
        for (Estudiante e : estudiantes(filtro)) {
            List<EstudianteCarrera> carreras = carrerasPorEstudiante.getOrDefault(e.getId(), List.of());
            if (carreras.isEmpty()) {
                filas.add(new Fila(e.getCodigoSis(), e.getNombre(), e.getApellidos(), e.getCi(), e.getEmail(),
                    null, null, null, null, e.getTelefono(), e.getEstadoMatricula()));
                continue;
            }
            carreras.stream()
                // Con filtro de facultad o carrera, solo esa fila del estudiante.
                .filter(ec -> filtro.idFacultad() == null || filtro.idFacultad().equals(ec.getId().getIdFacultad()))
                .filter(ec -> filtro.idCarrera() == null || filtro.idCarrera().equals(ec.getId().getIdCarrera()))
                .sorted(Comparator.comparing(ec -> ec.getCarrera().getNombre()))
                .forEach(ec -> filas.add(new Fila(
                    e.getCodigoSis(), e.getNombre(), e.getApellidos(), e.getCi(), e.getEmail(),
                    ec.getId().getIdFacultad(), ec.getCarrera().getFacultad().getNombre(),
                    ec.getId().getIdCarrera(), ec.getCarrera().getNombre(),
                    e.getTelefono(), e.getEstadoMatricula()
                )));
        }
        return filas;
    }

    /** Los estudiantes que cumplen el filtro, ordenados por apellidos y nombre (por bloques de 1000). */
    private List<Estudiante> estudiantes(Filtro filtro) {
        if (filtro.vacio()) return estudianteRepository.findAll(Sort.by("apellidos", "nombre", "id"));
        List<Estudiante> lista = new ArrayList<>();
        var orden = Sort.by("apellidos", "nombre", "id");
        org.springframework.data.domain.Page<Estudiante> pagina;
        int numero = 0;
        do {
            pagina = estudianteRepository.buscarConFiltros(EstudianteService.normalizarBusqueda(filtro.search()),
                filtro.idFacultad(), filtro.idCarrera(), filtro.idDocente(), filtro.idMateria(), filtro.idParalelo(),
                org.springframework.data.domain.PageRequest.of(numero++, 1000, orden));
            lista.addAll(pagina.getContent());
        } while (pagina.hasNext());
        return lista;
    }

    /** «Facultad X · Carrera Y · Materia Z · Grupo G1» para el título del PDF; null sin filtros. */
    String descripcion(Filtro filtro) {
        if (jdbc == null) return null;
        List<String> partes = new ArrayList<>();
        nombre("SELECT nombre FROM facultad WHERE id_facultad = :id", filtro.idFacultad(), "Facultad ", partes);
        nombre("SELECT nombre FROM carrera WHERE id_carrera = :id", filtro.idCarrera(), "", partes);
        nombre("SELECT nombre FROM materia WHERE id_materia = :id", filtro.idMateria(), "", partes);
        nombre("SELECT nombre_grupo FROM paralelo WHERE id_paralelo = :id", filtro.idParalelo(), "Grupo ", partes);
        if (filtro.search() != null && !filtro.search().isBlank()) partes.add("«" + filtro.search().trim() + "»");
        return partes.isEmpty() ? null : String.join(" · ", partes);
    }

    private void nombre(String sql, Integer id, String prefijo, List<String> partes) {
        if (id == null) return;
        jdbc.query(sql, Map.of("id", id), rs -> { partes.add(prefijo + rs.getString(1)); });
    }

    /** Plantilla para importar (sección 22): solo los encabezados y una fila de ejemplo. */
    private static final Object[] EJEMPLO = {"202100101", "Ana", "Rojas Vera", "7489211", "202100101@est.umss.edu", 1, 1, "71234567", "MATRICULADO"};

    private static String[] columnas() {
        return java.util.stream.Stream.concat(ImportacionEstudiantesService.COLUMNAS.stream(),
            ImportacionEstudiantesService.COLUMNAS_OPCIONALES.stream()).toArray(String[]::new);
    }

    public byte[] plantillaCsv() {
        var out = new ByteArrayOutputStream();
        var formato = CSVFormat.DEFAULT.builder().setDelimiter(';').setRecordSeparator("\n").setHeader(columnas()).build();
        try (var writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write('\uFEFF');
            var printer = new CSVPrinter(writer, formato);
            printer.printRecord(EJEMPLO);
            printer.flush();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar la plantilla CSV.", e);
        }
        return out.toByteArray();
    }

    public byte[] plantillaXlsx() {
        return libro(List.<Object[]>of(EJEMPLO));
    }

    /** CSV con ';' y BOM, igual que la plantilla, para que Excel en español lo abra en columnas. */
    public byte[] csv() {
        return csv(Filtro.NINGUNO);
    }

    public byte[] csv(Filtro filtro) {
        var out = new ByteArrayOutputStream();
        var formato = CSVFormat.DEFAULT.builder()
            .setDelimiter(';')
            .setRecordSeparator("\n")
            .setHeader(java.util.stream.Stream.concat(ImportacionEstudiantesService.COLUMNAS.stream(),
                ImportacionEstudiantesService.COLUMNAS_OPCIONALES.stream()).toArray(String[]::new))
            .build();
        try (var writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            // El BOM va antes de crear el printer: CSVPrinter escribe el encabezado al construirse.
            writer.write('\uFEFF');
            var printer = new CSVPrinter(writer, formato);
            for (Fila f : filas(filtro)) {
                printer.printRecord(f.codigoSis(), f.nombre(), f.apellidos(), f.ci(), f.email(),
                    f.idFacultad(), f.idCarrera(), f.telefono(), f.estadoMatricula());
            }
            printer.flush();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar la planilla CSV.", e);
        }
        return out.toByteArray();
    }

    /** Sección 22: la planilla en Excel, con las mismas columnas que la importación (texto para SIS y CI). */
    public byte[] xlsx() {
        return xlsx(Filtro.NINGUNO);
    }

    public byte[] xlsx(Filtro filtro) {
        List<Object[]> filas = new ArrayList<>();
        for (Fila f : filas(filtro)) {
            filas.add(new Object[] {f.codigoSis(), f.nombre(), f.apellidos(), f.ci(), f.email(),
                f.idFacultad(), f.idCarrera(), f.telefono(), f.estadoMatricula()});
        }
        return libro(filas);
    }

    private static byte[] libro(List<Object[]> filas) {
        String[] columnas = columnas();
        try (var libro = new org.apache.poi.xssf.usermodel.XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet("Estudiantes");
            var negrita = libro.createFont();
            negrita.setBold(true);
            var estiloEncabezado = libro.createCellStyle();
            estiloEncabezado.setFont(negrita);
            var texto = libro.createCellStyle();
            texto.setDataFormat(libro.createDataFormat().getFormat("@"));
            var encabezado = hoja.createRow(0);
            for (int c = 0; c < columnas.length; c++) {
                var celda = encabezado.createCell(c);
                celda.setCellValue(columnas[c]);
                celda.setCellStyle(estiloEncabezado);
                hoja.setDefaultColumnStyle(c, texto); // SIS y CI como texto: Excel no les quita ceros ni los abrevia
            }
            int r = 1;
            for (Object[] valores : filas) {
                var fila = hoja.createRow(r++);
                for (int c = 0; c < valores.length; c++) {
                    if (valores[c] == null) continue;
                    var celda = fila.createCell(c);
                    if (valores[c] instanceof Number n) celda.setCellValue(n.doubleValue());
                    else { celda.setCellValue(String.valueOf(valores[c])); celda.setCellStyle(texto); }
                }
            }
            for (int c = 0; c < columnas.length; c++) hoja.setColumnWidth(c, 18 * 256);
            hoja.createFreezePane(0, 1);
            libro.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar la planilla Excel.", e);
        }
    }

    public byte[] pdf() {
        return pdf(Filtro.NINGUNO);
    }

    public byte[] pdf(Filtro filtro) {
        List<Fila> filas = filas(filtro);
        String filtros = descripcion(filtro);
        var out = new ByteArrayOutputStream();
        var document = new Document(PageSize.A4.rotate(), 36, 36, 30, 30);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont negrita = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);

            long estudiantes = filas.stream().map(Fila::codigoSis).distinct().count();
            document.add(encabezado(base, negrita, estudiantes, filtros));
            document.add(tabla(filas, base, negrita));
            document.close();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar la planilla PDF.", e);
        }
        return out.toByteArray();
    }

    private PdfPTable encabezado(BaseFont base, BaseFont negrita, long total, String filtros) throws IOException {
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
        if (filtros != null) titulo.add(new Phrase(filtros + "\n", new Font(negrita, 10, Font.NORMAL, PRIMARIO)));
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
        // CI y teléfono con ancho para 8 dígitos en una sola línea (no deben partirse).
        var tabla = new PdfPTable(new float[]{0.5f, 1.6f, 1.7f, 2.0f, 1.6f, 1.6f, 1.8f, 3.0f, 2.8f, 2.4f});
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);

        var fuenteEncabezado = new Font(negrita, 9, Font.NORMAL, Color.WHITE);
        for (String columna : List.of("#", "Código SIS", "Nombre", "Apellidos", "CI", "Teléfono", "Matrícula", "Correo", "Facultad", "Carrera")) {
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
                celda(f.telefono() == null ? "—" : f.telefono(), fuente),
                celda("NO_MATRICULADO".equals(f.estadoMatricula()) ? "No matriculado" : "Matriculado", fuente),
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
