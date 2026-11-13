package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.dto.ExpulsionResponse;
import com.nexacore.examenes.dto.AutorizarIngresoResponse;
import com.nexacore.examenes.dto.RegistroControlIngresoResponse;
import com.nexacore.examenes.dto.RegistroControlIngresoExamenResponse;
import com.nexacore.examenes.dto.ContextoControlIngresoResponse;
import com.nexacore.examenes.dto.ReasignarAmbienteRequest;
import com.nexacore.examenes.dto.ReasignarAmbienteResponse;
import com.nexacore.examenes.dto.RegistrarExceptionRequest;
import com.nexacore.examenes.dto.TipoIncidenciaResponse;

import com.nexacore.examenes.services.ControlIngresoService;
import com.nexacore.examenes.services.ExcepcionService; 
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Control de ingreso", description = "Registro y autorización del ingreso a exámenes")
@RestController
@RequestMapping("/control-ingresos")
public class ControlIngresoController {

    /** Qué exámenes ve cada usuario en Reportes (ADMIN todos; el resto, los suyos). */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.ExamenAccesoService acceso;

    /** Cada operación queda en el historial de operaciones (Configuración). */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.AuditoriaService auditoria;
    
    private final ControlIngresoService service;
    private final ExcepcionService excepcionService; 
    public ControlIngresoController(ControlIngresoService service, ExcepcionService excepcionService) {
        this.service = service;
        this.excepcionService = excepcionService; 
    }

    @PreAuthorize("@examenAccesoService.puedeExpulsar(#request.idExamen, authentication)")
    @PostMapping("/expulsar")
    public ResponseEntity<ExpulsionResponse> expulsar(
            @Valid @RequestBody ExpulsarEstudianteRequest request, Authentication authentication) {
        ExpulsionResponse r = service.expulsar(request, authentication);
        auditoria.registrar("EXPULSION_REGISTRADA", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", request.idExamen(), "idEstudiante", request.idEstudiante(), "motivo", request.motivo()));
        return ResponseEntity.ok(r);
    }

    @Operation(summary = "Anular una expulsión registrada por error",
               description = "No se borra: queda en el historial como anulada, con quién, cuándo y por qué.")
    @PreAuthorize("@examenAccesoService.puedeExpulsar(#idExamen, authentication)")
    @PostMapping("/examen/{idExamen}/expulsiones/{idExpulsion}/anular")
    public ResponseEntity<ExpulsionResponse> anularExpulsion(
            @PathVariable Integer idExamen, @PathVariable Integer idExpulsion,
            @Valid @RequestBody com.nexacore.examenes.dto.AnularExpulsionRequest request, Authentication authentication) {
        ExpulsionResponse r = service.anularExpulsion(idExamen, idExpulsion, request.motivo(), authentication);
        auditoria.registrar("EXPULSION_ANULADA", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", idExamen, "idEstudiante", r.idEstudiante(), "motivo", request.motivo()));
        return ResponseEntity.ok(r);
    }

    @Operation(summary = "Registrar salida", description = "Cuando el estudiante entrega y se retira: guarda la hora del servidor. "
            + "Solo quien ingresó, no fue expulsado y aún no salió. Quien controla el examen (CONTROL o su docente).")
    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/salida")
    public com.nexacore.examenes.dto.SalidaResponse registrarSalida(
            @Valid @RequestBody com.nexacore.examenes.dto.SalidaRequest request, Authentication authentication) {
        var r = salidaExamenService.registrar(request.idExamen(), request.idEstudiante(), authentication.getName());
        auditoria.registrar("SALIDA_REGISTRADA", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", request.idExamen(), "idEstudiante", request.idEstudiante()));
        return r;
    }

    /** Salida del examen (V56); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.SalidaExamenService salidaExamenService;

    @Operation(summary = "Autorizar ingreso", description = "Registra evidencia y autoriza una sola vez con timestamp del servidor.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/autorizar")
    public ResponseEntity<AutorizarIngresoResponse> autorizar(
            @Valid @RequestBody AutorizarIngresoRequest request,
            Authentication authentication) {
        AutorizarIngresoResponse response = service.autorizar(request, authentication.getName());
        if (response.autorizado()) {
            auditoria.registrar("INGRESO_AUTORIZADO", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", request.idExamen(), "idEstudiante", request.idEstudiante(),
                    "manual", request.ingresoManual() ? true : null, "motivo", request.ingresoManual() ? request.justificacionManual() : null));
            return ResponseEntity.ok(response);
        }
        if ("DENEGADO_DUPLICADO".equals(response.resultado())) {
            return ResponseEntity.status(409).body(response);
        }
        return ResponseEntity.unprocessableEntity().body(response);
    }

    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/denegar")
    public ResponseEntity<AutorizarIngresoResponse> denegar(
            @Valid @RequestBody AutorizarIngresoRequest request, Authentication authentication) {
        AutorizarIngresoResponse r = service.denegar(request, authentication.getName());
        auditoria.registrar("INGRESO_DENEGADO", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", request.idExamen(), "idEstudiante", request.idEstudiante(), "motivo", request.detalleDenegacion()));
        return ResponseEntity.ok(r);
    }

    @Operation(summary = "Consultar historial", description = "Devuelve autorizaciones y denegaciones registradas para el estudiante y examen.")
    @PreAuthorize("@examenAccesoService.puedeVerControl(#idExamen, authentication)")
    @GetMapping("/{idEstudiante}/{idExamen}")
    public ResponseEntity<List<RegistroControlIngresoResponse>> historial(
            @PathVariable Integer idEstudiante,
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.consultarHistorial(idEstudiante, idExamen));
    }

    @Operation(summary = "Consultar registros de ingreso del examen",
            description = "Devuelve las autorizaciones y denegaciones del examen para el informe de ingreso en tiempo real.")
    @PreAuthorize("@examenAccesoService.puedeVerControl(#idExamen, authentication)")
    @GetMapping("/examen/{idExamen}/registros")
    public ResponseEntity<List<RegistroControlIngresoExamenResponse>> registrosExamen(
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.consultarRegistrosExamen(idExamen));
    }

    @Operation(summary = "Consultar contexto", description = "Devuelve estudiante, examen, normas y condiciones previas para el flujo de autorización.")
    @PreAuthorize("@examenAccesoService.puedeVerControl(#idExamen, authentication)")
    @GetMapping("/{idEstudiante}/{idExamen}/contexto")
    public ResponseEntity<ContextoControlIngresoResponse> contexto(
            @PathVariable Integer idEstudiante,
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.consultarContexto(idEstudiante, idExamen));
    }

    @Operation(summary = "Listar tipos de incidencia", description = "Devuelve el catálogo disponible para registrar incidencias durante el control.")
    @PreAuthorize("@permisos.alguno(authentication, 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')")
    @GetMapping("/tipos-incidencia")
    public ResponseEntity<List<TipoIncidenciaResponse>> tiposIncidencia() {
        return ResponseEntity.ok(service.listarTiposIncidencia());
    }
@Operation(summary = "Reasignar ambiente por contingencia", description = "Reasigna al estudiante a un nuevo ambiente manteniendo intacta su hora de ingreso original.")
    @PreAuthorize("@examenAccesoService.puedeReasignar(#idExamen, authentication)")
    @PostMapping("/{idExamen}/{idEstudiante}/reasignar") // <-- Cambiado el orden en la URL
    public ResponseEntity<ReasignarAmbienteResponse> reasignarAmbiente(
            @PathVariable Integer idExamen,      // <-- Primero el idExamen
            @PathVariable Integer idEstudiante,   // <-- Después el idEstudiante
            @Valid @RequestBody ReasignarAmbienteRequest request,
            Authentication authentication) {
        
        ReasignarAmbienteResponse response = service.reasignarAmbiente(idExamen, idEstudiante, request, authentication.getName());
        auditoria.registrar("ESTUDIANTE_TRASLADADO", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", idExamen, "idEstudiante", idEstudiante,
                "aulaOrigen", response.aulaOrigenNombre(), "aulaDestino", response.aulaDestinoNombre(), "motivo", request.motivo()));
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Excepciones de no habilitado de todos los exámenes",
               description = "BUG-G03. El ADMIN ve todas; el DOCENTE y el CONTROL, solo las de sus exámenes.")
    @PreAuthorize("@permisos.alguno(authentication, 'REPORTES_VER', 'CONTROL_INGRESO_PROPIOS')")
    @GetMapping("/excepciones-no-habilitado")
    public ResponseEntity<List<com.nexacore.examenes.dto.ExcepcionNoHabilitadoResponse>> listarTodasExcepciones(
            Authentication authentication) {
        return ResponseEntity.ok(excepcionService.listarDe(acceso.visibles(excepcionService.examenesConExcepciones(), authentication)));
    }

    @Operation(summary = "Reporte de excepciones de no habilitado",
               description = "Excepciones registradas en la sesión actual del examen, de la más reciente a la más antigua.")
    @PreAuthorize("@examenAccesoService.puedeVerReportes(#idExamen, authentication)")
    @GetMapping("/examen/{idExamen}/excepciones-no-habilitado")
    public ResponseEntity<List<com.nexacore.examenes.dto.ExcepcionNoHabilitadoResponse>> listarExcepciones(
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(excepcionService.listar(idExamen));
    }

    // INCI-04 (Lia): se había borrado al resolver un conflicto con INCI-03 (commit ea64843).
    // ControlIngresoControllerTests la llama para que no vuelva a desaparecer sin que fallen las pruebas.
    @Operation(summary = "Registrar excepción de no habilitado",
               description = "Registra en la tabla de excepciones y en el historial de intentos automáticamente.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/excepcion-no-habilitado")
    public ResponseEntity<Void> registrarExcepcion(
            @Valid @RequestBody RegistrarExceptionRequest request,
            Authentication authentication) {
        excepcionService.registrarExcepcion(request, authentication.getName());
        auditoria.registrar("EXCEPCION_REGISTRADA", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", request.idExamen(), "idEstudiante", request.idEstudiante(),
                "motivo", request.motivoInhabilitacion(), "accion", request.accionTomada()));
        return ResponseEntity.ok().build();
    }
}
