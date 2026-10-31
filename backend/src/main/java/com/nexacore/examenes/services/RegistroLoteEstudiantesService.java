package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.dto.ReglasEstudiante;
import com.nexacore.examenes.models.CondicionEstudiante;
import com.nexacore.examenes.models.EstadoMatricula;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Registro de estudiantes por bloques para la importación masiva.
 *
 * Aplica las mismas reglas y mensajes que {@link EstudianteService#registrar}, pero consulta los
 * duplicados de todo el bloque de una vez y guarda con inserciones agrupadas: 10 000 estudiantes
 * pasan de unas 90 000 consultas a unas pocas por bloque.
 */
@Service
public class RegistroLoteEstudiantesService {

    private final NamedParameterJdbcTemplate jdbc;

    public RegistroLoteEstudiantesService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Datos ya normalizados de una solicitud, como los guarda {@link EstudianteService#registrar}. */
    private record Fila(int indice, String codigoSis, String nombre, String apellidos, String ci, String telefono,
                        String email, String condicion, String estadoMatricula, int idCarrera, int idFacultad) {
    }

    /**
     * Registra el bloque en una sola transacción. Devuelve, en el mismo orden, el motivo por el que
     * cada solicitud no se guardó, o null si se guardó. Si la base rechaza el bloque (por ejemplo,
     * otro usuario registró el mismo estudiante al mismo tiempo) lanza la excepción y no guarda nada:
     * quien llama lo reintenta fila por fila.
     */
    @Transactional
    public List<String> registrar(List<RegistrarEstudianteRequest> solicitudes) {
        String[] errores = new String[solicitudes.size()];
        List<Fila> filas = new ArrayList<>();
        for (int i = 0; i < solicitudes.size(); i++) {
            try {
                filas.add(normalizar(i, solicitudes.get(i)));
            } catch (IllegalArgumentException e) {
                errores[i] = e.getMessage();
            }
        }

        Set<String> sisEstudiantes = existentes("estudiante", "codigo_sis", filas.stream().map(Fila::codigoSis).toList());
        Set<String> ciEstudiantes = existentes("estudiante", "ci", filas.stream().map(Fila::ci).toList());
        Set<String> emailEstudiantes = existentes("estudiante", "email", filas.stream().map(Fila::email).toList());
        Set<String> ciUsuarios = existentes("usuario", "ci", filas.stream().map(Fila::ci).toList());
        Set<String> emailUsuarios = existentes("usuario", "email", filas.stream().map(Fila::email).toList());
        Set<String> carreras = carrerasExistentes(filas);

        List<Fila> nuevas = new ArrayList<>();
        for (Fila f : filas) {
            String error = sisEstudiantes.contains(minusculas(f.codigoSis())) ? "Ya existe un estudiante con ese código SIS."
                    : ciEstudiantes.contains(minusculas(f.ci())) ? "Ya existe un estudiante con ese CI."
                    : emailEstudiantes.contains(f.email()) ? "Ya existe un estudiante con ese correo electrónico."
                    : ciUsuarios.contains(minusculas(f.ci())) ? "Ya existe un usuario del sistema con ese CI."
                    : emailUsuarios.contains(f.email()) ? "Ya existe un usuario del sistema con ese correo electrónico."
                    : !carreras.contains(f.idCarrera() + "/" + f.idFacultad())
                            ? "La carrera seleccionada no pertenece a la facultad indicada."
                    : null;
            if (error == null) nuevas.add(f);
            else errores[f.indice()] = error;
        }
        guardar(nuevas);
        return Arrays.asList(errores);
    }

    private static Fila normalizar(int indice, RegistrarEstudianteRequest r) {
        String codigoSis = limpiar(r.codigoSis());
        String ci = limpiar(r.ci());
        ReglasEstudiante.validarSisDistintoDeCi(codigoSis, ci);
        if (r.idCarrera() == null || r.idFacultad() == null) {
            throw new IllegalArgumentException("La carrera seleccionada no pertenece a la facultad indicada.");
        }
        return new Fila(indice, codigoSis, limpiar(r.nombre()), limpiar(r.apellidos()), ci,
                EstadoMatricula.normalizarTelefono(r.telefono(), null),
                limpiar(r.email()).toLowerCase(Locale.ROOT),
                CondicionEstudiante.normalizar(r.condicion(), CondicionEstudiante.REGULAR),
                EstadoMatricula.normalizar(r.estadoMatricula(), EstadoMatricula.MATRICULADO),
                r.idCarrera(), r.idFacultad());
    }

    /** Valores (en minúsculas) de la columna que ya existen en la tabla, sin distinguir mayúsculas. */
    private Set<String> existentes(String tabla, String columna, Collection<String> valores) {
        if (valores.isEmpty()) return Set.of();
        Set<String> buscados = new HashSet<>();
        valores.forEach(v -> buscados.add(minusculas(v)));
        // Tabla y columna son constantes de esta clase, nunca datos del archivo.
        return new HashSet<>(jdbc.queryForList(
                "SELECT lower(" + columna + ") FROM public." + tabla + " WHERE lower(" + columna + ") IN (:valores)",
                new MapSqlParameterSource("valores", buscados), String.class));
    }

    /** Pares "idCarrera/idFacultad" del bloque que existen en el catálogo. */
    private Set<String> carrerasExistentes(List<Fila> filas) {
        Set<Integer> ids = new HashSet<>();
        filas.forEach(f -> ids.add(f.idCarrera()));
        if (ids.isEmpty()) return Set.of();
        return new HashSet<>(jdbc.query(
                "SELECT id_carrera, id_facultad FROM public.carrera WHERE id_carrera IN (:ids)",
                new MapSqlParameterSource("ids", ids),
                (rs, n) -> rs.getInt("id_carrera") + "/" + rs.getInt("id_facultad")));
    }

    private void guardar(List<Fila> nuevas) {
        if (nuevas.isEmpty()) return;
        SqlParameterSource[] estudiantes = nuevas.stream().map(f -> new MapSqlParameterSource()
                .addValue("codigoSis", f.codigoSis()).addValue("nombre", f.nombre())
                .addValue("apellidos", f.apellidos()).addValue("ci", f.ci())
                .addValue("telefono", f.telefono()).addValue("email", f.email())
                .addValue("condicion", f.condicion()).addValue("estadoMatricula", f.estadoMatricula()))
                .toArray(SqlParameterSource[]::new);
        jdbc.batchUpdate("""
                INSERT INTO public.estudiante (codigo_sis, nombre, apellidos, ci, telefono, email, condicion, estado_matricula)
                VALUES (:codigoSis, :nombre, :apellidos, :ci, :telefono, :email, :condicion, :estadoMatricula)
                """, estudiantes);

        Map<String, Integer> ids = new HashMap<>();
        jdbc.query("SELECT codigo_sis, id_estudiante FROM public.estudiante WHERE codigo_sis IN (:codigos)",
                new MapSqlParameterSource("codigos", nuevas.stream().map(Fila::codigoSis).toList()),
                rs -> { ids.put(rs.getString("codigo_sis"), rs.getInt("id_estudiante")); });
        SqlParameterSource[] carreras = nuevas.stream().map(f -> new MapSqlParameterSource()
                .addValue("idEstudiante", ids.get(f.codigoSis()))
                .addValue("idCarrera", f.idCarrera()).addValue("idFacultad", f.idFacultad()))
                .toArray(SqlParameterSource[]::new);
        jdbc.batchUpdate("""
                INSERT INTO public.estudiante_carrera (id_estudiante, id_carrera, id_facultad)
                VALUES (:idEstudiante, :idCarrera, :idFacultad)
                """, carreras);
    }

    private static String limpiar(String valor) {
        return valor == null ? "" : valor.trim().replaceAll("\\s+", " ");
    }

    private static String minusculas(String valor) {
        return valor.toLowerCase(Locale.ROOT);
    }
}
