package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AsignarPersonalControlRequest;
import com.nexacore.examenes.dto.PersonalControlResponse;
import com.nexacore.examenes.services.ExamenControlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Personal de control", description = "Quién controla el ingreso de cada examen")
@RestController
public class ExamenControlController {

    /** Cada operación queda en el historial de operaciones (Configuración). */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.AuditoriaService auditoria;

    private final ExamenControlService service;

    public ExamenControlController(ExamenControlService service) {
        this.service = service;
    }

    @Operation(summary = "Personal de control del examen", description = "Lo ve quien ve el examen: ADMIN, CONTROL y su docente.")
    @PreAuthorize("@examenAccesoService.puedeVer(#idExamen, authentication)")
    @GetMapping("/examenes/{idExamen}/personal-control")
    public List<PersonalControlResponse> delExamen(@PathVariable Integer idExamen) {
        return service.delExamen(idExamen);
    }

    @Operation(summary = "Asignar el personal de control", description = "ADMIN en cualquier examen; el docente en los suyos.")
    @PreAuthorize("@examenAccesoService.puedeReprogramar(#idExamen, authentication)")
    @PutMapping("/examenes/{idExamen}/personal-control")
    public List<PersonalControlResponse> asignar(@PathVariable Integer idExamen, @Valid @RequestBody AsignarPersonalControlRequest request) {
        // Se compara con el personal que tenía: el historial dice a quién agregó y a quién quitó.
        List<String> antes = nombres(service.delExamen(idExamen));
        List<PersonalControlResponse> personal = service.asignar(idExamen, request.idUsuarios(), request.aulas());
        List<String> ahora = nombres(personal);
        List<String> agregados = ahora.stream().filter(n -> !antes.contains(n)).toList();
        List<String> quitados = antes.stream().filter(n -> !ahora.contains(n)).toList();
        if (!agregados.isEmpty() || !quitados.isEmpty()) {
            auditoria.registrar("PERSONAL_CONTROL_ASIGNADO", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", idExamen,
                    "personal", ahora, "anterior", antes, "agregados", agregados, "quitados", quitados));
        }
        return personal;
    }

    @Operation(summary = "Personal de control disponible", description = "Usuarios activos con el rol CONTROL, para asignarlos.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/personal-control")
    public List<PersonalControlResponse> disponibles() {
        return service.disponibles();
    }

    @Operation(summary = "Personal disponible para el horario de un examen")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/examenes/{idExamen}/personal-control/disponibles")
    public List<PersonalControlResponse> disponiblesParaExamen(@PathVariable Integer idExamen) {
        return service.disponiblesParaExamen(idExamen);
    }

    @Operation(summary = "Personal disponible para un horario", description = "Al registrar un examen: quién está libre en esa fecha y hora.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/personal-control/disponibles")
    public List<PersonalControlResponse> disponiblesEnHorario(
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fecha,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.TIME) java.time.LocalTime horaInicio,
            @org.springframework.web.bind.annotation.RequestParam int duracionMinutos,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer idMateria,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer idDocente) {
        return service.disponiblesEnHorario(fecha, horaInicio, duracionMinutos, idMateria, idDocente);
    }

    @Operation(summary = "Mi aula en el examen", description = "Para el personal de control: el aula a su cargo (204 si no está asignado).")
    @PreAuthorize("@examenAccesoService.puedeVerControl(#idExamen, authentication)")
    @GetMapping("/examenes/{idExamen}/personal-control/mia")
    public org.springframework.http.ResponseEntity<PersonalControlResponse> mia(@PathVariable Integer idExamen,
            org.springframework.security.core.Authentication authentication) {
        PersonalControlResponse mia = service.asignacionDe(idExamen, authentication.getName());
        return mia == null ? org.springframework.http.ResponseEntity.noContent().build() : org.springframework.http.ResponseEntity.ok(mia);
    }

    private static List<String> nombres(List<PersonalControlResponse> personal) {
        // Con su aula (V66): el historial también muestra si a alguien lo cambiaron de aula.
        return personal.stream().map(p -> (p.nombre() + " " + p.apellidos()).trim() + (p.ambiente() == null ? "" : " (aula " + p.ambiente() + ")")).toList();
    }
}
