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
        List<Object> args = new ArrayList<>(filtro.args);
        args.add(tamano);
        args.add((long) pagina * tamano);
        List<HistorialOperacionResponse> contenido = jdbc.query("""
                SELECT a.id_auditoria, a.fecha_hora, u.id_usuario,
                       trim(u.nombre || ' ' || u.apellidos),
                       (SELECT string_agg(r.nombre, ', ' ORDER BY r.nombre) FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = u.id_usuario),
                       u.email, a.accion, a.detalles
                """ + filtro.fromWhere + " ORDER BY a.fecha_hora DESC, a.id_auditoria DESC LIMIT ? OFFSET ?",
                (rs, row) -> respuesta(rs.getInt(1), rs.getTimestamp(2), rs.getInt(3), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)), args.toArray());
        long n = total == null ? 0 : total;
        return new PageResponse<>(contenido, pagina, tamano, n, (int) Math.ceil((double) n / tamano));
    }

    @Transactional(readOnly = true)
    public byte[] exportar(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta) {
        Filtro filtro = filtro(search, modulo, operacion, desde, hasta);
        List<HistorialOperacionResponse> filas = jdbc.query("""
                SELECT a.id_auditoria, a.fecha_hora, u.id_usuario,
                       trim(u.nombre || ' ' || u.apellidos),
                       (SELECT string_agg(r.nombre, ', ' ORDER BY r.nombre) FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = u.id_usuario),
                       u.email, a.accion, a.detalles
                """ + filtro.fromWhere + " ORDER BY a.fecha_hora DESC, a.id_auditoria DESC",
                (rs, row) -> respuesta(rs.getInt(1), rs.getTimestamp(2), rs.getInt(3), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)), filtro.args.toArray());
        var out = new ByteArrayOutputStream();
        try (var writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write('\uFEFF');
            var csv = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setDelimiter(';').setRecordSeparator("\n")
                    .setHeader("fecha_hora", "usuario", "email", "modulo", "operacion", "detalle", "cambios").build());
            for (var f : filas) csv.printRecord(f.fechaHora(), f.usuario(), f.email(), f.modulo(), f.operacion(), f.detalle(), f.cambios());
            csv.flush();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo exportar el historial.", e);
        }
        return out.toByteArray();
    }

    private Filtro filtro(String search, String modulo, String operacion, LocalDate desde, LocalDate hasta) {
        StringBuilder sql = new StringBuilder(" FROM auditoria_operacion a JOIN usuario u ON u.id_usuario = a.id_usuario WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            sql.append(" AND lower(concat_ws(' ', u.nombre, u.apellidos, u.email, a.accion, a.detalles)) LIKE ? ESCAPE '!'");
            args.add("%" + escapar(search.strip().toLowerCase(Locale.ROOT)) + "%");
        }
        if (modulo != null && !modulo.isBlank() && !"TODOS".equalsIgnoreCase(modulo)) {
            sql.append(" AND ").append(condicionModulo());
            args.add(modulo.strip().toUpperCase(Locale.ROOT));
        }
        if (operacion != null && !operacion.isBlank() && !"TODAS".equalsIgnoreCase(operacion)) {
            sql.append(" AND upper(CASE "
                    + "WHEN a.accion LIKE '%_CREADO' OR a.accion LIKE '%_CREAR' THEN 'CREAR' "
                    + "WHEN a.accion LIKE '%_EDITADO' OR a.accion LIKE '%_MODIFICADO' OR a.accion LIKE '%_ACTUALIZADO' OR a.accion LIKE '%_REPROGRAMADO' THEN 'EDITAR' "
                    + "WHEN a.accion LIKE '%_ASIGNADO' OR a.accion LIKE '%_ASIGNAR' THEN 'ASIGNAR' "
                    + "WHEN a.accion LIKE '%_IMPORTADO' OR a.accion LIKE '%_IMPORTAR' THEN 'IMPORTAR' "
                    + "WHEN a.accion LIKE '%_DESBLOQUEADO' OR a.accion LIKE '%_ACTIVADO' THEN 'DESBLOQUEAR' "
                    + "WHEN a.accion LIKE '%_BLOQUEADO' OR a.accion LIKE '%_DESACTIVADO' OR a.accion LIKE '%_CANCELADO' THEN 'DESACTIVAR' "
                    + "WHEN a.accion LIKE '%_ELIMINADO' OR a.accion LIKE '%_ELIMINAR' THEN 'ELIMINAR' "
                    + "WHEN a.accion LIKE '%_DESCARGADO' OR a.accion LIKE '%_RESPALDO' THEN 'RESPALDO' "
                    + "ELSE a.accion END) = ?");
            args.add(operacion.strip().toUpperCase(Locale.ROOT));
        }
        if (desde != null) { sql.append(" AND a.fecha_hora >= ?"); args.add(Timestamp.valueOf(desde.atStartOfDay())); }
        if (hasta != null) { sql.append(" AND a.fecha_hora < ?"); args.add(Timestamp.valueOf(hasta.plusDays(1).atStartOfDay())); }
        return new Filtro(sql.toString(), args);
    }

    private static String condicionModulo() {
        return "upper(CASE "
                + "WHEN a.accion LIKE 'USUARIO_%' OR a.accion LIKE '%_USUARIO%' THEN 'USUARIOS' "
                + "WHEN a.accion LIKE 'ROL_%' OR a.accion LIKE '%PERMISO%' THEN 'ROLES' "
                + "WHEN a.accion LIKE 'EXAMEN_%' OR a.accion LIKE '%HABILITACION%' THEN 'EXAMENES' "
                + "WHEN a.accion LIKE 'ESTUDIANTE_%' OR a.accion LIKE '%IMPORTACION%' THEN 'ESTUDIANTES' "
                + "WHEN a.accion LIKE 'RESPALDO_%' THEN 'CONFIGURACION' ELSE a.accion END) = ?";
    }

    private HistorialOperacionResponse respuesta(int id, Timestamp fecha, int idUsuario, String usuario,
            String rolUsuario, String email, String accion, String detalles) {
        JsonNode cambios;
        try { cambios = detalles == null || detalles.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(detalles); }
        catch (Exception e) { cambios = TextNode.valueOf(detalles == null ? "" : detalles); }
        String modulo = modulo(accion);
        String operacion = operacion(accion);
        String detalle = detalle(accion, cambios);
        return new HistorialOperacionResponse(id, fecha.toLocalDateTime(), idUsuario, usuario, rolUsuario, email,
                modulo, operacion, accion, detalle, cambios);
    }

    private static String modulo(String accion) {
        String a = accion.toUpperCase(Locale.ROOT);
        if (a.startsWith("USUARIO_") || a.contains("_USUARIO")) return "Usuarios";
        if (a.startsWith("ROL_") || a.contains("PERMISO")) return "Roles";
        if (a.startsWith("EXAMEN_") || a.contains("HABILITACION")) return "Exámenes";
        if (a.startsWith("ESTUDIANTE_") || a.contains("IMPORTACION")) return "Estudiantes";
        if (a.startsWith("RESPALDO_")) return "Configuración";
        String primero = a.split("_")[0].toLowerCase(Locale.ROOT);
        return Character.toUpperCase(primero.charAt(0)) + primero.substring(1);
    }

    private static String operacion(String accion) {
        String[] partes = accion.split("_");
        String sufijo = partes[partes.length - 1].toUpperCase(Locale.ROOT);
        String valor = switch (sufijo) {
            case "CREADO", "CREAR" -> "crear";
            case "EDITADO", "MODIFICADO", "ACTUALIZADO", "REPROGRAMADO" -> "editar";
            case "ASIGNADO", "ASIGNAR" -> "asignar";
            case "IMPORTADO", "IMPORTAR" -> "importar";
            case "BLOQUEADO", "DESACTIVADO", "CANCELADO" -> "desactivar";
            case "DESBLOQUEADO", "ACTIVADO" -> "desbloquear";
            case "ELIMINADO", "ELIMINAR" -> "eliminar";
            case "DESCARGADO", "RESPALDO" -> "respaldo";
            default -> sufijo.toLowerCase(Locale.ROOT);
        };
        return Character.toUpperCase(valor.charAt(0)) + valor.substring(1);
    }

    private static String detalle(String accion, JsonNode cambios) {
        if (cambios != null && cambios.isObject()) {
            for (String campo : List.of("detalle", "descripcion", "nombre", "archivo", "motivo")) {
                JsonNode valor = cambios.get(campo);
                if (valor != null && !valor.isNull() && !valor.asText().isBlank()) return valor.asText();
            }
        }
        return accion.replace('_', ' ').toLowerCase(Locale.ROOT);
    }

    private static String escapar(String texto) { return texto.replace("!", "!!").replace("%", "!%").replace("_", "!_"); }
    private record Filtro(String fromWhere, List<Object> args) {}
}
