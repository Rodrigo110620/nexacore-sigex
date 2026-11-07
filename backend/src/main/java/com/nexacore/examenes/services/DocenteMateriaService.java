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
        if (!docenteRepository.existsById(idDocente)) {
            throw new IllegalArgumentException("El usuario no está registrado como DOCENTE.");
        }
        Set<Integer> ids = validar(idMaterias);
        docenteMateriaRepository.borrarDelDocente(idDocente);
        docenteMateriaRepository.flush();
        docenteMateriaRepository.saveAll(ids.stream().map(id -> new DocenteMateria(idDocente, id)).toList());
        return materiasDe(idDocente);
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
