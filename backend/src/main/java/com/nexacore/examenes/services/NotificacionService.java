package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.NotificacionResponse;
import com.nexacore.examenes.models.Notificacion;
import com.nexacore.examenes.models.NotificacionLeida;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.NotificacionLeidaRepository;
import com.nexacore.examenes.repositories.NotificacionRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Todo lo que llega en vivo (SSE) a la app.
 * <ul>
 *   <li><b>notificacion</b>: reportes del control de ingreso, guardados para la campana. Los reciben
 *       todos los ADMIN, todo el personal de CONTROL y el DOCENTE del examen; nunca quien reportó.
 *       Un reporte sin examen no llega a los docentes.</li>
 *   <li><b>cambio</b>: aviso liviano, no guardado, de que algo cambió (un ingreso, la habilitación,
 *       un examen, una foto) para que las pantallas abiertas recarguen sus datos. El estudiante solo
 *       recibe los suyos o los de sus exámenes.</li>
 * </ul>
 */
@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);
    static final int MAXIMO_LISTADO = 30;
    /** Comentario periódico para que los proxies (nginx, Traefik) no corten la conexión abierta. */
    private static final long SEGUNDOS_LATIDO = 25;

    private final NotificacionRepository notificacionRepository;
    private final NotificacionLeidaRepository leidaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ExamenRepository examenRepository;
    private final AsistenciaExamenRepository asistenciaRepository;
    private final EstudianteRepository estudianteRepository;
    private final List<Suscripcion> suscripciones = new CopyOnWriteArrayList<>();
    private final ScheduledExecutorService latido = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "notificaciones-latido");
        t.setDaemon(true);
        return t;
    });

    /** Tipos de cambio que recargan las pantallas abiertas. */
    public static final String CAMBIO_INGRESO = "INGRESO";
    public static final String CAMBIO_HABILITACION = "HABILITACION";
    public static final String CAMBIO_EXAMEN = "EXAMEN";
    public static final String CAMBIO_FOTO = "FOTO";

    /** Evento "cambio": qué cambió y de qué examen o estudiante (null si es general). */
    public record Cambio(String tipo, Integer idExamen, Integer idEstudiante) {}

    /**
     * Conexión en vivo abierta. Personal: idEstudiante null. Estudiante: su id, y no recibe
     * notificaciones del personal.
     */
    private record Suscripcion(SseEmitter emitter, Integer idUsuario, boolean veTodo, Integer idEstudiante) {
        boolean esEstudiante() {
            return idEstudiante != null;
        }
    }

    public NotificacionService(NotificacionRepository notificacionRepository,
                               NotificacionLeidaRepository leidaRepository,
                               UsuarioRepository usuarioRepository,
                               ExamenRepository examenRepository,
                               AsistenciaExamenRepository asistenciaRepository,
                               EstudianteRepository estudianteRepository) {
        this.notificacionRepository = notificacionRepository;
        this.leidaRepository = leidaRepository;
        this.usuarioRepository = usuarioRepository;
        this.examenRepository = examenRepository;
        this.asistenciaRepository = asistenciaRepository;
        this.estudianteRepository = estudianteRepository;
        latido.scheduleAtFixedRate(this::enviarLatido, SEGUNDOS_LATIDO, SEGUNDOS_LATIDO, TimeUnit.SECONDS);
    }

    @PreDestroy
    void cerrar() {
        latido.shutdownNow();
        suscripciones.forEach(s -> s.emitter().complete());
    }

    /**
     * Guarda la notificación y, cuando la transacción del reporte se confirma, la envía en vivo.
     * Si el reporte falla y se revierte, no se avisa nada.
     *
     * @param idExamen  examen del reporte; null si no es de un examen (solo ADMIN y CONTROL la ven)
     * @param emailAutor quien reporta: no recibe su propia notificación
     */
    @Transactional
    public void publicar(String tipo, String titulo, String detalle, Integer idExamen, Integer idEstudiante,
                         String enlace, String emailAutor) {
        Integer idAutor = usuarioRepository.findByEmail(emailAutor).map(Usuario::getId).orElse(null);
        Notificacion n = new Notificacion();
        n.setTipo(tipo);
        n.setTitulo(recortar(titulo, 200));
        n.setDetalle(detalle == null ? null : recortar(detalle, 500));
        n.setIdExamen(idExamen);
        n.setIdEstudiante(idEstudiante);
        n.setEnlace(enlace);
        n.setIdAutor(idAutor);
        n.setCreadaEn(LocalDateTime.now());
        notificacionRepository.save(n);
        if (idAutor != null) {
            marcar(n.getId(), idAutor);
        }
        alConfirmar(() -> difundir(n));
    }

    /**
     * Avisa en vivo que algo cambió, cuando la transacción se confirma (si falla, no avisa). No se
     * guarda: solo sirve para que las pantallas abiertas recarguen.
     */
    public void emitirCambio(String tipo, Integer idExamen, Integer idEstudiante) {
        Cambio cambio = new Cambio(tipo, idExamen, idEstudiante);
        alConfirmar(() -> difundirCambio(cambio));
    }

    private static void alConfirmar(Runnable accion) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    accion.run();
                }
            });
        } else {
            accion.run();
        }
    }

    /** "Materia" del examen para los textos; vacío si no se encuentra. */
    @Transactional(readOnly = true)
    public String materia(Integer idExamen) {
        return idExamen == null ? "" : examenRepository.nombreMateria(idExamen).stream().findFirst().orElse("");
    }

    @Transactional(readOnly = true)
    public List<NotificacionResponse> listar(Authentication authentication) {
        Usuario usuario = usuario(authentication);
        PageRequest pagina = PageRequest.of(0, MAXIMO_LISTADO);
        List<Notificacion> lista = veTodo(authentication)
                ? notificacionRepository.findAllByOrderByIdDesc(pagina)
                : notificacionRepository.deDocente(usuario.getId(), pagina);
        if (lista.isEmpty()) {
            return List.of();
        }
        Set<Integer> leidas = leidaRepository.leidasDe(usuario.getId(), lista.stream().map(Notificacion::getId).toList());
        return lista.stream().map(n -> respuesta(n, leidas.contains(n.getId()))).toList();
    }

    @Transactional
    public void marcarLeida(Integer idNotificacion, Authentication authentication) {
        Usuario usuario = usuario(authentication);
        Notificacion n = notificacionRepository.findById(idNotificacion)
                .orElseThrow(() -> new IllegalArgumentException("No se encontró la notificación."));
        if (!puedeVer(n, usuario.getId(), veTodo(authentication))) {
            throw new AccessDeniedException("La notificación no es de tus exámenes.");
        }
        marcar(n.getId(), usuario.getId());
    }

    /** Marca como leídas todas las que el usuario ve en su lista. */
    @Transactional
    public void marcarTodasLeidas(Authentication authentication) {
        Integer idUsuario = usuario(authentication).getId();
        listar(authentication).stream().filter(n -> !n.leida()).forEach(n -> marcar(n.id(), idUsuario));
    }

    /** Abre la conexión en vivo. Sin límite de tiempo: el latido la mantiene y el cliente reconecta. */
    public SseEmitter suscribir(Authentication authentication) {
        Usuario usuario = usuario(authentication);
        return abrir(new Suscripcion(new SseEmitter(0L), usuario.getId(), veTodo(authentication), null));
    }

    /** Conexión en vivo del estudiante: solo recibe los cambios suyos o de sus exámenes. */
    public SseEmitter suscribirEstudiante(Authentication authentication) {
        Usuario usuario = usuario(authentication);
        Integer idEstudiante = estudianteRepository.findByIdUsuario(usuario.getId())
                .orElseThrow(() -> new AccessDeniedException("Esta cuenta no pertenece a un estudiante."))
                .getId();
        return abrir(new Suscripcion(new SseEmitter(0L), usuario.getId(), false, idEstudiante));
    }

    private SseEmitter abrir(Suscripcion s) {
        SseEmitter emitter = s.emitter();
        suscripciones.add(s);
        emitter.onCompletion(() -> suscripciones.remove(s));
        emitter.onTimeout(() -> suscripciones.remove(s));
        emitter.onError(e -> suscripciones.remove(s));
        try {
            emitter.send(SseEmitter.event().name("conectado").data("ok"));
        } catch (IOException e) {
            suscripciones.remove(s);
        }
        return emitter;
    }

    private void difundir(Notificacion n) {
        Set<Integer> docentesDelExamen = new HashSet<>();
        for (Suscripcion s : suscripciones) {
            if (s.esEstudiante() || s.idUsuario().equals(n.getIdAutor())) {
                continue;
            }
            boolean recibe = s.veTodo() || (n.getIdExamen() != null
                    && (docentesDelExamen.contains(s.idUsuario())
                        || examenRepository.perteneceADocente(n.getIdExamen(), s.idUsuario())));
            if (!recibe) {
                continue;
            }
            if (!s.veTodo()) {
                docentesDelExamen.add(s.idUsuario());
            }
            enviar(s, SseEmitter.event().name("notificacion").id(String.valueOf(n.getId()))
                    .data(respuesta(n, false), MediaType.APPLICATION_JSON));
        }
    }

    private void difundirCambio(Cambio c) {
        for (Suscripcion s : suscripciones) {
            boolean recibe;
            if (s.esEstudiante()) {
                recibe = s.idEstudiante().equals(c.idEstudiante())
                        || (c.idEstudiante() == null && c.idExamen() != null
                            && asistenciaRepository.existsByIdIdEstudianteAndIdIdExamen(s.idEstudiante(), c.idExamen()));
            } else {
                // Un cambio general (sin examen) es para todo el personal: solo provoca una recarga.
                recibe = s.veTodo() || c.idExamen() == null
                        || examenRepository.perteneceADocente(c.idExamen(), s.idUsuario());
            }
            if (recibe) {
                // Un evento nuevo por envío: el builder no se reutiliza entre conexiones.
                enviar(s, SseEmitter.event().name("cambio").data(c, MediaType.APPLICATION_JSON));
            }
        }
    }

    private void enviarLatido() {
        for (Suscripcion s : suscripciones) {
            enviar(s, SseEmitter.event().comment("latido"));
        }
    }

    private void enviar(Suscripcion s, SseEmitter.SseEventBuilder evento) {
        try {
            s.emitter().send(evento);
        } catch (IOException | IllegalStateException e) {
            // El navegador cerró la pestaña o se cortó la red: se descarta y el cliente reconecta.
            suscripciones.remove(s);
            log.debug("Conexión de notificaciones cerrada (usuario {}): {}", s.idUsuario(), e.getMessage());
        }
    }

    private boolean puedeVer(Notificacion n, Integer idUsuario, boolean veTodo) {
        return veTodo || (n.getIdExamen() != null && examenRepository.perteneceADocente(n.getIdExamen(), idUsuario));
    }

    private void marcar(Integer idNotificacion, Integer idUsuario) {
        NotificacionLeida.Id id = new NotificacionLeida.Id();
        id.setIdNotificacion(idNotificacion);
        id.setIdUsuario(idUsuario);
        if (!leidaRepository.existsById(id)) {
            NotificacionLeida leida = new NotificacionLeida();
            leida.setId(id);
            leida.setLeidaEn(LocalDateTime.now());
            leidaRepository.save(leida);
        }
    }

    private Usuario usuario(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Sesión no válida"));
    }

    /** ADMIN y CONTROL ven todos los reportes; el DOCENTE solo los de sus exámenes. */
    private static boolean veTodo(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_CONTROL".equals(a.getAuthority()));
    }

    private static NotificacionResponse respuesta(Notificacion n, boolean leida) {
        return new NotificacionResponse(n.getId(), n.getTipo(), n.getTitulo(), n.getDetalle(), n.getIdExamen(),
                n.getIdEstudiante(), n.getEnlace(), n.getCreadaEn(), leida);
    }

    private static String recortar(String texto, int maximo) {
        return texto.length() <= maximo ? texto : texto.substring(0, maximo - 1) + "…";
    }
}
