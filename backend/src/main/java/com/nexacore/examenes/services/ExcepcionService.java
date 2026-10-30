package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.RegistrarExceptionRequest;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExcepcionNoHabilitado;
import com.nexacore.examenes.models.Notificacion;
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
    private final NotificacionService notificacionService;
    private final AmbienteRepository ambienteRepo;
    private final SesionExamenService sesionExamenService;

    public ExcepcionService(
            ExcepcionNoHabilitadoRepository excepcionRepo,
            EstudianteRepository estudianteRepo,
            UsuarioRepository usuarioRepo,
            IntentoIngresoRepository intentoIngresoRepo,
            ExamenRepository examenRepo,
            NotificacionService notificacionService,
            AmbienteRepository ambienteRepo,
            SesionExamenService sesionExamenService) {
        this.notificacionService = notificacionService;
        this.ambienteRepo = ambienteRepo;
        this.sesionExamenService = sesionExamenService;
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

        // 3. Avisar a ADMIN, CONTROL y al DOCENTE del examen (como los demás reportes del control).
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, req.idExamen(), req.idEstudiante());
        notificacionService.publicar(Notificacion.EXCEPCION_NO_HABILITADO,
                "Excepción de no habilitado: " + est.getNombre() + " " + est.getApellidos(),
                notificacionService.materia(req.idExamen()) + " · " + detalles
                        + " · Registrada por " + user.getNombre() + " " + user.getApellidos(),
                req.idExamen(), est.getId(), "/dashboard/control/" + req.idExamen() + "/informacion",
                emailUsuarioControl);
    }

    /**
     * INCI-04: reporte de excepciones del examen (sesión actual), de la más reciente a la más antigua,
     * con el nombre del estudiante, del ambiente y de quien la registró (sin consultas por fila).
     */
    @Transactional(readOnly = true)
    public java.util.List<com.nexacore.examenes.dto.ExcepcionNoHabilitadoResponse> listar(Integer idExamen) {
        var registros = excepcionRepo.deSesionActual(idExamen, sesionExamenService.ultimoCierre(idExamen));
        if (registros.isEmpty()) return java.util.List.of();
        var estudiantes = new java.util.HashMap<Integer, Estudiante>();
        estudianteRepo.findAllById(registros.stream().map(ExcepcionNoHabilitado::getIdEstudiante).distinct().toList())
                .forEach(e -> estudiantes.put(e.getId(), e));
        var usuarios = new java.util.HashMap<Integer, Usuario>();
        usuarioRepo.findAllById(registros.stream().map(ExcepcionNoHabilitado::getIdUsuarioControl).distinct().toList())
                .forEach(u -> usuarios.put(u.getId(), u));
        var ambientes = new java.util.HashMap<Integer, String>();
        ambienteRepo.findAllById(registros.stream().map(ExcepcionNoHabilitado::getIdAmbiente).distinct().toList())
                .forEach(a -> ambientes.put(a.getId(), a.getNombre()));
        return registros.stream().map(x -> {
            Estudiante e = estudiantes.get(x.getIdEstudiante());
            Usuario u = usuarios.get(x.getIdUsuarioControl());
            return new com.nexacore.examenes.dto.ExcepcionNoHabilitadoResponse(x.getId(), x.getIdEstudiante(),
                    e == null ? null : (e.getNombre() + " " + e.getApellidos()).trim(), e == null ? null : e.getCodigoSis(),
                    x.getMotivoInhabilitacion(), x.getAccionTomada(), x.getObservaciones(), ambientes.get(x.getIdAmbiente()),
                    u == null ? null : (u.getNombre() + " " + u.getApellidos()).trim(), x.getFechaHora());
        }).toList();
    }
}
