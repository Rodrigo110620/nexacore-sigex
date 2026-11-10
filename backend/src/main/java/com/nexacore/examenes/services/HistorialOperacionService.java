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
import java.util.List;
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
        int pagina = Math.max(0, page);
        int tamano = Math.min(MAXIMO_PAGINA, Math.max(1, size));
        Filtro filtro = filtro(search, modulo, operacion, desde, hasta);
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

    private List<HistorialOperacionResponse> todas(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta) {
        Filtro filtro = filtro(search, modulo, operacion, desde, hasta);
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
        List<HistorialOperacionResponse> filas = todas(search, modulo, operacion, desde, hasta);
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
        List<HistorialOperacionResponse> filas = todas(search, modulo, operacion, desde, hasta);
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
                    + filtrosTexto(search, modulo, operacion) + "\n",
                    new com.lowagie.text.Font(base, 9, com.lowagie.text.Font.NORMAL, suave)));
            var celdaTitulo = new com.lowagie.text.pdf.PdfPCell(titulo);
            celdaTitulo.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            celdaTitulo.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
            celdaTitulo.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
            encabezado.addCell(celdaTitulo);
            encabezado.setSpacingAfter(10);
            document.add(encabezado);

            var tabla = new com.lowagie.text.pdf.PdfPTable(new float[]{1.0f, 0.8f, 1.8f, 1.4f, 1.7f, 2.2f, 2.6f, 1.6f, 2.8f});
            tabla.setWidthPercentage(100);
            tabla.setHeaderRows(1);
            var fEnc = new com.lowagie.text.Font(negrita, 8, com.lowagie.text.Font.NORMAL, java.awt.Color.WHITE);
            for (String c : COLUMNAS) {
                var celda = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(c, fEnc));
                celda.setBackgroundColor(primario);
                celda.setPadding(5);
                tabla.addCell(celda);
            }
            var fCel = new com.lowagie.text.Font(base, 7.5f, com.lowagie.text.Font.NORMAL, tinta);
            boolean par = false;
            for (var f : filas) {
                for (String v : celdas(f)) {
                    // Helvetica (CP1252) no tiene «→»: en el PDF va «»».
                    var celda = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(v.replace("→", "»"), fCel));
                    celda.setPadding(4);
                    celda.setBorderColor(new java.awt.Color(0xD8, 0xE3, 0xF5));
                    if (par) celda.setBackgroundColor(new java.awt.Color(0xF5, 0xF8, 0xFD));
                    tabla.addCell(celda);
                }
                par = !par;
            }
            if (filas.isEmpty()) {
                var vacia = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("No hay operaciones con estos filtros.", fCel));
                vacia.setColspan(COLUMNAS.length);
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

    private static String filtrosTexto(String search, String modulo, String operacion) {
        List<String> partes = new ArrayList<>();
        if (modulo != null && !modulo.isBlank()) partes.add("módulo " + modulo);
        if (operacion != null && !operacion.isBlank()) partes.add("operación " + operacion);
        if (search != null && !search.isBlank()) partes.add("búsqueda «" + search.strip() + "»");
        return partes.isEmpty() ? "" : " · " + String.join(", ", partes);
    }

    private Filtro filtro(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta) {
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
    private static String cambiosLegibles(List<HistorialOperacionResponse.Diferencia> diferencias) {
        return String.join("; ", diferencias.stream().map(d -> d.campo() + ": "
                + (d.antes() == null ? "" : d.antes() + " → ") + (d.despues() == null ? "(quitado)" : d.despues())).toList());
    }

    private static String escapar(String texto) { return texto.replace("!", "!!").replace("%", "!%").replace("_", "!_"); }
    private record Filtro(String fromWhere, List<Object> args) {}
}
