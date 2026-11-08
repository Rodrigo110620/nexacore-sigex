package com.nexacore.examenes.services;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

/**
 * Foto de perfil opcional del personal (V54). Se valida igual que la del estudiante (hasta 150 KB y una imagen
 * real: JPEG, PNG o WebP); el navegador ya la reduce antes de enviarla.
 */
@Service
public class UsuarioFotoService {

    public record Foto(byte[] contenido, String tipoContenido) {}

    private final NamedParameterJdbcTemplate jdbc;

    public UsuarioFotoService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Optional<Foto> obtener(Integer idUsuario) {
        List<Foto> fotos = jdbc.query("SELECT contenido, tipo_contenido FROM usuario_foto WHERE id_usuario = :id",
                new MapSqlParameterSource("id", idUsuario), (rs, i) -> new Foto(rs.getBytes(1), rs.getString(2)));
        return fotos.stream().findFirst();
    }

    @Transactional(readOnly = true)
    public boolean tiene(Integer idUsuario) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM usuario_foto WHERE id_usuario = :id",
                new MapSqlParameterSource("id", idUsuario), Integer.class);
        return n != null && n > 0;
    }

    /** @throws IllegalArgumentException si no hay archivo, supera 150 KB o no es una imagen. */
    @Transactional
    public void guardar(Integer idUsuario, MultipartFile archivo) {
        byte[] contenido = EstudianteFotoService.leerImagen(archivo);
        String tipo = EstudianteFotoService.tipoDeImagen(contenido).orElseThrow();
        MapSqlParameterSource p = new MapSqlParameterSource("id", idUsuario).addValue("contenido", contenido).addValue("tipo", tipo);
        if (jdbc.update("UPDATE usuario_foto SET contenido = :contenido, tipo_contenido = :tipo, actualizada_en = CURRENT_TIMESTAMP WHERE id_usuario = :id", p) == 0) {
            jdbc.update("INSERT INTO usuario_foto (id_usuario, contenido, tipo_contenido, actualizada_en) VALUES (:id, :contenido, :tipo, CURRENT_TIMESTAMP)", p);
        }
    }

    @Transactional
    public void quitar(Integer idUsuario) {
        jdbc.update("DELETE FROM usuario_foto WHERE id_usuario = :id", new MapSqlParameterSource("id", idUsuario));
    }
}
