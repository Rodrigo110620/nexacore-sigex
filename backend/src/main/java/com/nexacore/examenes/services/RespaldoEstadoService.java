package com.nexacore.examenes.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.EstadoRespaldoResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** IMP-10: estado del respaldo de la base para Configuración (versión, tamaño y respaldos descargados). */
@Service
public class RespaldoEstadoService {

    static final int HISTORIAL = 5;

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final String directorio;

    public RespaldoEstadoService(JdbcTemplate jdbc, ObjectMapper objectMapper,
                                 @Value("${app.respaldo.directorio:}") String directorio) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.directorio = directorio;
    }

    @Transactional(readOnly = true)
    public EstadoRespaldoResponse estado() {
        String producto = jdbc.execute((java.sql.Connection c) -> {
            var meta = c.getMetaData();
            return meta.getDatabaseProductName() + " " + meta.getDatabaseProductVersion();
        });
        boolean postgres = producto != null && producto.startsWith("PostgreSQL");
        Long tamano = postgres ? jdbc.queryForObject("SELECT pg_database_size(current_database())", Long.class) : null;
        List<EstadoRespaldoResponse.Respaldo> historial = jdbc.query("""
                SELECT a.fecha_hora, TRIM(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellidos, '')), a.detalles
                FROM auditoria_operacion a
                LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
                WHERE a.accion = 'RESPALDO_DESCARGADO'
                ORDER BY a.fecha_hora DESC
                LIMIT ?
                """, (rs, i) -> {
            JsonNode d = leer(rs.getString(3));
            return new EstadoRespaldoResponse.Respaldo(rs.getTimestamp(1).toLocalDateTime(), rs.getString(2),
                    d.path("archivo").isMissingNode() ? null : d.path("archivo").asText(),
                    d.path("bytes").isNumber() ? d.path("bytes").asLong() : null);
        }, HISTORIAL);
        return new EstadoRespaldoResponse(version(producto), tamano, directorio != null && !directorio.isBlank(), historial);
    }

    /** "PostgreSQL 18.6 (Debian 18.6-1.pgdg)" → "PostgreSQL 18.6". */
    public static String version(String producto) {
        if (producto == null) return null;
        String[] partes = producto.trim().split("\\s+");
        return partes.length >= 2 ? partes[0] + " " + partes[1] : producto.trim();
    }

    private JsonNode leer(String json) {
        try {
            return objectMapper.readTree(json == null ? "{}" : json);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }
}
