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
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Docente;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.models.TrasladoAmbiente;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.DocenteRepository;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.repositories.TrasladoAmbienteRepository;
import com.nexacore.examenes.utils.EstadoExamen;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Genera el acta de asistencia en PDF de un examen (HU#4 / HU#6).
 * Sigue el mismo estilo de PlanillaEstudiantesService: OpenPDF, logo de la universidad,
 * letra Helvetica incrustada por referencia y colores corporativos.
 */
@Service
public class ActaExamenService {

    private static final Color PRIMARIO = new Color(0x04, 0x39, 0xD9);
    private static final Color TINTA = new Color(0x01, 0x11, 0x40);
    private static final Color SUAVE = new Color(0x62, 0x7A, 0x9B);
    private static final Color BORDE = new Color(0xB8, 0xC4, 0xD4);
    private static final Color FONDO = new Color(0xF8, 0xFA, 0xFC);

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AsistenciaExamenRepository asistenciaRepository;
    private final ExamenRepository examenRepository;
    private final MateriaRepository materiaRepository;
    private final DocenteRepository docenteRepository;
    private final AmbienteRepository ambienteRepository;
    private final ExamenAulaRepository examenAulaRepository;
    private final ExpulsionRepository expulsionRepository;
    private final TrasladoAmbienteRepository trasladoRepository;

    public ActaExamenService(
            AsistenciaExamenRepository asistenciaRepository,
            ExamenRepository examenRepository,
            MateriaRepository materiaRepository,
            DocenteRepository docenteRepository,
            AmbienteRepository ambienteRepository,
            ExamenAulaRepository examenAulaRepository,
            ExpulsionRepository expulsionRepository,
            TrasladoAmbienteRepository trasladoRepository) {
        this.asistenciaRepository = asistenciaRepository;
        this.examenRepository = examenRepository;
        this.materiaRepository = materiaRepository;
        this.docenteRepository = docenteRepository;
        this.ambienteRepository = ambienteRepository;
        this.examenAulaRepository = examenAulaRepository;
        this.expulsionRepository = expulsionRepository;
        this.trasladoRepository = trasladoRepository;
    }

    /** Datos de una fila del acta. */
    record FilaActa(
            String codigoSis,
            String nombreCompleto,
            String estado,      // Asistió / Ausente / No habilitado / Expulsado
            String hora,        // HH:MM:SS o "-"
            String observacion  // Trasladado desde [aula] o null
    ) {}

    /** Datos del examen para el encabezado. */
    record DatosExamen(
            String asignatura,
            String sigla,
            String docente,
            String fecha,
            String horario,
            String aulas
    ) {}

    /** Para el nombre del archivo, el mismo formato que el Excel; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AsistenciaExportService asistenciaExportService;

    /** acta_Base-de-Datos-I_G1_2026-11-06.pdf; null si no se puede armar (el controlador usa uno genérico). */
    public String nombreArchivo(Integer idExamen) {
        return asistenciaExportService == null ? null
                : asistenciaExportService.nombreArchivo(idExamen, "pdf").replaceFirst("^asistencia_", "acta_");
    }

    /**
     * Genera el PDF del acta.
     * Lanza ControlIngresoException(409) si el examen no inició o está cancelado.
     */
    @Transactional(readOnly = true)
    public byte[] generarActa(Integer idExamen) {
        Examen examen = examenRepository.findFirstByIdIdExamen(idExamen)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND,
                        "No se encontró el examen " + idExamen));

        String estado = EstadoExamen.de(examen, LocalDateTime.now());
        if (EstadoExamen.PROGRAMADO.equals(estado) || EstadoExamen.CANCELADO.equals(estado)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "No se puede generar el acta porque el examen aún no ha iniciado o está cancelado.");
        }

        List<AsistenciaExamen> asistencias = asistenciaRepository.buscarPorIdExamen(idExamen);
        LocalDateTime desdeSiempre = ExpulsionRepository.DESDE_SIEMPRE;

        List<FilaActa> filas = new ArrayList<>();
        int asistidos = 0, ausentes = 0, noHabilitados = 0, expulsados = 0;

        for (AsistenciaExamen a : asistencias) {
            Estudiante e = a.getEstudiante();

            // No habilitado: no tiene derecho a rendir, no es "Ausente".
            if (!Boolean.TRUE.equals(a.getHabilitado())) {
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e),
                        "No habilitado", "-", null));
                noHabilitados++;
                continue;
            }

            boolean expulsado = expulsionRepository
                    .existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                            e.getId(), idExamen, desdeSiempre);

            // Observación de traslado (INCI-03): "Trasladado desde [origen] a [destino]".
            String observacion = null;
            List<TrasladoAmbiente> traslados =
                    trasladoRepository.delEstudianteEnSesionActual(idExamen, e.getId(), null);
            if (!traslados.isEmpty()) {
                // Último traslado (más reciente): a dónde quedó el estudiante al finalizar.
                TrasladoAmbiente ultimo = traslados.get(traslados.size() - 1);
                Ambiente origen = ambienteRepository.findById(ultimo.getIdAmbienteOrigen()).orElse(null);
                Ambiente destino = ambienteRepository.findById(ultimo.getIdAmbienteDestino()).orElse(null);
                if (origen != null && destino != null) {
                    observacion = "Trasladado desde " + origen.getNombre() + " a " + destino.getNombre();
                } else if (origen != null) {
                    observacion = "Trasladado desde " + origen.getNombre();
                } else if (destino != null) {
                    observacion = "Trasladado a " + destino.getNombre();
                } else {
                    observacion = "Trasladado";
                }
            }

            if (expulsado) {
                // Expulsión vigente (no anulada): cuenta como expulsado.
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e),
                        "Expulsado", "-", observacion));
                expulsados++;
                continue;
            }

            if (a.getFechaHoraIngreso() != null) {
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e),
                        "Asistió", a.getFechaHoraIngreso().format(HORA), observacion));
                asistidos++;
            } else {
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e),
                        "Ausente", "-", observacion));
                ausentes++;
            }
        }

        // Orden alfabético por apellidos y nombre (el repositorio ya trae ese orden, se asegura).
        filas.sort(Comparator.comparing(FilaActa::nombreCompleto));

        DatosExamen datos = datosExamen(examen);

        var out = new ByteArrayOutputStream();
        var document = new Document(PageSize.A4, 54, 54, 72, 72);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont negrita = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);

            document.add(encabezado(base, negrita, datos));
            document.add(tabla(filas, base, negrita));
            document.add(totales(asistidos, ausentes, noHabilitados, expulsados, base, negrita));
            document.add(firmas(base, negrita));

            document.close();
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo generar el acta PDF.", ex);
        }
        return out.toByteArray();
    }

    private static String nombreCompleto(Estudiante e) {
        return e.getApellidos() + ", " + e.getNombre();
    }

    private DatosExamen datosExamen(Examen examen) {
        Materia materia = materiaRepository.findById(examen.getIdMateria())
                .orElseThrow(() -> new IllegalStateException("Materia no encontrada para el examen " + examen.getId().getIdExamen()));
        Docente docente = docenteRepository.findById(examen.getIdDocente())
                .orElseThrow(() -> new IllegalStateException("Docente no encontrado para el examen " + examen.getId().getIdExamen()));
        String docenteNombre = docente.getUsuario() != null
                ? docente.getUsuario().getNombre() + " " + docente.getUsuario().getApellidos()
                : "—";

        String ambientePrincipal = ambienteRepository.findById(examen.getIdAmbiente())
                .map(Ambiente::getNombre).orElse("—");

        List<String> aulas = new ArrayList<>();
        aulas.add(ambientePrincipal);
        examenAulaRepository.adicionalesDe(examen.getId().getIdExamen()).stream()
                .map(com.nexacore.examenes.models.ExamenAula::getAmbiente)
                .filter(Objects::nonNull)
                .map(Ambiente::getNombre)
                .forEach(aulas::add);

        String horario = examen.getHoraInicio() + " – " + examen.getHoraInicio()
                .plusMinutes(examen.getDuracionMinutos());

        return new DatosExamen(
                materia.getNombre(),
                materia.getSigla(),
                docenteNombre,
                examen.getFecha().format(FECHA),
                horario,
                String.join(", ", aulas));
    }

    private PdfPTable encabezado(BaseFont base, BaseFont negrita, DatosExamen datos) throws IOException {
        var tabla = new PdfPTable(new float[]{1, 3});
        tabla.setWidthPercentage(100);
        tabla.setSpacingAfter(14);

        try (InputStream logo = new ClassPathResource("planilla/logo.png").getInputStream()) {
            Image imagen = Image.getInstance(logo.readAllBytes());
            imagen.scaleToFit(110, 32);
            var celda = new PdfPCell(imagen, false);
            celda.setBorder(Rectangle.NO_BORDER);
            celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
            tabla.addCell(celda);
        }

        var info = new Paragraph();
        info.add(new Phrase("ACTA DE ASISTENCIA\n", new Font(negrita, 16, Font.NORMAL, TINTA)));
        info.add(new Phrase(
                "Materia: " + datos.asignatura() + " (" + datos.sigla() + ")  ·  Docente: " + datos.docente() + "\n",
                new Font(base, 9, Font.NORMAL, SUAVE)));
        info.add(new Phrase(
                "Fecha: " + datos.fecha() + "  ·  Horario: " + datos.horario() + "  ·  Aula(s): " + datos.aulas(),
                new Font(base, 9, Font.NORMAL, SUAVE)));
        var celda = new PdfPCell(info);
        celda.setBorder(Rectangle.NO_BORDER);
        celda.setHorizontalAlignment(Element.ALIGN_LEFT);
        celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
        tabla.addCell(celda);
        return tabla;
    }

    private PdfPTable tabla(List<FilaActa> filas, BaseFont base, BaseFont negrita) {
        var tabla = new PdfPTable(new float[]{0.5f, 1.2f, 2.6f, 1.4f, 1.3f, 2.2f});
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);

        var fuenteEncabezado = new Font(negrita, 8, Font.NORMAL, Color.WHITE);
        for (String columna : List.of("Nro", "Código SIS", "Apellidos y nombres", "Estado", "Hora ingreso", "Observación")) {
            var celda = celda(columna, fuenteEncabezado);
            celda.setBackgroundColor(PRIMARIO);
            celda.setBorderColor(PRIMARIO);
            tabla.addCell(celda);
        }

        var fuente = new Font(base, 8, Font.NORMAL, TINTA);
        if (filas.isEmpty()) {
            var vacia = celda("Sin estudiantes registrados en este examen.", fuente);
            vacia.setColspan(6);
            vacia.setHorizontalAlignment(Element.ALIGN_CENTER);
            vacia.setPadding(12);
            tabla.addCell(vacia);
            return tabla;
        }

        int numero = 1;
        for (FilaActa f : filas) {
            Color fondo = numero % 2 == 0 ? FONDO : Color.WHITE;
            List<PdfPCell> celdas = List.of(
                    celda(String.valueOf(numero), fuente),
                    celda(f.codigoSis(), fuente),
                    celda(f.nombreCompleto(), fuente),
                    celda(f.estado(), fuente),
                    celda(f.hora(), fuente),
                    celda(f.observacion() == null ? "—" : f.observacion(), fuente));
            for (PdfPCell celda : celdas) {
                celda.setBackgroundColor(fondo);
                tabla.addCell(celda);
            }
            numero++;
        }
        return tabla;
    }

    private PdfPTable totales(int asistidos, int ausentes, int noHabilitados, int expulsados,
                              BaseFont base, BaseFont negrita) {
        var tabla = new PdfPTable(new float[]{1});
        tabla.setWidthPercentage(100);
        tabla.setSpacingBefore(10);

        var texto = new Paragraph();
        texto.add(new Phrase("Totales:  ", new Font(negrita, 9, Font.NORMAL, TINTA)));
        texto.add(new Phrase("Asistidos " + asistidos + "   ", new Font(base, 9, Font.NORMAL, TINTA)));
        texto.add(new Phrase("Ausentes " + ausentes + "   ", new Font(base, 9, Font.NORMAL, TINTA)));
        texto.add(new Phrase("No habilitados " + noHabilitados + "   ", new Font(base, 9, Font.NORMAL, TINTA)));
        texto.add(new Phrase("Expulsados " + expulsados, new Font(base, 9, Font.NORMAL, TINTA)));
        var celda = new PdfPCell(texto);
        celda.setBorder(Rectangle.NO_BORDER);
        tabla.addCell(celda);
        return tabla;
    }

    private PdfPTable firmas(BaseFont base, BaseFont negrita) {
        var tabla = new PdfPTable(new float[]{1, 1});
        tabla.setWidthPercentage(100);
        tabla.setSpacingBefore(26);

        var docente = new Paragraph();
        docente.add(new Phrase("\n_______________________________\n", new Font(base, 9, Font.NORMAL, TINTA)));
        docente.add(new Phrase("Docente responsable", new Font(negrita, 8, Font.NORMAL, SUAVE)));
        var c1 = new PdfPCell(docente);
        c1.setBorder(Rectangle.NO_BORDER);

        var autoridad = new Paragraph();
        autoridad.add(new Phrase("\n_______________________________\n", new Font(base, 9, Font.NORMAL, TINTA)));
        autoridad.add(new Phrase("Autoridad académica", new Font(negrita, 8, Font.NORMAL, SUAVE)));
        var c2 = new PdfPCell(autoridad);
        c2.setBorder(Rectangle.NO_BORDER);

        tabla.addCell(c1);
        tabla.addCell(c2);
        return tabla;
    }

    private static PdfPCell celda(String texto, Font fuente) {
        var celda = new PdfPCell(new Phrase(texto, fuente));
        celda.setPadding(4);
        celda.setPaddingBottom(6);
        celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
        celda.setBorderColor(BORDE);
        celda.setBorderWidth(0.5f);
        return celda;
    }
}
