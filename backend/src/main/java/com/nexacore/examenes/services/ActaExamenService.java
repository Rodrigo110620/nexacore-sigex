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
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Docente;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.Expulsion;
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

    /** Colores para diferenciar visualmente cada estado en el acta (BUG-D01). */
    private static final Color ESTADO_ASISTIO = new Color(0x16, 0x65, 0x34);
    private static final Color ESTADO_EXPULSADO = new Color(0xB9, 0x1C, 0x1C);
    private static final Color ESTADO_AUSENTE = new Color(0x92, 0x40, 0x0E);

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA_CORTA = DateTimeFormatter.ofPattern("HH:mm");
    private static final String SIN_HORA = "—";
    /** Alto reservado al pie de la última hoja para las firmas (sección 12: firmas abajo, sobre el pie). */
    private static final float ALTO_FIRMAS = 70;

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

    /** Salida al cierre (V56); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SalidaExamenService salidaExamenService;

    /** Datos de una fila del acta. */
    record FilaActa(
            String codigoSis,
            String nombreCompleto,
            String estado,      // Asistió / Ausente / Expulsado
            String hora,        // HH:MM:SS o "—"
            String observacion, // Trasladado desde [aula] o null
            String salida,      // Hora de salida (V56) HH:MM:SS o "—"
            String registro     // Quién del control registró su ingreso, o "—"
    ) {
        FilaActa(String codigoSis, String nombreCompleto, String estado, String hora, String observacion) {
            this(codigoSis, nombreCompleto, estado, hora, observacion, SIN_HORA, SIN_HORA);
        }

        FilaActa(String codigoSis, String nombreCompleto, String estado, String hora, String observacion, String salida) {
            this(codigoSis, nombreCompleto, estado, hora, observacion, salida, SIN_HORA);
        }

        FilaActa conRegistro(String quien) {
            return quien == null ? this : new FilaActa(codigoSis, nombreCompleto, estado, hora, observacion, salida, quien);
        }
    }

    /** Quién está en el control y quién registró cada ingreso; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    /** Nombres del personal de control asignado al examen, por apellido. */
    private List<String> personalControl(Integer idExamen) {
        if (jdbc == null) return List.of();
        return jdbc.query("SELECT u.nombre, u.apellidos FROM examen_control ec JOIN usuario u ON u.id_usuario = ec.id_usuario"
                        + " WHERE ec.id_examen = ? ORDER BY u.apellidos, u.nombre",
                (rs, i) -> (rs.getString(1) + " " + rs.getString(2)).trim(), idExamen);
    }

    /** Por estudiante, quién del control autorizó su ingreso (el último registro, si hubo varios). */
    private java.util.Map<Integer, String> registradores(Integer idExamen) {
        java.util.Map<Integer, String> quien = new java.util.HashMap<>();
        if (jdbc == null) return quien;
        jdbc.query("SELECT r.id_estudiante, u.nombre, u.apellidos FROM registro_control_ingreso r"
                        + " JOIN usuario u ON u.id_usuario = r.id_usuario_control"
                        + " WHERE r.id_examen = ? AND r.resultado_autorizacion = 'AUTORIZADO' ORDER BY r.id_control",
                rs -> { quien.put(rs.getInt(1), (rs.getString(2) + " " + rs.getString(3)).trim()); }, idExamen);
        return quien;
    }

    /** Datos del examen para el encabezado. */
    record DatosExamen(
            String asignatura,
            String sigla,
            String docente,
            String fecha,
            String horario,
            String aulas,
            String numero,     // N.° del acta: <año>-FI-<examen con 4 cifras>
            String grupo       // G1, G2…; null si no se encuentra
    ) {}

    /** El grupo (G1, G2…) del examen; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.nexacore.examenes.repositories.ParaleloRepository paraleloRepository;

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
        int asistidos = 0, ausentes = 0, expulsados = 0, noHabilitados = 0;
        java.util.Map<Integer, String> registro = registradores(idExamen);

        // Sin salida marcada y con el examen terminado, salió al cierre (V56).
        java.time.LocalDateTime fin = salidaExamenService == null ? null : salidaExamenService.finSiTermino(idExamen);
        for (AsistenciaExamen a : asistencias) {
            Estudiante e = a.getEstudiante();

            // Sección 12 del diseño: el no habilitado no rinde ni es "Ausente", pero se lista en el acta con su estado.
            if (!Boolean.TRUE.equals(a.getHabilitado())) {
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e), "No habilitado", SIN_HORA, null)
                        .conRegistro(registro.get(e.getId())));
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
                // Expulsión vigente (no anulada): cuenta como expulsado. La hora de salida es
                // la hora en que se registró la expulsión (hora del servidor).
                LocalDateTime horaSalida = expulsionRepository
                        .findFirstByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNullOrderByFechaHoraAsc(
                                e.getId(), idExamen, desdeSiempre)
                        .map(Expulsion::getFechaHora)
                        .orElse(null);
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e), "Expulsado",
                        a.getFechaHoraIngreso() == null ? SIN_HORA : a.getFechaHoraIngreso().format(HORA), observacion,
                        horaSalida != null ? horaSalida.format(HORA) : SIN_HORA)
                        .conRegistro(registro.get(e.getId())));
                expulsados++;
                continue;
            }

            if (a.getFechaHoraIngreso() != null) {
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e),
                        "Asistió", a.getFechaHoraIngreso().format(HORA), observacion,
                        a.getFechaHoraSalida() != null ? a.getFechaHoraSalida().format(HORA)
                                : fin != null ? fin.format(HORA) + SalidaExamenService.AL_CIERRE : SIN_HORA)
                        .conRegistro(registro.get(e.getId())));
                asistidos++;
            } else {
                filas.add(new FilaActa(e.getCodigoSis(), nombreCompleto(e),
                        "Ausente", SIN_HORA, observacion));
                ausentes++;
            }
        }

        // Orden alfabético por apellidos y nombre (el repositorio ya trae ese orden, se asegura).
        filas.sort(Comparator.comparing(FilaActa::nombreCompleto));

        DatosExamen datos = datosExamen(examen);
        List<String> personal = personalControl(idExamen);
        // Sin personal asignado (lo controló el docente u otro), el acta nombra a quienes registraron ingresos.
        if (personal.isEmpty()) personal = registro.values().stream().distinct().sorted().toList();

        LocalDateTime generada = Objects.requireNonNullElseGet(asistenciaRepository.obtenerFechaHoraServidor(), LocalDateTime::now);
        var out = new ByteArrayOutputStream();
        var document = new Document(PageSize.A4, 36, 36, 36, 48);
        try {
            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont negrita = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PieDePagina(base, generada));
            document.open();

            document.add(encabezado(base, negrita, datos));
            document.add(datosDelExamen(base, negrita, datos, generada, personal));
            document.add(resumen(asistidos + ausentes + expulsados, asistidos, ausentes, expulsados, noHabilitados, base, negrita));
            document.add(tabla(filas, base, negrita));
            // Las firmas van al pie de la última hoja; si la tabla ya ocupa ese espacio, pasan a una hoja nueva.
            if (writer.getVerticalPosition(true) - document.bottom() < ALTO_FIRMAS) {
                document.newPage();
            }
            firmas(writer.getDirectContent(), document, base, negrita, datos.docente(), personal);

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

        String grupo = paraleloRepository == null ? null
                : paraleloRepository.findAllByIdParalelos(List.of(examen.getId().getIdParalelo())).stream()
                        .map(com.nexacore.examenes.models.Paralelo::getNombreGrupo).filter(Objects::nonNull).findFirst().orElse(null);
        return new DatosExamen(
                materia.getNombre(),
                materia.getSigla(),
                docenteNombre,
                examen.getFecha().format(FECHA),
                horario,
                String.join(", ", aulas),
                "%d-FI-%04d".formatted(examen.getFecha().getYear(), examen.getId().getIdExamen()),
                grupo);
    }

    /** Sección 12: logo e institución a la izquierda; "ACTA DE ASISTENCIA" y su N.° a la derecha; una línea abajo. */
    private PdfPTable encabezado(BaseFont base, BaseFont negrita, DatosExamen datos) throws IOException {
        var tabla = new PdfPTable(new float[]{0.9f, 4.6f, 3});
        tabla.setWidthPercentage(100);

        try (InputStream logo = new ClassPathResource("planilla/logo.png").getInputStream()) {
            Image imagen = Image.getInstance(logo.readAllBytes());
            imagen.scaleToFit(48, 48);
            var celda = new PdfPCell(imagen, false);
            sinBorde(celda);
            tabla.addCell(celda);
        }

        var institucion = new Paragraph();
        institucion.setLeading(13);
        institucion.add(new Phrase("UNIVERSIDAD MAYOR DE SAN SIMÓN\n", new Font(negrita, 9, Font.NORMAL, TINTA)));
        institucion.add(new Phrase("Facultad de Ciencias y Tecnología", new Font(base, 8, Font.NORMAL, SUAVE)));
        var celdaInstitucion = new PdfPCell(institucion);
        sinBorde(celdaInstitucion);
        tabla.addCell(celdaInstitucion);

        var titulo = new Paragraph();
        titulo.setLeading(17);
        titulo.setAlignment(Element.ALIGN_RIGHT);
        titulo.add(new Phrase("ACTA DE ASISTENCIA\n", new Font(negrita, 14, Font.NORMAL, PRIMARIO)));
        titulo.add(new Phrase("N.° " + datos.numero(), new Font(base, 8, Font.NORMAL, SUAVE)));
        var celdaTitulo = new PdfPCell(titulo);
        sinBorde(celdaTitulo);
        celdaTitulo.setHorizontalAlignment(Element.ALIGN_RIGHT);
        tabla.addCell(celdaTitulo);

        var linea = new PdfPCell(new Phrase(" ", new Font(base, 2)));
        linea.setColspan(3);
        linea.setBorder(Rectangle.BOTTOM);
        linea.setBorderColor(BORDE);
        linea.setBorderWidth(0.75f);
        linea.setFixedHeight(10);
        tabla.addCell(linea);
        return tabla;
    }

    /** Sección 12: los datos del examen en dos columnas (Materia, Docente, Aula · Fecha, Horario, Generada). */
    private PdfPTable datosDelExamen(BaseFont base, BaseFont negrita, DatosExamen datos, LocalDateTime generada, List<String> personal) {
        var tabla = new PdfPTable(new float[]{1, 1});
        tabla.setWidthPercentage(100);
        tabla.setSpacingBefore(10);
        tabla.addCell(columnaDeDatos(base, negrita,
                List.of("Materia:", datos.asignatura() + " (" + datos.sigla() + ")" + (datos.grupo() == null ? "" : " · Grupo " + datos.grupo()), "Docente:", datos.docente(), "Aula:", datos.aulas(),
                        "Control:", personal.isEmpty() ? "Sin personal de control asignado" : String.join(", ", personal))));
        tabla.addCell(columnaDeDatos(base, negrita,
                List.of("Fecha:", datos.fecha(), "Horario:", datos.horario(), "Generada:", generada.format(FECHA) + " " + generada.format(HORA))));
        return tabla;
    }

    private static PdfPCell columnaDeDatos(BaseFont base, BaseFont negrita, List<String> pares) {
        var p = new Paragraph();
        p.setLeading(15);
        for (int i = 0; i < pares.size(); i += 2) {
            p.add(new Phrase(pares.get(i) + " ", new Font(negrita, 8.5f, Font.NORMAL, TINTA)));
            p.add(new Phrase(pares.get(i + 1) + (i + 2 < pares.size() ? "\n" : ""), new Font(base, 8.5f, Font.NORMAL, TINTA)));
        }
        var celda = new PdfPCell(p);
        sinBorde(celda);
        return celda;
    }

    /** Sección 12: etiquetas con Habilitados, Asistieron, Ausentes, No habilitados (y Expulsados si los hay), antes de la tabla. */
    private PdfPTable resumen(int habilitados, int asistidos, int ausentes, int expulsados, int noHabilitados, BaseFont base, BaseFont negrita) {
        List<String> etiquetas = new ArrayList<>(List.of(
                "Habilitados: " + habilitados, "Asistieron: " + asistidos, "Ausentes: " + ausentes, "No habilitados: " + noHabilitados));
        if (expulsados > 0) etiquetas.add("Expulsados: " + expulsados);
        float[] anchos = new float[etiquetas.size() + 1];
        for (int i = 0; i < etiquetas.size(); i++) anchos[i] = 1;
        anchos[etiquetas.size()] = 5 - etiquetas.size();
        var tabla = new PdfPTable(anchos);
        tabla.setWidthPercentage(100);
        tabla.setSpacingBefore(10);
        tabla.setSpacingAfter(12);
        var fuente = new Font(negrita, 8.5f, Font.NORMAL, PRIMARIO);
        for (String etiqueta : etiquetas) {
            var celda = new PdfPCell(new Phrase(etiqueta, fuente));
            celda.setBackgroundColor(new Color(0xED, 0xF2, 0xFE));
            celda.setBorderColor(Color.WHITE);
            celda.setBorderWidth(2);
            celda.setPadding(5);
            celda.setHorizontalAlignment(Element.ALIGN_CENTER);
            tabla.addCell(celda);
        }
        var resto = new PdfPCell(new Phrase(" "));
        sinBorde(resto);
        tabla.addCell(resto);
        return tabla;
    }

    /** Devuelve la fuente con el color correspondiente al estado del estudiante (BUG-D01). */
    private static Font fuenteEstado(String estado, BaseFont base) {
        if ("Asistió".equals(estado)) {
            return new Font(base, 8, Font.NORMAL, ESTADO_ASISTIO);
        }
        if ("Expulsado".equals(estado)) {
            return new Font(base, 8, Font.NORMAL, ESTADO_EXPULSADO);
        }
        if ("Ausente".equals(estado)) {
            return new Font(base, 8, Font.NORMAL, ESTADO_AUSENTE);
        }
        return new Font(base, 8, Font.NORMAL, TINTA);
    }

    private PdfPTable tabla(List<FilaActa> filas, BaseFont base, BaseFont negrita) {
        var tabla = new PdfPTable(new float[]{0.5f, 1.3f, 3.5f, 1.1f, 1.2f, 1.3f, 2.1f});
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);

        var fuenteEncabezado = new Font(negrita, 8, Font.NORMAL, Color.WHITE);
        for (String columna : List.of("N.°", "Código SIS", "Apellidos y nombres", "Estado", "Hora de ingreso", "Hora de salida", "Registró")) {
            var celda = celda(columna, fuenteEncabezado);
            celda.setBackgroundColor(PRIMARIO);
            celda.setBorderColor(PRIMARIO);
            tabla.addCell(celda);
        }

        var fuente = new Font(base, 8, Font.NORMAL, TINTA);
        if (filas.isEmpty()) {
            var vacia = celda("Sin estudiantes registrados en este examen.", fuente);
            vacia.setColspan(7);
            vacia.setHorizontalAlignment(Element.ALIGN_CENTER);
            vacia.setPadding(12);
            tabla.addCell(vacia);
            return tabla;
        }

        int numero = 1;
        for (FilaActa f : filas) {
            Color fondo = numero % 2 == 0 ? FONDO : Color.WHITE;
            // El traslado (INCI-03) va bajo el nombre, en gris: el diseño no tiene columna de observación.
            var nombre = new Phrase(f.nombreCompleto(), fuente);
            if (f.observacion() != null) nombre.add(new Phrase("\n" + f.observacion(), new Font(base, 7, Font.NORMAL, SUAVE)));
            var celdaNombre = new PdfPCell(nombre);
            estiloCelda(celdaNombre);
            List<PdfPCell> celdas = List.of(
                    celda(String.valueOf(numero), fuente),
                    celda(f.codigoSis(), fuente),
                    celdaNombre,
                    celda(f.estado(), fuenteEstado(f.estado(), base)),
                    celda(f.hora(), fuente),
                    celda(f.salida(), fuente),
                    celda(f.registro(), fuente));
            for (PdfPCell celda : celdas) {
                celda.setBackgroundColor(fondo);
                tabla.addCell(celda);
            }
            numero++;
        }
        return tabla;
    }

    /** Sección 12: las dos firmas al pie de la última hoja, sobre el pie de página. */
    private static void firmas(PdfContentByte lienzo, Document document, BaseFont base, BaseFont negrita, String docente, List<String> personal) {
        float y = document.bottom() + 24;
        float ancho = (document.right() - document.left() - 40) / 2;
        String[] textos = {"Firma del docente", "Firma del responsable de control"};
        // Debajo de cada línea, quién firma: el docente y el personal de control (si es uno, su nombre).
        String[] nombres = {docente, personal.size() == 1 ? personal.get(0) : null};
        for (int i = 0; i < 2; i++) {
            float x = document.left() + i * (ancho + 40);
            lienzo.setColorStroke(TINTA);
            lienzo.setLineWidth(0.6f);
            lienzo.moveTo(x, y);
            lienzo.lineTo(x + ancho, y);
            lienzo.stroke();
            // Bajo la línea: el nombre en negrita y debajo qué firma («Firma del docente»…).
            boolean conNombre = nombres[i] != null && !nombres[i].isBlank() && !"—".equals(nombres[i]);
            if (conNombre) {
                lienzo.beginText();
                lienzo.setFontAndSize(negrita, 8);
                lienzo.setColorFill(TINTA);
                lienzo.showTextAligned(Element.ALIGN_CENTER, nombres[i], x + ancho / 2, y - 11, 0);
                lienzo.endText();
            }
            lienzo.beginText();
            lienzo.setFontAndSize(base, conNombre ? 7.5f : 8);
            lienzo.setColorFill(SUAVE);
            lienzo.showTextAligned(Element.ALIGN_CENTER, textos[i], x + ancho / 2, conNombre ? y - 21 : y - 11, 0);
            lienzo.endText();
        }
    }

    /** Pie de cada hoja: "Generada por SIGEX el … a las …" y "Página N de M" (el total se escribe al cerrar). */
    private static final class PieDePagina extends PdfPageEventHelper {
        private final BaseFont base;
        private final String texto;
        private PdfTemplate total;

        PieDePagina(BaseFont base, LocalDateTime generada) {
            this.base = base;
            this.texto = "Generada por SIGEX el " + generada.format(FECHA) + " a las " + generada.format(HORA_CORTA);
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            total = writer.getDirectContent().createTemplate(30, 10);
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte lienzo = writer.getDirectContent();
            float y = document.bottom() - 22;
            String pagina = "Página " + writer.getPageNumber() + " de ";
            lienzo.beginText();
            lienzo.setFontAndSize(base, 7);
            lienzo.setColorFill(SUAVE);
            lienzo.showTextAligned(Element.ALIGN_LEFT, texto, document.left(), y, 0);
            float anchoPagina = base.getWidthPoint(pagina, 7);
            lienzo.showTextAligned(Element.ALIGN_LEFT, pagina, document.right() - 30 - anchoPagina + 18, y, 0);
            lienzo.endText();
            lienzo.addTemplate(total, document.right() - 12, y);
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            total.beginText();
            total.setFontAndSize(base, 7);
            total.setColorFill(SUAVE);
            // Al cerrar, OpenPDF ya avanzó a una hoja más: el total es la anterior.
            total.showText(String.valueOf(writer.getPageNumber() - 1));
            total.endText();
        }
    }

    private static void sinBorde(PdfPCell celda) {
        celda.setBorder(Rectangle.NO_BORDER);
        celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
    }

    private static void estiloCelda(PdfPCell celda) {
        celda.setPadding(4);
        celda.setPaddingBottom(6);
        celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
        celda.setBorderColor(BORDE);
        celda.setBorderWidth(0.5f);
    }

    private static PdfPCell celda(String texto, Font fuente) {
        var celda = new PdfPCell(new Phrase(texto, fuente));
        estiloCelda(celda);
        return celda;
    }
}
