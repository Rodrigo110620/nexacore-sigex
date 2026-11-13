package com.nexacore.examenes.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.TextNode;
import com.nexacore.examenes.dto.HistorialOperacionResponse;
import com.nexacore.examenes.dto.PageResponse;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

/** Consulta de solo lectura del historial completo. Solo se expone al ADMIN. */
@Service
public class HistorialOperacionService {
    private static final int MAXIMO_PAGINA = 100;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public HistorialOperacionService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<HistorialOperacionResponse> listar(int page, int size, String search,
            String modulo, String operacion, LocalDate desde, LocalDate hasta) {
        return listar(page, size, search, modulo, operacion, desde, hasta, null);
    }

    /** Con «Realizado por»: solo las operaciones de ese usuario. */
    @Transactional(readOnly = true)
    public PageResponse<HistorialOperacionResponse> listar(int page, int size, String search,
            String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario) {
        return listar(page, size, search, modulo, operacion, desde, hasta, usuario, Extra.NINGUNO);
    }

    @Transactional(readOnly = true)
    public PageResponse<HistorialOperacionResponse> listar(int page, int size, String search,
            String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario, Extra extra) {
        int pagina = Math.max(0, page);
        int tamano = Math.min(MAXIMO_PAGINA, Math.max(1, size));
        Filtro filtro = filtro(search, modulo, operacion, desde, hasta, usuario, extra);
        Long total = jdbc.queryForObject("SELECT COUNT(*) " + filtro.fromWhere, Long.class, filtro.args.toArray());
        HistorialPresentacion presentacion = new HistorialPresentacion(jdbc);
        List<Object> args = new ArrayList<>(filtro.args);
        args.add(tamano);
        args.add((long) pagina * tamano);
        List<HistorialOperacionResponse> contenido = jdbc.query("""
                SELECT a.id_auditoria, a.fecha_hora, u.id_usuario,
                       trim(u.nombre || ' ' || u.apellidos),
                       (SELECT string_agg(r.nombre, ', ' ORDER BY r.nombre) FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = u.id_usuario),
                       u.email, a.accion, a.detalles
                """ + filtro.fromWhere + " ORDER BY a.fecha_hora DESC, a.id_auditoria DESC LIMIT ? OFFSET ?",
                (rs, row) -> respuesta(presentacion, rs.getInt(1), rs.getTimestamp(2), rs.getInt(3), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)), args.toArray());
        long n = total == null ? 0 : total;
        return new PageResponse<>(contenido, pagina, tamano, n, (int) Math.ceil((double) n / tamano));
    }

    private List<HistorialOperacionResponse> todas(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta,
            Integer usuario, Extra extra) {
        Filtro filtro = filtro(search, modulo, operacion, desde, hasta, usuario, extra);
        HistorialPresentacion presentacion = new HistorialPresentacion(jdbc);
        return jdbc.query("""
                SELECT a.id_auditoria, a.fecha_hora, u.id_usuario,
                       trim(u.nombre || ' ' || u.apellidos),
                       (SELECT string_agg(r.nombre, ', ' ORDER BY r.nombre) FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = u.id_usuario),
                       u.email, a.accion, a.detalles
                """ + filtro.fromWhere + " ORDER BY a.fecha_hora DESC, a.id_auditoria DESC",
                (rs, row) -> respuesta(presentacion, rs.getInt(1), rs.getTimestamp(2), rs.getInt(3), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)), filtro.args.toArray());
    }

    private static final java.time.format.DateTimeFormatter FECHA = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final java.time.format.DateTimeFormatter HORA = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final String[] COLUMNAS = {"Fecha", "Hora", "Usuario", "Operación", "Afecta a", "Examen", "Detalle", "Motivo", "Cambios"};

    private static String[] celdas(HistorialOperacionResponse f) {
        return new String[]{f.fechaHora().format(FECHA), f.fechaHora().format(HORA),
                f.usuario() + (f.rolUsuario() == null ? "" : " (" + f.rolUsuario() + ")"), f.modulo() + " · " + f.operacion(),
                f.objetivo() == null ? "" : f.objetivo(),
                String.join("\n", f.examen().stream().filter(x -> !"Estado".equals(x.campo())).map(x -> x.campo() + ": " + x.valor()).toList()), f.detalle(), f.motivo() == null ? "" : f.motivo(), cambiosLegibles(f.diferencias())};
    }

    /** CSV legible (con BOM, separado por ';' como el resto de exportaciones). */
    @Transactional(readOnly = true)
    public byte[] exportar(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta) {
        return exportar(search, modulo, operacion, desde, hasta, null);
    }

    @Transactional(readOnly = true)
    public byte[] exportar(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario) {
        return exportar(search, modulo, operacion, desde, hasta, usuario, Extra.NINGUNO);
    }

    @Transactional(readOnly = true)
    public byte[] exportar(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario, Extra extra) {
        List<HistorialOperacionResponse> filas = todas(search, modulo, operacion, desde, hasta, usuario, extra);
        var out = new ByteArrayOutputStream();
        try (var writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write('\uFEFF');
            var csv = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setDelimiter(';').setRecordSeparator("\n")
                    .setHeader(COLUMNAS).build());
            for (var f : filas) csv.printRecord((Object[]) celdas(f));
            csv.flush();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo exportar el historial.", e);
        }
        return out.toByteArray();
    }

    /** PDF horizontal con el encabezado de SIGEX, el rango y una fila por operación. */
    @Transactional(readOnly = true)
    public byte[] exportarPdf(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta) {
        return exportarPdf(search, modulo, operacion, desde, hasta, null);
    }

    @Transactional(readOnly = true)
    public byte[] exportarPdf(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario) {
        return exportarPdf(search, modulo, operacion, desde, hasta, usuario, Extra.NINGUNO);
    }

    /**
     * Con docente o examen el PDF se lee como reporte: agrupado por examen (del más reciente al más antiguo).
     * Siempre lleva en el encabezado los filtros usados y un resumen por tipo.
     */
    @Transactional(readOnly = true)
    public byte[] exportarPdf(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario, Extra extra) {
        List<HistorialOperacionResponse> filas = new ArrayList<>(todas(search, modulo, operacion, desde, hasta, usuario, extra));
        boolean porExamen = extra.docente() != null || extra.examen() != null;
        if (porExamen) {
            // Estable: dentro de cada examen se conserva el orden por fecha (más reciente primero).
            java.util.Map<Integer, Integer> primeraVez = new java.util.HashMap<>();
            for (int i = 0; i < filas.size(); i++) primeraVez.putIfAbsent(idExamen(filas.get(i)), i);
            filas.sort(java.util.Comparator.comparingInt(f -> primeraVez.get(idExamen(f))));
        }
        var out = new ByteArrayOutputStream();
        var document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4.rotate(), 30, 30, 28, 28);
        try {
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();
            var base = com.lowagie.text.pdf.BaseFont.createFont(com.lowagie.text.pdf.BaseFont.HELVETICA, com.lowagie.text.pdf.BaseFont.CP1252, false);
            var negrita = com.lowagie.text.pdf.BaseFont.createFont(com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD, com.lowagie.text.pdf.BaseFont.CP1252, false);
            var tinta = new java.awt.Color(0x01, 0x11, 0x40);
            var primario = new java.awt.Color(0x04, 0x39, 0xD9);
            var suave = new java.awt.Color(0x62, 0x7A, 0x9B);

            var encabezado = new com.lowagie.text.pdf.PdfPTable(new float[]{1, 3});
            encabezado.setWidthPercentage(100);
            try (var logo = new org.springframework.core.io.ClassPathResource("planilla/logo.png").getInputStream()) {
                var imagen = com.lowagie.text.Image.getInstance(logo.readAllBytes());
                imagen.scaleToFit(110, 32);
                var celdaLogo = new com.lowagie.text.pdf.PdfPCell(imagen, false);
                celdaLogo.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
                celdaLogo.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
                encabezado.addCell(celdaLogo);
            }
            var titulo = new com.lowagie.text.Paragraph();
            titulo.add(new com.lowagie.text.Phrase("Historial de operaciones\n", new com.lowagie.text.Font(negrita, 16, com.lowagie.text.Font.NORMAL, tinta)));
            String rango = (desde == null ? "desde el inicio" : "del " + desde.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    + (hasta == null ? " a hoy" : " al " + hasta.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            titulo.add(new com.lowagie.text.Phrase(filas.size() + (filas.size() == 1 ? " operación" : " operaciones") + " · " + rango
                    + filtrosTexto(search, modulo, operacion, nombreUsuario(usuario)) + extraTexto(extra) + "\n",
                    new com.lowagie.text.Font(base, 9, com.lowagie.text.Font.NORMAL, suave)));
            var celdaTitulo = new com.lowagie.text.pdf.PdfPCell(titulo);
            celdaTitulo.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            celdaTitulo.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
            celdaTitulo.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
            encabezado.addCell(celdaTitulo);
            encabezado.setSpacingAfter(6);
            document.add(encabezado);
            String resumen = resumen(filas);
            if (!resumen.isEmpty()) {
                var parrafo = new com.lowagie.text.Paragraph("Resumen: " + resumen, new com.lowagie.text.Font(negrita, 9, com.lowagie.text.Font.NORMAL, primario));
                parrafo.setSpacingAfter(8);
                document.add(parrafo);
            }

            // Seis columnas: la fecha va en un título por día y el examen en una línea bajo «Afecta a».
            var tabla = new com.lowagie.text.pdf.PdfPTable(new float[]{0.8f, 2.0f, 1.5f, 2.6f, 3.4f, 3.0f});
            tabla.setWidthPercentage(100);
            tabla.setHeaderRows(1);
            var fEnc = new com.lowagie.text.Font(negrita, 8, com.lowagie.text.Font.NORMAL, java.awt.Color.WHITE);
            for (String c : COLUMNAS_PDF) {
                var celda = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(c, fEnc));
                celda.setBackgroundColor(primario);
                celda.setBorderColor(primario);
                celda.setPadding(5);
                tabla.addCell(celda);
            }
            var fCel = new com.lowagie.text.Font(base, 7.5f, com.lowagie.text.Font.NORMAL, tinta);
            var fNombre = new com.lowagie.text.Font(negrita, 7.5f, com.lowagie.text.Font.NORMAL, tinta);
            var fGris = new com.lowagie.text.Font(base, 6.8f, com.lowagie.text.Font.NORMAL, suave);
            var fGrupo = new com.lowagie.text.Font(negrita, 8.5f, com.lowagie.text.Font.NORMAL, primario);
            var fDia = new com.lowagie.text.Font(negrita, 7.5f, com.lowagie.text.Font.NORMAL, suave);
            var borde = new java.awt.Color(0xE1, 0xE7, 0xF0);
            Integer grupo = null;
            LocalDate dia = null;
            for (var f : filas) {
                Integer id = idExamen(f);
                if (porExamen && (grupo == null || !grupo.equals(id))) {
                    grupo = id;
                    dia = null;
                    tabla.addCell(filaTitulo(id < 0 ? "Sin examen" : tituloExamen(f), fGrupo, new java.awt.Color(0xED, 0xF2, 0xFE), borde));
                }
                LocalDate delDia = f.fechaHora().toLocalDate();
                if (!delDia.equals(dia)) {
                    dia = delDia;
                    String nombreDia = delDia.format(java.time.format.DateTimeFormatter.ofPattern("EEEE dd/MM/yyyy", new Locale("es")));
                    tabla.addCell(filaTitulo(nombreDia.toUpperCase(new Locale("es")), fDia, new java.awt.Color(0xF5, 0xF7, 0xFB), borde));
                }
                // Hora
                tabla.addCell(celdaPdf(new com.lowagie.text.Phrase(f.fechaHora().format(HORA), fCel), borde));
                // Usuario: nombre y, debajo, su rol en palabras.
                var celdaUsuario = new com.lowagie.text.Phrase(f.usuario(), fNombre);
                if (f.rolUsuario() != null) celdaUsuario.add(new com.lowagie.text.Chunk("\n" + rolesEnPalabras(f.rolUsuario()), fGris));
                tabla.addCell(celdaPdf(celdaUsuario, borde));
                // Operación: etiqueta de color y el módulo debajo.
                java.awt.Color[] colores = coloresOperacion(f.accion());
                var etiqueta = new com.lowagie.text.Chunk(" " + f.operacion() + " ", new com.lowagie.text.Font(negrita, 7, com.lowagie.text.Font.NORMAL, colores[1]));
                etiqueta.setBackground(colores[0], 1, 1.5f, 1, 1.5f);
                var celdaOperacion = new com.lowagie.text.Phrase(etiqueta);
                celdaOperacion.add(new com.lowagie.text.Chunk("\n" + f.modulo(), fGris));
                var celdaOp = celdaPdf(celdaOperacion, borde);
                celdaOp.setLeading(0, 1.5f);
                tabla.addCell(celdaOp);
                // Afecta a: y, si es de un examen (y no se agrupó por examen), su fecha, horario y aula en una línea.
                var afecta = new com.lowagie.text.Phrase(f.objetivo() == null ? "" : pdfTexto(f.objetivo()), fCel);
                String examen = porExamen ? "" : examenCorto(f);
                if (!examen.isEmpty()) afecta.add(new com.lowagie.text.Chunk("\n" + examen, fGris));
                tabla.addCell(celdaPdf(afecta, borde));
                // Detalle y, solo si hay, el motivo debajo.
                var detalle = new com.lowagie.text.Phrase(pdfTexto(f.detalle()), fCel);
                if (f.motivo() != null && !f.motivo().isBlank()) detalle.add(new com.lowagie.text.Chunk("\nMotivo: " + pdfTexto(f.motivo()), fGris));
                tabla.addCell(celdaPdf(detalle, borde));
                // Cambios: uno por línea, a lo más 3.
                tabla.addCell(celdaPdf(new com.lowagie.text.Phrase(cambiosEnLineas(f.diferencias()), fCel), borde));
            }
            if (filas.isEmpty()) {
                var vacia = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("No hay operaciones con estos filtros.", fCel));
                vacia.setColspan(COLUMNAS_PDF.length);
                vacia.setPadding(8);
                tabla.addCell(vacia);
            }
            document.add(tabla);
            document.close();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el PDF del historial.", e);
        }
        return out.toByteArray();
    }

    private static int idExamen(HistorialOperacionResponse f) {
        return f.cambios() != null && f.cambios().has("idExamen") ? f.cambios().path("idExamen").asInt(-1) : -1;
    }

    /** «Base de Datos I · G2 — 12/11/2026 · 20:30 – 20:50 · Aula 607». */
    private static String tituloExamen(HistorialOperacionResponse f) {
        String datos = f.examen() == null ? "" : String.join(" · ", f.examen().stream()
                .filter(x -> List.of("Fecha", "Horario", "Aula").contains(x.campo())).map(x -> "Aula".equals(x.campo()) ? "Aula " + x.valor() : x.valor()).toList());
        return (f.objetivo() == null ? "Examen" : f.objetivo()) + (datos.isEmpty() ? "" : " — " + datos);
    }

    /** «3 expulsiones · 5 incidencias · 12 ingresos · 4 otras operaciones». */
    private static String resumen(List<HistorialOperacionResponse> filas) {
        java.util.Map<String, Integer> cuenta = new LinkedHashMap<>();
        for (var f : filas) {
            String clave = switch (f.accion()) {
                case "INGRESO_AUTORIZADO" -> "ingresos autorizados";
                case "INGRESO_DENEGADO" -> "ingresos denegados";
                case "EXPULSION_REGISTRADA" -> "expulsiones";
                case "EXPULSION_ANULADA" -> "expulsiones anuladas";
                case "INTENTO_INGRESO_REGISTRADO", "AULA_INCORRECTA_REGISTRADA", "QR_DUPLICADO_REPORTADO", "FOTO_REPORTADA" -> "incidencias";
                case "EXCEPCION_REGISTRADA" -> "excepciones";
                case "SALIDA_REGISTRADA" -> "salidas";
                case "ESTUDIANTE_TRASLADADO" -> "traslados";
                default -> "otras operaciones";
            };
            cuenta.merge(clave, 1, Integer::sum);
        }
        // Lo de «otras» al final.
        Integer otras = cuenta.remove("otras operaciones");
        if (otras != null) cuenta.put("otras operaciones", otras);
        return String.join(" · ", cuenta.entrySet().stream().map(e -> e.getValue() + " " + (e.getValue() == 1 ? SINGULAR.get(e.getKey()) : e.getKey())).toList());
    }

    private static final Map<String, String> SINGULAR = Map.of(
            "ingresos autorizados", "ingreso autorizado", "ingresos denegados", "ingreso denegado", "expulsiones", "expulsión",
            "expulsiones anuladas", "expulsión anulada", "incidencias", "incidencia", "excepciones", "excepción",
            "salidas", "salida", "traslados", "traslado", "otras operaciones", "otra operación");

    /** Tipo, docente y examen elegidos, para el encabezado del PDF. */
    private String extraTexto(Extra extra) {
        List<String> partes = new ArrayList<>();
        if (extra.tipo() != null && TIPOS.containsKey(extra.tipo())) partes.add("tipo " + TIPOS.get(extra.tipo())[0]);
        if (extra.docente() != null) {
            jdbc.query("SELECT trim(nombre || ' ' || apellidos) FROM usuario WHERE id_usuario = ?", (rs, i) -> rs.getString(1), extra.docente())
                    .stream().findFirst().ifPresent(n -> partes.add("exámenes del docente " + n));
        }
        if (extra.examen() != null) {
            jdbc.query("SELECT m.nombre, e.fecha FROM examen e JOIN materia m ON m.id_materia = e.id_materia WHERE e.id_examen = ?",
                    (rs, i) -> rs.getString(1) + " del " + rs.getDate(2).toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                    extra.examen()).stream().findFirst().ifPresent(n -> partes.add("examen " + n));
        }
        return partes.isEmpty() ? "" : " · " + String.join(", ", partes);
    }

    private static String filtrosTexto(String search, String modulo, String operacion, String realizadoPor) {
        List<String> partes = new ArrayList<>();
        if (realizadoPor != null) partes.add("realizado por " + realizadoPor);
        if (modulo != null && !modulo.isBlank()) partes.add("módulo " + modulo);
        if (operacion != null && !operacion.isBlank()) partes.add("operación " + operacion);
        if (search != null && !search.isBlank()) partes.add("búsqueda «" + search.strip() + "»");
        return partes.isEmpty() ? "" : " · " + String.join(", ", partes);
    }

    /**
     * Filtros de la descarga: tipo (grupo de operaciones), docente (lo ocurrido en sus exámenes, lo haya hecho quien
     * sea) y un examen puntual. Vacío = sin filtro.
     */
    public record Extra(String tipo, Integer docente, Integer examen) {
        public static final Extra NINGUNO = new Extra(null, null, null);
    }

    /** Grupos del filtro Tipo: código → (nombre, condición SQL). */
    static final Map<String, String[]> TIPOS = new LinkedHashMap<>();
    static {
        TIPOS.put("INCIDENCIAS", new String[]{"Incidencias de control",
                "a.accion IN ('INTENTO_INGRESO_REGISTRADO','AULA_INCORRECTA_REGISTRADA','QR_DUPLICADO_REPORTADO','FOTO_REPORTADA')"});
        TIPOS.put("EXPULSIONES", new String[]{"Expulsiones",
                "a.accion IN ('EXPULSION_REGISTRADA','EXPULSION_ANULADA','EVIDENCIA_AGREGADA')"});
        TIPOS.put("EXCEPCIONES", new String[]{"Excepciones e ingresos manuales",
                "(a.accion = 'EXCEPCION_REGISTRADA' OR (a.accion = 'INGRESO_AUTORIZADO' AND a.detalles LIKE '%\"manual\":true%'))"});
        TIPOS.put("INGRESOS", new String[]{"Ingresos y salidas",
                "a.accion IN ('INGRESO_AUTORIZADO','INGRESO_DENEGADO','SALIDA_REGISTRADA','ESTUDIANTE_TRASLADADO')"});
        TIPOS.put("EXAMENES", new String[]{"Cambios en exámenes", "a.accion IN (" + acciones("Exámenes") + ")"});
        TIPOS.put("USUARIOS", new String[]{"Usuarios y roles", "a.accion IN (" + acciones("Usuarios") + "," + acciones("Roles") + ")"});
        TIPOS.put("ESTUDIANTES", new String[]{"Estudiantes", "a.accion IN (" + acciones("Estudiantes") + ")"});
    }

    private static String acciones(String modulo) {
        return HistorialPresentacion.ACCIONES.entrySet().stream().filter(e -> e.getValue().modulo().equals(modulo))
                .map(e -> "'" + e.getKey() + "'").collect(java.util.stream.Collectors.joining(","));
    }

    /** Nombre del usuario elegido en «Realizado por», para el encabezado del PDF. */
    private String nombreUsuario(Integer usuario) {
        if (usuario == null) return null;
        return jdbc.query("SELECT trim(nombre || ' ' || apellidos) FROM usuario WHERE id_usuario = ?",
                (rs, i) -> rs.getString(1), usuario).stream().findFirst().orElse(null);
    }

    /** Quién realizó operaciones (para el filtro «Realizado por»), con sus roles; por nombre. */
    public record Autor(Integer idUsuario, String nombre, String roles) {}

    @Transactional(readOnly = true)
    public List<Autor> autores() {
        return jdbc.query("""
                SELECT u.id_usuario, trim(u.nombre || ' ' || u.apellidos),
                       (SELECT string_agg(r.nombre, ', ' ORDER BY r.nombre) FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = u.id_usuario)
                FROM usuario u WHERE EXISTS (SELECT 1 FROM auditoria_operacion a WHERE a.id_usuario = u.id_usuario)
                ORDER BY 2
                """, (rs, i) -> new Autor(rs.getInt(1), rs.getString(2), rs.getString(3)));
    }

    private Filtro filtro(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario) {
        return filtro(search, modulo, operacion, desde, hasta, usuario, Extra.NINGUNO);
    }

    private Filtro filtro(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta, Integer usuario, Extra extra) {
        StringBuilder sql = new StringBuilder(" FROM auditoria_operacion a JOIN usuario u ON u.id_usuario = a.id_usuario WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            sql.append(" AND lower(concat_ws(' ', u.nombre, u.apellidos, u.email, a.accion, a.detalles)) LIKE ? ESCAPE '!'");
            args.add("%" + escapar(search.strip().toLowerCase(Locale.ROOT)) + "%");
        }
        if (modulo != null && !modulo.isBlank() && !"TODOS".equalsIgnoreCase(modulo)) {
            sql.append(" AND ").append(HistorialPresentacion.casoSql(true)).append(" = ?");
            args.add(HistorialPresentacion.codigo(modulo.strip()));
        }
        if (operacion != null && !operacion.isBlank() && !"TODAS".equalsIgnoreCase(operacion)) {
            sql.append(" AND ").append(HistorialPresentacion.casoSql(false)).append(" = ?");
            args.add(HistorialPresentacion.codigo(operacion.strip()));
        }
        if (desde != null) { sql.append(" AND a.fecha_hora >= ?"); args.add(Timestamp.valueOf(desde.atStartOfDay())); }
        if (hasta != null) { sql.append(" AND a.fecha_hora < ?"); args.add(Timestamp.valueOf(hasta.plusDays(1).atStartOfDay())); }
        if (usuario != null) { sql.append(" AND a.id_usuario = ?"); args.add(usuario); }
        if (extra.tipo() != null && TIPOS.containsKey(extra.tipo())) sql.append(" AND ").append(TIPOS.get(extra.tipo())[1]);
        // Docente o examen: las operaciones que guardan ese examen en sus detalles ("idExamen":N, o "idExamen":N}).
        List<Integer> examenes = null;
        if (extra.examen() != null) examenes = List.of(extra.examen());
        if (extra.docente() != null) {
            List<Integer> delDocente = jdbc.queryForList("SELECT DISTINCT id_examen FROM examen WHERE id_docente = ?", Integer.class, extra.docente());
            examenes = examenes == null ? delDocente : examenes.stream().filter(delDocente::contains).toList();
        }
        if (examenes != null) {
            if (examenes.isEmpty()) {
                sql.append(" AND 1 = 0");
            } else {
                sql.append(" AND (");
                for (int i = 0; i < examenes.size(); i++) {
                    if (i > 0) sql.append(" OR ");
                    sql.append("a.detalles LIKE ? OR a.detalles LIKE ?");
                    args.add("%\"idExamen\":" + examenes.get(i) + ",%");
                    args.add("%\"idExamen\":" + examenes.get(i) + "}%");
                }
                sql.append(")");
            }
        }
        return new Filtro(sql.toString(), args);
    }

    private HistorialOperacionResponse respuesta(HistorialPresentacion presentacion, int id, Timestamp fecha, int idUsuario,
            String usuario, String rolUsuario, String email, String accion, String detalles) {
        JsonNode cambios;
        try { cambios = detalles == null || detalles.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(detalles); }
        catch (Exception e) { cambios = TextNode.valueOf(detalles == null ? "" : detalles); }
        HistorialPresentacion.Tipo tipo = HistorialPresentacion.tipoDe(accion);
        HistorialPresentacion.Vista vista;
        try { vista = presentacion.vista(accion, cambios); }
        catch (RuntimeException e) {
            // Un registro que no se puede leer no rompe el historial: se muestra con el nombre de la acción.
            org.slf4j.LoggerFactory.getLogger(HistorialOperacionService.class).warn("No se pudo presentar la auditoría {} ({})", id, accion, e);
            vista = new HistorialPresentacion.Vista(null, HistorialPresentacion.capital(accion), null, List.of());
        }
        return new HistorialOperacionResponse(id, fecha.toLocalDateTime(), idUsuario, usuario, rolUsuario, email,
                tipo.modulo(), tipo.operacion(), accion, vista.resumen(), vista.objetivo(), vista.motivo(),
                vista.diferencias(), vista.examen(), cambios);
    }

    /** «Fecha: 07/11/2026 → 11/11/2026; Aula: 607» para la columna del CSV. */
    private static final String[] COLUMNAS_PDF = {"Hora", "Usuario", "Operación", "Afecta a", "Detalle", "Cambios"};
    private static final int MAX_CAMBIOS_PDF = 3;

    /** Helvetica (CP1252) no tiene «→»: en el PDF va «»». */
    private static String pdfTexto(String texto) { return texto == null ? "" : texto.replace("→", "»"); }

    private static com.lowagie.text.pdf.PdfPCell celdaPdf(com.lowagie.text.Phrase contenido, java.awt.Color borde) {
        var celda = new com.lowagie.text.pdf.PdfPCell(contenido);
        celda.setPadding(4);
        celda.setPaddingBottom(5);
        celda.setBorder(com.lowagie.text.Rectangle.BOTTOM);
        celda.setBorderColor(borde);
        return celda;
    }

    private static com.lowagie.text.pdf.PdfPCell filaTitulo(String texto, com.lowagie.text.Font fuente, java.awt.Color fondo, java.awt.Color borde) {
        var celda = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(texto, fuente));
        celda.setColspan(COLUMNAS_PDF.length);
        celda.setPadding(4);
        celda.setPaddingLeft(5);
        celda.setBackgroundColor(fondo);
        celda.setBorder(com.lowagie.text.Rectangle.BOTTOM);
        celda.setBorderColor(borde);
        return celda;
    }

    /** «ADMIN, DOCENTE» → «Administrador, Docente». */
    private static String rolesEnPalabras(String roles) {
        return String.join(", ", java.util.Arrays.stream(roles.split(",\\s*")).map(r -> switch (r.strip()) {
            case "ADMIN" -> "Administrador";
            case "DOCENTE" -> "Docente";
            case "CONTROL" -> "Personal de control";
            case "ESTUDIANTE" -> "Estudiante";
            default -> r.strip();
        }).toList());
    }

    /** Fondo y texto de la etiqueta: rojo lo grave (expulsiones, incidencias, denegar, cancelar, quitar), verde lo que habilita, azul el resto. */
    private static java.awt.Color[] coloresOperacion(String accion) {
        var rojo = new java.awt.Color[]{new java.awt.Color(0xFE, 0xE2, 0xE2), new java.awt.Color(0xB9, 0x1C, 0x1C)};
        var verde = new java.awt.Color[]{new java.awt.Color(0xDC, 0xFC, 0xE7), new java.awt.Color(0x15, 0x80, 0x3D)};
        var azul = new java.awt.Color[]{new java.awt.Color(0xE5, 0xEC, 0xFF), new java.awt.Color(0x04, 0x39, 0xD9)};
        return switch (accion) {
            case "EXPULSION_REGISTRADA", "INTENTO_INGRESO_REGISTRADO", "AULA_INCORRECTA_REGISTRADA", "QR_DUPLICADO_REPORTADO",
                 "FOTO_REPORTADA", "INGRESO_DENEGADO", "EXAMEN_CANCELADO", "USUARIO_BLOQUEADO", "ROL_ELIMINADO",
                 "ESTUDIANTE_QUITADO_DEL_EXAMEN", "ESTUDIANTE_FOTO_QUITADA", "FOTO_RECHAZADA", "EXCEPCION_REGISTRADA" -> rojo;
            case "INGRESO_AUTORIZADO", "CUENTA_ESTUDIANTE_ACTIVADA", "USUARIO_DESBLOQUEADO", "FOTO_APROBADA", "HABILITACION_ACTUALIZADA",
                 "EXPULSION_ANULADA", "USUARIO_CREADO", "ESTUDIANTE_CREADO", "EXAMEN_CREADO", "AYUDA_ATENDIDA" -> verde;
            default -> azul;
        };
    }

    /** «12/11 · 20:30 – 20:50 · Aula 607» (sin el docente: va en el encabezado cuando se filtra por él). */
    private static String examenCorto(HistorialOperacionResponse f) {
        if (f.examen() == null || f.examen().isEmpty()) return "";
        List<String> partes = new ArrayList<>();
        for (var d : f.examen()) {
            switch (d.campo()) {
                case "Fecha" -> partes.add(d.valor().length() >= 5 ? d.valor().substring(0, 5) : d.valor());
                case "Horario" -> partes.add(d.valor().replaceAll("\\s*\\(.*\\)$", ""));
                case "Aula" -> partes.add("Aula " + d.valor());
                default -> { }
            }
        }
        return pdfTexto(String.join(" · ", partes));
    }

    /** Un cambio por línea; si son muchos, los 3 primeros y «y N más». */
    private static String cambiosEnLineas(List<HistorialOperacionResponse.Diferencia> diferencias) {
        List<String> lineas = diferencias.stream().limit(MAX_CAMBIOS_PDF).map(d -> d.campo() + ": "
                + (d.antes() == null ? "" : d.antes() + " » ") + (d.despues() == null ? "(quitado)" : d.despues())).toList();
        String texto = String.join("\n", lineas);
        int resto = diferencias.size() - MAX_CAMBIOS_PDF;
        return pdfTexto(resto > 0 ? texto + "\ny " + resto + " más" : texto);
    }

    private static String cambiosLegibles(List<HistorialOperacionResponse.Diferencia> diferencias) {
        return String.join("; ", diferencias.stream().map(d -> d.campo() + ": "
                + (d.antes() == null ? "" : d.antes() + " → ") + (d.despues() == null ? "(quitado)" : d.despues())).toList());
    }

    private static String escapar(String texto) { return texto.replace("!", "!!").replace("%", "!%").replace("_", "!_"); }
    private record Filtro(String fromWhere, List<Object> args) {}
}
