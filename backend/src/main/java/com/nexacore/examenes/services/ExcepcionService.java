package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.RegistrarExceptionRequest;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExcepcionNoHabilitado;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExcepcionService {

    private final ExcepcionNoHabilitadoRepository excepcionRepo;
    private final EstudianteRepository estudianteRepo;
    private final UsuarioRepository usuarioRepo;
    private final IntentoIngresoRepository intentoIngresoRepo;
    private final ExamenRepository examenRepo;

    public ExcepcionService(
            ExcepcionNoHabilitadoRepository excepcionRepo,
            EstudianteRepository estudianteRepo,
            UsuarioRepository usuarioRepo,
            IntentoIngresoRepository intentoIngresoRepo,
            ExamenRepository examenRepo) {
        this.excepcionRepo = excepcionRepo;
        this.estudianteRepo = estudianteRepo;
        this.usuarioRepo = usuarioRepo;
        this.intentoIngresoRepo = intentoIngresoRepo;
        this.examenRepo = examenRepo;
    }

    @Transactional
    public void registrarExcepcion(RegistrarExceptionRequest req, String emailUsuarioControl) {

        Estudiante est = estudianteRepo.findById(req.idEstudiante())
                .orElseThrow(() -> new IllegalArgumentException("Estudiante no encontrado"));

        Usuario user = usuarioRepo.findByEmail(emailUsuarioControl)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        Examen examen = examenRepo.findFirstByIdIdExamen(req.idExamen())
                .orElseThrow(() -> new IllegalArgumentException("Examen no encontrado"));

        Integer idAmbienteFinal = req.idAmbiente();
        if (idAmbienteFinal == null || idAmbienteFinal == 0) {
            idAmbienteFinal = examen.getIdAmbiente();
        }

        // 1. Guardar en la tabla de excepciones
        ExcepcionNoHabilitado excepcion = new ExcepcionNoHabilitado();
        excepcion.setIdEstudiante(est.getId());
        excepcion.setIdExamen(req.idExamen());
        excepcion.setIdAmbiente(idAmbienteFinal);
        excepcion.setIdUsuarioControl(user.getId());
        
        String motivo = req.motivoInhabilitacion();
        if (motivo != null && motivo.length() > 255) motivo = motivo.substring(0, 255);
        excepcion.setMotivoInhabilitacion(motivo);
        
        String accion = req.accionTomada();
        if (accion != null && accion.length() > 100) accion = accion.substring(0, 100);
        excepcion.setAccionTomada(accion);
        
        String obs = req.observaciones();
        if (obs != null && obs.length() > 500) obs = obs.substring(0, 500);
        excepcion.setObservaciones(obs);
        
        excepcionRepo.save(excepcion);

        // 2. Guardar en el Historial de Intentos
        String textoPrincipal = "Intento ingresar no habilitado";
        StringBuilder detalles = new StringBuilder();

        // Agregamos el motivo a los detalles
        if (motivo != null && !motivo.isBlank() && !motivo.equalsIgnoreCase("Pendiente de habilitación")) {
            detalles.append("Motivo: ").append(motivo).append(" | ");
        }
        
        // Agregamos la acción
        detalles.append("Acción tomada: ").append(accion);
        
        // Agregamos las observaciones si hay
        if (obs != null && !obs.isBlank()) {
            detalles.append(" | Observaciones: ").append(obs);
        }

        String textoFinal = textoPrincipal + " ### " + detalles.toString();

        intentoIngresoRepo.registrar(
                req.idExamen(),
                est.getId(),
                user.getId(),
                est.getCodigoSis(),
                textoFinal 
        );
    }
}