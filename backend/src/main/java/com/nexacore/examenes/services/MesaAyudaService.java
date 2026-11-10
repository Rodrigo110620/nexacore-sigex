package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.SolicitudAyudaRequest;
import com.nexacore.examenes.dto.SolicitudAyudaResponse;
import com.nexacore.examenes.models.Notificacion;
import com.nexacore.examenes.models.SolicitudAyuda;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.SolicitudAyudaRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Mesa de ayuda: cualquiera (también sin sesión, desde el login) envía una consulta; le llega al ADMIN como
 * notificación y la atiende desde su bandeja. La respuesta, si la escribe, se envía por correo.
 */
@Service
public class MesaAyudaService {

    static final Map<String, String> TIPOS = Map.of(
            "CUENTA", "No tengo cuenta / no puedo entrar", "CONTRASENA", "Olvidé mi contraseña",
            "ACTIVACION", "Activar mi cuenta de estudiante", "QR", "Mi código QR", "FOTO", "Mi foto",
            "EXAMEN", "Un examen", "OTRO", "Otro");

    private final SolicitudAyudaRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;
    private final EmailService emailService;
    private final AuditoriaService auditoriaService;

    public MesaAyudaService(SolicitudAyudaRepository repository, UsuarioRepository usuarioRepository,
                            NotificacionService notificacionService, EmailService emailService,
                            AuditoriaService auditoriaService) {
        this.repository = repository;
        this.usuarioRepository = usuarioRepository;
        this.notificacionService = notificacionService;
        this.emailService = emailService;
        this.auditoriaService = auditoriaService;
    }

    /** Guarda la consulta y avisa al ADMIN. Con sesión, queda quién la envió (usuario y rol). */
    @Transactional
    public void crear(SolicitudAyudaRequest request, Authentication authentication) {
        if (request.sitio() != null && !request.sitio().isBlank()) {
            return; // Trampa para bots: se descarta sin avisar.
        }
        boolean conSesion = authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal());
        SolicitudAyuda s = new SolicitudAyuda();
        s.setNombre(request.nombre().strip());
        s.setCorreo(request.correo().strip().toLowerCase());
        s.setTipo(request.tipo());
        s.setMensaje(request.mensaje().strip());
        s.setOrigen(conSesion ? "PANEL" : "LOGIN");
        if (conSesion) {
            s.setIdUsuario(usuarioRepository.findByEmail(authentication.getName()).map(Usuario::getId).orElse(null));
            s.setRol(authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                    .filter(a -> a.startsWith("ROLE_")).map(a -> a.substring(5)).sorted().collect(Collectors.joining(", ")));
        }
        s.setEstado(SolicitudAyuda.PENDIENTE);
        s.setCreadaEn(LocalDateTime.now());
        repository.save(s);
        notificacionService.publicar(Notificacion.AYUDA, "Nueva consulta en la mesa de ayuda",
                TIPOS.getOrDefault(s.getTipo(), s.getTipo()) + " · " + s.getNombre(), null, null,
                "/dashboard/mesa-ayuda", conSesion ? authentication.getName() : "");
        notificacionService.emitirCambio("AYUDA", null, null);
        avisarPorCorreo(s);
    }

    /**
     * Correo a cada ADMIN activo. Se envía cuando la consulta ya quedó guardada (si falla, no avisa) y en segundo
     * plano: quien consulta no espera al servidor de correo.
     */
    private void avisarPorCorreo(SolicitudAyuda s) {
        List<Usuario> admins = usuarioRepository.adminsActivos();
        if (admins.isEmpty()) return;
        String tema = TIPOS.getOrDefault(s.getTipo(), s.getTipo());
        Runnable enviar = () -> CompletableFuture.runAsync(() -> admins.forEach(a -> emailService.enviarAvisoAyudaAdmin(
                a.getEmail(), a.getNombre(), s.getNombre(), s.getCorreo(), tema, s.getMensaje())));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    enviar.run();
                }
            });
        } else {
            enviar.run();
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<SolicitudAyudaResponse> listar(String estado, int page, int size) {
        PageRequest pagina = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)));
        Page<SolicitudAyuda> r = estado == null || estado.isBlank()
                ? repository.findAllByOrderByCreadaEnDesc(pagina)
                : repository.findByEstadoOrderByCreadaEnDesc(estado.toUpperCase(), pagina);
        return new PageResponse<>(r.getContent().stream().map(this::respuesta).toList(),
                r.getNumber(), r.getSize(), r.getTotalElements(), r.getTotalPages());
    }

    @Transactional(readOnly = true)
    public long pendientes() {
        return repository.countByEstado(SolicitudAyuda.PENDIENTE);
    }

    /** La marca como atendida; con respuesta, se la envía por correo a quien escribió. */
    @Transactional
    public SolicitudAyudaResponse atender(Integer id, String respuesta) {
        SolicitudAyuda s = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La consulta no existe"));
        if (SolicitudAyuda.ATENDIDA.equals(s.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La consulta ya fue atendida");
        }
        String texto = respuesta == null || respuesta.isBlank() ? null : respuesta.strip();
        s.setEstado(SolicitudAyuda.ATENDIDA);
        s.setRespuesta(texto);
        s.setIdAtendidaPor(usuarioRepository.findByEmail(SesionActual.email()).map(Usuario::getId).orElse(null));
        s.setAtendidaEn(LocalDateTime.now());
        repository.save(s);
        if (texto != null) {
            emailService.enviarRespuestaAyuda(s.getCorreo(), s.getNombre(), s.getMensaje(), texto);
        }
        auditoriaService.registrar("AYUDA_ATENDIDA", AuditoriaService.datos("nombre", s.getNombre(), "correo", s.getCorreo(),
                "tipo", TIPOS.getOrDefault(s.getTipo(), s.getTipo()), "respuesta", texto));
        notificacionService.emitirCambio("AYUDA", null, null);
        return respuesta(s);
    }

    private SolicitudAyudaResponse respuesta(SolicitudAyuda s) {
        String atendidaPor = s.getIdAtendidaPor() == null ? null : usuarioRepository.findById(s.getIdAtendidaPor())
                .map(u -> u.getNombre() + " " + u.getApellidos()).orElse(null);
        return new SolicitudAyudaResponse(s.getId(), s.getNombre(), s.getCorreo(), s.getTipo(), s.getMensaje(),
                s.getOrigen(), s.getRol(), s.getEstado(), s.getCreadaEn(), s.getRespuesta(), atendidaPor, s.getAtendidaEn());
    }
}
