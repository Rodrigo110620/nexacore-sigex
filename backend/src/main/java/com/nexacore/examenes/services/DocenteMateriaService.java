package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.MateriaResponse;
import com.nexacore.examenes.models.DocenteMateria;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.DocenteMateriaRepository;
import com.nexacore.examenes.repositories.DocenteRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * IMP-12: las materias de cada docente. El ADMIN las asigna al registrarlo (al menos una) o después
 * desde Usuarios; el docente solo programa exámenes y busca materias entre las suyas.
 */
@Service
public class DocenteMateriaService {

    static final String SIN_MATERIAS = "Elige al menos una materia para el docente.";
    static final String NO_ES_SUYA = "Solo puedes programar exámenes de tus materias. Pide al administrador que te asigne esta materia.";

    private final DocenteMateriaRepository docenteMateriaRepository;
    private final DocenteRepository docenteRepository;
    private final MateriaRepository materiaRepository;
    private final UsuarioRepository usuarioRepository;

    public DocenteMateriaService(DocenteMateriaRepository docenteMateriaRepository, DocenteRepository docenteRepository,
                                 MateriaRepository materiaRepository, UsuarioRepository usuarioRepository) {
        this.docenteMateriaRepository = docenteMateriaRepository;
        this.docenteRepository = docenteRepository;
        this.materiaRepository = materiaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /** Valida la lista antes de registrar al docente: al menos una materia y todas del catálogo. */
    public Set<Integer> validar(List<Integer> idMaterias) {
        Set<Integer> ids = new LinkedHashSet<>();
        if (idMaterias != null) for (Integer id : idMaterias) if (id != null) ids.add(id);
        if (ids.isEmpty()) throw new IllegalArgumentException(SIN_MATERIAS);
        if (materiaRepository.findAllById(ids).size() != ids.size()) {
            throw new IllegalArgumentException("Alguna de las materias elegidas no existe en el catálogo.");
        }
        return ids;
    }

    @Transactional(readOnly = true)
    public List<MateriaResponse> materiasDe(Integer idDocente) {
        return materiaRepository.findAllById(docenteMateriaRepository.idsDeMaterias(idDocente)).stream()
                .sorted(Comparator.comparing(Materia::getNombre, String.CASE_INSENSITIVE_ORDER))
                .map(m -> new MateriaResponse(m.getId(), m.getSigla(), m.getNombre()))
                .toList();
    }

    /** Reemplaza las materias del docente por las de la lista (al menos una). */
    @Transactional
    public List<MateriaResponse> asignar(Integer idDocente, List<Integer> idMaterias) {
        return asignar(idDocente, idMaterias, null);
    }

    /**
     * Reemplaza las materias del docente y, si se envían, los grupos de cada una: crea los que faltan y quita los
     * que ya no están (solo si no tienen exámenes ni estudiantes). Sin {@code grupos} no se tocan sus grupos.
     */
    @Transactional
    public List<MateriaResponse> asignar(Integer idDocente, List<Integer> idMaterias, Map<Integer, List<String>> grupos) {
        if (!docenteRepository.existsById(idDocente)) {
            throw new IllegalArgumentException("El usuario no está registrado como DOCENTE.");
        }
        Set<Integer> ids = validar(idMaterias);
        Map<Integer, Set<String>> porMateria = validarGrupos(idDocente, ids, grupos);
        docenteMateriaRepository.borrarDelDocente(idDocente);
        docenteMateriaRepository.flush();
        docenteMateriaRepository.saveAll(ids.stream().map(id -> new DocenteMateria(idDocente, id)).toList());
        porMateria.forEach((idMateria, nombres) -> sincronizarGrupos(idDocente, idMateria, nombres));
        return materiasDe(idDocente);
    }

    /** Un grupo: «G» y un número (G1, G2… G20); se acepta «1» o «g1» y se guarda como «G1». */
    static String normalizarGrupo(String nombre) {
        String g = nombre == null ? "" : nombre.trim().toUpperCase(java.util.Locale.ROOT);
        if (g.matches("\\d{1,2}")) g = "G" + g;
        if (!g.matches("G([1-9]|1\\d|20)")) {
            throw new IllegalArgumentException("El grupo «" + (nombre == null ? "" : nombre.trim()) + "» no es válido: usa G1, G2… hasta G20.");
        }
        return g;
    }

    /**
     * Valida los grupos pedidos: al menos uno por materia enviada, solo de las materias elegidas y sin repetir
     * el grupo de otro docente en la misma materia (cada grupo de una materia tiene un solo docente).
     * {@code idDocente} null: el docente aún no existe (registro). Devuelve los grupos por materia, normalizados.
     */
    public Map<Integer, Set<String>> validarGrupos(Integer idDocente, java.util.Collection<Integer> idMaterias, Map<Integer, List<String>> grupos) {
        Map<Integer, Set<String>> resultado = new java.util.LinkedHashMap<>();
        if (grupos == null) return resultado;
        Set<Integer> materias = new java.util.HashSet<>(idMaterias == null ? List.of() : idMaterias);
        for (var e : grupos.entrySet()) {
            Integer idMateria = e.getKey();
            if (!materias.contains(idMateria)) {
                throw new IllegalArgumentException("Los grupos deben ser de las materias elegidas para el docente.");
            }
            Set<String> nombres = new java.util.TreeSet<>(Comparator.comparingInt((String g) -> Integer.parseInt(g.substring(1))));
            if (e.getValue() != null) for (String g : e.getValue()) nombres.add(normalizarGrupo(g));
            String materia = materiaRepository.findById(idMateria).map(Materia::getNombre).orElse("la materia");
            if (nombres.isEmpty()) throw new IllegalArgumentException("Elige al menos un grupo de " + materia + ".");
            for (String g : nombres) {
                List<String> otro = jdbc.query("""
                        SELECT TRIM(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellidos, ''))
                        FROM paralelo p LEFT JOIN usuario u ON u.id_usuario = p.id_docente
                        WHERE p.id_materia = :materia AND UPPER(TRIM(p.nombre_grupo)) IN (:grupo, :numero)
                          AND (:docente IS NULL OR p.id_docente <> :docente)
                        """, new org.springframework.jdbc.core.namedparam.MapSqlParameterSource("materia", idMateria)
                        .addValue("grupo", g).addValue("numero", g.substring(1)).addValue("docente", idDocente, java.sql.Types.INTEGER), (rs, i) -> rs.getString(1));
                if (!otro.isEmpty()) {
                    throw new IllegalArgumentException("El grupo " + g + " de " + materia + " ya es de " + otro.get(0) + ".");
                }
            }
            resultado.put(idMateria, nombres);
        }
        return resultado;
    }

    /** Deja al docente con exactamente esos grupos en la materia. */
    private void sincronizarGrupos(Integer idDocente, Integer idMateria, Set<String> nombres) {
        var p = new org.springframework.jdbc.core.namedparam.MapSqlParameterSource("docente", idDocente).addValue("materia", idMateria);
        Map<String, Integer> actuales = new java.util.HashMap<>();
        jdbc.query("SELECT id_paralelo, nombre_grupo FROM paralelo WHERE id_docente = :docente AND id_materia = :materia", p,
                rs -> { actuales.put(normalizarSiSePuede(rs.getString(2)), rs.getInt(1)); });
        String materia = materiaRepository.findById(idMateria).map(Materia::getNombre).orElse("la materia");
        for (var actual : actuales.entrySet()) {
            if (nombres.contains(actual.getKey())) continue;
            var q = new org.springframework.jdbc.core.namedparam.MapSqlParameterSource("paralelo", actual.getValue());
            Integer usos = jdbc.queryForObject("""
                    SELECT (SELECT COUNT(*) FROM examen WHERE id_paralelo = :paralelo)
                         + (SELECT COUNT(*) FROM inscripcion_paralelo WHERE id_paralelo = :paralelo)
                    """, q, Integer.class);
            if (usos != null && usos > 0) {
                throw new IllegalArgumentException("No se puede quitar el grupo " + actual.getKey() + " de " + materia
                        + ": ya tiene exámenes o estudiantes.");
            }
            jdbc.update("DELETE FROM paralelo WHERE id_paralelo = :paralelo", q);
        }
        // Los grupos antiguos guardados como «1» pasan a «G1», el mismo formato que los nuevos.
        jdbc.update("""
                UPDATE paralelo SET nombre_grupo = 'G' || TRIM(nombre_grupo)
                WHERE id_docente = :docente AND id_materia = :materia AND TRIM(nombre_grupo) IN ('1','2','3','4','5','6','7','8','9','10',
                      '11','12','13','14','15','16','17','18','19','20')
                """, p);
        for (String g : nombres) {
            if (actuales.containsKey(g)) continue;
            Integer nuevo = jdbc.queryForObject("SELECT nextval('paralelo_id_paralelo_seq')", Map.of(), Integer.class);
            jdbc.update("INSERT INTO paralelo (id_paralelo, id_materia, id_docente, nombre_grupo) VALUES (:id, :materia, :docente, :grupo)",
                    new org.springframework.jdbc.core.namedparam.MapSqlParameterSource(p.getValues()).addValue("id", nuevo).addValue("grupo", g));
        }
    }

    private static String normalizarSiSePuede(String nombre) {
        try {
            return normalizarGrupo(nombre);
        } catch (IllegalArgumentException e) {
            return nombre == null ? "" : nombre.trim();
        }
    }

    /** Las materias del docente con los nombres de sus grupos. */
    @Transactional(readOnly = true)
    public List<com.nexacore.examenes.dto.MateriaConGruposResponse> materiasConGrupos(Integer idDocente) {
        Map<Integer, List<String>> grupos = new java.util.HashMap<>();
        jdbc.query("SELECT id_materia, nombre_grupo FROM paralelo WHERE id_docente = :docente",
                new org.springframework.jdbc.core.namedparam.MapSqlParameterSource("docente", idDocente),
                rs -> { grupos.computeIfAbsent(rs.getInt(1), k -> new java.util.ArrayList<>()).add(rs.getString(2)); });
        Comparator<String> porNumero = Comparator.comparing((String g) -> g.replaceAll("\\D", "").length()).thenComparing(Comparator.naturalOrder());
        return materiasDe(idDocente).stream()
                .map(m -> new com.nexacore.examenes.dto.MateriaConGruposResponse(m.id(), m.sigla(), m.nombre(),
                        grupos.getOrDefault(m.id(), List.of()).stream().sorted(porNumero).toList()))
                .toList();
    }

    public boolean tiene(Integer idDocente, Integer idMateria) {
        return docenteMateriaRepository.existsByIdIdDocenteAndIdIdMateria(idDocente, idMateria);
    }

    /** El docente autenticado, si solo gestiona sus propios exámenes; si no (ADMIN), null. */
    /** Grupos para consultas directas; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate jdbc;

    /** Los grupos (G1, G2…) del docente en la materia, con cuántos estudiantes inscritos tiene cada uno. */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.nexacore.examenes.dto.GrupoResponse> gruposDe(Integer idDocente, Integer idMateria) {
        return jdbc.query("""
                SELECT p.id_paralelo, p.nombre_grupo,
                       (SELECT COUNT(*) FROM inscripcion_paralelo i WHERE i.id_paralelo = p.id_paralelo AND LOWER(i.estado) = 'inscrito')
                FROM paralelo p WHERE p.id_docente = :docente AND p.id_materia = :materia
                ORDER BY p.nombre_grupo
                """, new org.springframework.jdbc.core.namedparam.MapSqlParameterSource("docente", idDocente).addValue("materia", idMateria),
                (rs, i) -> new com.nexacore.examenes.dto.GrupoResponse(rs.getInt(1), rs.getString(2), rs.getLong(3)));
    }

    public Integer docenteDeLaSesion() {
        if (!SesionActual.gestionaSoloPropios()) return null;
        return usuarioRepository.findByEmail(SesionActual.email()).map(Usuario::getId).orElse(-1);
    }

    /** Un docente que solo gestiona sus exámenes no puede usar una materia que no tiene asignada. */
    public void exigirQueSeaSuya(Integer idDocente, Integer idMateria) {
        if (SesionActual.gestionaSoloPropios() && !tiene(idDocente, idMateria)) {
            throw new IllegalArgumentException(NO_ES_SUYA);
        }
    }
}
