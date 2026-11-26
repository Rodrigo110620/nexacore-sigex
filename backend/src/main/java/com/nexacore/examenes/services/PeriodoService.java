package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.CrearPeriodoRequest;
import com.nexacore.examenes.dto.PeriodoAcademicoResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.PeriodoAcademico;
import com.nexacore.examenes.repositories.PeriodoAcademicoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Periodos académicos (V61). Los grupos nuevos y sus exámenes son del periodo activo, y las listas muestran por
 * defecto ese periodo; los anteriores quedan como historial.
 */
@Service
public class PeriodoService {

    /**
     * Condición SQL «el grupo es del periodo activo» para la tabla con ese alias. Un grupo sin periodo (solo en las
     * pruebas sobre H2, donde la columna no es obligatoria) siempre cuenta.
     */
    public static String delPeriodoActivo(String alias) {
        return "(" + alias + ".id_periodo IS NULL OR " + alias
                + ".id_periodo = (SELECT pa.id_periodo FROM periodo_academico pa WHERE pa.activo = TRUE))";
    }

    private final PeriodoAcademicoRepository repository;
    private final AuditoriaService auditoriaService;

    public PeriodoService(PeriodoAcademicoRepository repository, AuditoriaService auditoriaService) {
        this.repository = repository;
        this.auditoriaService = auditoriaService;
    }

    /** Id del periodo activo; null solo en una base sin periodos (pruebas sobre H2): entonces no se filtra. */
    @Transactional(readOnly = true)
    public Integer idActivo() {
        return repository.findFirstByActivoTrue().map(PeriodoAcademico::getId).orElse(null);
    }

    /** El periodo pedido; sin ninguno, el activo; con 0, todos los periodos (devuelve null: no se filtra). */
    @Transactional(readOnly = true)
    public Integer resolver(Integer idPeriodo) {
        if (idPeriodo == null) return idActivo();
        if (idPeriodo == 0) return null;
        if (!repository.existsById(idPeriodo)) {
            throw new IllegalArgumentException("El periodo académico no existe.");
        }
        return idPeriodo;
    }

    @Transactional(readOnly = true)
    public List<PeriodoAcademicoResponse> listar() {
        return repository.findAllByOrderByFechaInicioDesc().stream().map(PeriodoService::respuesta).toList();
    }

    @Transactional
    public PeriodoAcademicoResponse crear(CrearPeriodoRequest request) {
        String nombre = request.nombre().trim().toUpperCase(Locale.ROOT);
        if (!request.fechaFin().isAfter(request.fechaInicio())) {
            throw new IllegalArgumentException("La fecha de fin debe ser posterior a la de inicio.");
        }
        if (repository.existsByNombreIgnoreCase(nombre)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "Ya existe el periodo " + nombre + ".");
        }
        for (PeriodoAcademico otro : repository.findAll()) {
            if (request.fechaInicio().isBefore(otro.getFechaFin()) && otro.getFechaInicio().isBefore(request.fechaFin())) {
                throw new ControlIngresoException(HttpStatus.CONFLICT,
                        "Las fechas se cruzan con el periodo " + otro.getNombre() + ".");
            }
        }
        if (request.activar()) repository.desactivarTodos();
        PeriodoAcademico periodo = new PeriodoAcademico();
        periodo.setNombre(nombre);
        periodo.setFechaInicio(request.fechaInicio());
        periodo.setFechaFin(request.fechaFin());
        periodo.setActivo(request.activar() || repository.findFirstByActivoTrue().isEmpty());
        periodo = repository.save(periodo);
        auditoriaService.registrar("PERIODO_CREADO", Map.of("periodo", nombre, "activo", periodo.isActivo()));
        return respuesta(periodo);
    }

    /** Cambia el periodo activo: desde ahora los grupos y exámenes nuevos son de ese periodo. */
    @Transactional
    public PeriodoAcademicoResponse activar(Integer idPeriodo) {
        PeriodoAcademico periodo = repository.findById(idPeriodo)
                .orElseThrow(() -> new IllegalArgumentException("El periodo académico no existe."));
        if (periodo.isActivo()) return respuesta(periodo);
        String anterior = repository.findFirstByActivoTrue().map(PeriodoAcademico::getNombre).orElse("");
        repository.desactivarTodos();
        periodo = repository.findById(idPeriodo).orElseThrow();
        periodo.setActivo(true);
        periodo = repository.save(periodo);
        auditoriaService.registrar("PERIODO_ACTIVADO", Map.of("periodo", periodo.getNombre(), "anterior", anterior));
        return respuesta(periodo);
    }

    private static PeriodoAcademicoResponse respuesta(PeriodoAcademico p) {
        return new PeriodoAcademicoResponse(p.getId(), p.getNombre(), p.getFechaInicio(), p.getFechaFin(), p.isActivo());
    }
}
