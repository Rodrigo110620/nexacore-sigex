package com.nexacore.examenes.controllers;

import org.springframework.security.core.Authentication;
import com.nexacore.examenes.services.SesionExamenService;
import com.nexacore.examenes.services.AsistenciaExportService;
import com.nexacore.examenes.dto.SesionExamenResponse;
import com.nexacore.examenes.dto.ReprogramarExamenRequest;
import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.CrearExamenRequest;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.services.ExamenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Tag(name = "Exámenes", description = "Registro y consulta de exámenes")
@RestController
@RequestMapping("/examenes")
public class ExamenController {

    private final ExamenService examenService;
    private final SesionExamenService sesionExamenService;
    private final AsistenciaExportService asistenciaExportService;

    public ExamenController(ExamenService examenService, SesionExamenService sesionExamenService, AsistenciaExportService asistenciaExportService) {
        this.examenService = examenService;
        this.sesionExamenService = sesionExamenService;
        this.asistenciaExportService = asistenciaExportService;
    }

    @Operation(summary = "Mis exámenes (para Reportes)",
            description = "Con REPORTES_VER, todos. El DOCENTE, los suyos; el CONTROL, en los que está asignado como personal de control.")
    @PreAuthorize("@permisos.alguno(authentication, 'REPORTES_VER', 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')")
    @GetMapping("/mios")
    public ResponseEntity<List<ExamenResponse>> listarMios() {
        return ResponseEntity.ok(examenService.listarMios());
    }

    @Operation(summary = "Listar exámenes", description = "ADMIN y CONTROL ven todos. DOCENTE solo los que tiene asignados.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_VER_TODOS', 'EXAMENES_VER_PROPIOS', 'REPORTES_VER')")
    @GetMapping
    public ResponseEntity<List<ExamenResponse>> listar() {
        return ResponseEntity.ok(examenService.listar());
    }

    @Operation(summary = "Registrar examen", description = "Crea examen con validación de conflicto de ambiente. Solo el DOCENTE "
            + "registra sus propios exámenes (queda asignado a sí mismo); el ADMIN supervisa, edita, reprograma y cancela, pero no crea.")
    @PreAuthorize("@permisos.tiene(authentication, 'EXAMENES_GESTIONAR_PROPIOS')")
    @PostMapping
    public ResponseEntity<ExamenResponse> crear(@Valid @RequestBody CrearExamenRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examenService.crear(request));
    }

    @Operation(summary = "Actualizar examen", description = "Modifica datos del examen (fecha, hora, ambiente y normas). "
            + "ADMIN cualquiera; DOCENTE solo los suyos, y el examen sigue a su nombre.")
    @PreAuthorize("@examenAccesoService.puedeEditar(#idExamen, authentication)")
    @PutMapping("/{idExamen}/{idParalelo}")
    public ResponseEntity<ExamenResponse> actualizar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idParalelo,
            @Valid @RequestBody ActualizarExamenRequest request) {
        return ResponseEntity.ok(examenService.actualizar(idExamen, idParalelo, request));
    }

    @Operation(summary = "Reprogramar un examen finalizado",
            description = "Para repetirlo en otra fecha: la sesión que terminó queda en el historial con el resultado "
                    + "de cada estudiante y todos vuelven a \"no ingresado\". ADMIN, o el DOCENTE del examen.")
    @PreAuthorize("@examenAccesoService.puedeReprogramar(#idExamen, authentication)")
    @PostMapping("/{idExamen}/{idParalelo}/reprogramar")
    public ResponseEntity<ExamenResponse> reprogramar(@PathVariable Integer idExamen, @PathVariable Integer idParalelo,
                                                      @Valid @RequestBody ReprogramarExamenRequest request,
                                                      Authentication authentication) {
        return ResponseEntity.ok(examenService.reprogramar(idExamen, idParalelo, request, authentication.getName()));
    }

    @Operation(summary = "Historial de sesiones del examen",
            description = "Sesiones anteriores de un examen reprogramado, con el resultado de cada estudiante.")
    @PreAuthorize("@examenAccesoService.puedeVerControl(#idExamen, authentication)")
    @GetMapping("/{idExamen}/{idParalelo}/sesiones")
    public ResponseEntity<List<SesionExamenResponse>> sesiones(@PathVariable Integer idExamen,
                                                              @PathVariable Integer idParalelo) {
        return ResponseEntity.ok(sesionExamenService.listar(idExamen));
    }

    @Operation(summary = "Cancelar examen", description = "Marca el examen como cancelado. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'EXAMENES_CANCELAR')")
    @DeleteMapping("/{idExamen}/{idParalelo}")
    public ResponseEntity<Void> cancelar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idParalelo) {
        examenService.cancelar(idExamen, idParalelo);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Descargar asistencia en CSV", description = "Exporta la lista de estudiantes habilitados con su hora de ingreso.")
    @PreAuthorize("@examenAccesoService.puedeExportar(#idExamen, authentication)")
    @GetMapping("/{idExamen}/asistencia.csv")
    public ResponseEntity<byte[]> descargarAsistenciaCsv(@PathVariable Integer idExamen) {
        byte[] data = asistenciaExportService.generarCsv(idExamen);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(asistenciaExportService.nombreArchivo(idExamen, "csv")).build().toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(data);
    }

    @Operation(summary = "Descargar asistencia en Excel", description = "Exporta la lista de estudiantes habilitados con su hora de ingreso.")
    @PreAuthorize("@examenAccesoService.puedeExportar(#idExamen, authentication)")
    @GetMapping("/{idExamen}/asistencia.xlsx")
    public ResponseEntity<byte[]> descargarAsistenciaExcel(@PathVariable Integer idExamen) {
        byte[] data = asistenciaExportService.generarExcel(idExamen);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(asistenciaExportService.nombreArchivo(idExamen, "xlsx")).build().toString())
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}