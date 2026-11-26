package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.SesionResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.SesionUsuario;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.SesionUsuarioRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Sesiones por dispositivo (V62). Cada inicio de sesión crea una; si la cuenta ya estaba abierta en otro lado, el
 * usuario recibe un aviso con el navegador y el dispositivo. Desde «Mi perfil» ve sus sesiones y puede cerrar las
 * demás; al cambiar la contraseña se cierran solas. El control de ingreso guarda la sesión de cada registro.
 */
@Service
public class SesionService {

    public static final String TIPO_AVISO = "SESION_NUEVA";
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final SesionUsuarioRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;
    private final AuditoriaService auditoriaService;
    private final long duracionMs;

    public SesionService(SesionUsuarioRepository repository, UsuarioRepository usuarioRepository,
                         NotificacionService notificacionService, AuditoriaService auditoriaService,
                         @Value("${app.security.jwt.expiration-ms:28800000}") long duracionMs) {
        this.repository = repository;
        this.usuarioRepository = usuarioRepository;
        this.notificacionService = notificacionService;
        this.auditoriaService = auditoriaService;
        this.duracionMs = duracionMs;
    }

    /** Crea la sesión del inicio de sesión y avisa si la cuenta ya estaba abierta en otro dispositivo. */
    @Transactional
    public String iniciar(Usuario usuario) {
        HttpServletRequest request = peticion().orElse(null);
        String dispositivo = describir(request == null ? null : request.getHeader("User-Agent"));
        LocalDateTime ahora = LocalDateTime.now();
        List<SesionUsuario> otras = repository.abiertas(usuario.getId(), vigentesDesde(ahora));

        SesionUsuario sesion = new SesionUsuario();
        sesion.setId(UUID.randomUUID().toString());
        sesion.setIdUsuario(usuario.getId());
        sesion.setDispositivo(dispositivo);
        sesion.setIp(request == null ? null : ip(request));
        sesion.setIniciadaEn(ahora);
        sesion.setUltimaActividad(ahora);
        repository.save(sesion);
        auditoriaService.registrarComo(usuario.getId(), "SESION_INICIADA", AuditoriaService.datos(
                "dispositivo", dispositivo, "ip", sesion.getIp(),
                "otrasSesiones", otras.isEmpty() ? null : otras.stream().map(SesionUsuario::getDispositivo).distinct().toList()));

        if (!otras.isEmpty()) {
            String detalle = "Se inició sesión en " + dispositivo + " a las " + ahora.format(HORA) + ". Tu cuenta sigue abierta en: "
                    + String.join(", ", otras.stream().map(SesionUsuario::getDispositivo).distinct().toList())
                    + ". Si no fuiste tú, cierra las demás sesiones desde Mi perfil y cambia tu contraseña.";
            notificacionService.publicarPara(usuario.getId(), TIPO_AVISO, "Tu cuenta se abrió en otro dispositivo",
                    detalle, usuarioRepository.findNombresDeRol(usuario.getEmail()).contains("ESTUDIANTE")
                            ? "/estudiante/perfil" : "/dashboard/perfil");
        }
        return sesion.getId();
    }

    /** true si la sesión sigue abierta; además registra su actividad (como mucho una vez por minuto). */
    @Transactional
    public boolean validarYRegistrarActividad(String idSesion) {
        if (!repository.estaAbierta(idSesion)) return false;
        LocalDateTime ahora = LocalDateTime.now();
        repository.registrarActividad(idSesion, ahora, ahora.minusMinutes(1));
        return true;
    }

    /** Las sesiones abiertas del usuario de la sesión, con cuál es la actual. */
    @Transactional(readOnly = true)
    public List<SesionResponse> misSesiones() {
        Integer yo = usuarioActual();
        String actual = SesionActual.idSesion();
        return repository.abiertas(yo, vigentesDesde(LocalDateTime.now())).stream()
                .map(s -> new SesionResponse(s.getId(), s.getDispositivo(), s.getIp(), s.getIniciadaEn(),
                        s.getUltimaActividad(), s.getId().equals(actual)))
                .toList();
    }

    @Transactional
    public void cerrar(String idSesion) {
        Integer yo = usuarioActual();
        SesionUsuario sesion = repository.findById(idSesion)
                .filter(s -> s.getIdUsuario().equals(yo))
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "La sesión no existe."));
        if (sesion.getCerradaEn() == null) {
            sesion.setCerradaEn(LocalDateTime.now());
            sesion.setMotivoCierre(idSesion.equals(SesionActual.idSesion()) ? "CERRO_SESION" : "CERRADA_POR_USUARIO");
            repository.save(sesion);
            notificacionService.cortarConexiones(yo, idSesion, null);
            boolean propia = idSesion.equals(SesionActual.idSesion());
            auditoriaService.registrar("SESION_CERRADA", AuditoriaService.datos(
                    "sesionCerrada", sesion.getDispositivo(), "propia", propia, "ip", sesion.getIp()));
        }
    }

    /** Cierra todas las sesiones del usuario menos la actual; devuelve cuántas cerró. */
    @Transactional
    public int cerrarOtras() {
        Integer yo = usuarioActual();
        int cerradas = repository.cerrarDelUsuario(yo, SesionActual.idSesion(), "CERRADA_POR_USUARIO", LocalDateTime.now());
        notificacionService.cortarConexiones(yo, null, SesionActual.idSesion());
        if (cerradas > 0) auditoriaService.registrar("SESIONES_CERRADAS", AuditoriaService.datos("cantidad", cerradas));
        return cerradas;
    }

    /** Al cambiar la contraseña: se cierran las demás sesiones (la actual sigue). */
    @Transactional
    public void cerrarOtrasDe(Integer idUsuario, String motivo) {
        repository.cerrarDelUsuario(idUsuario, SesionActual.idSesion(), motivo, LocalDateTime.now());
        notificacionService.cortarConexiones(idUsuario, null, SesionActual.idSesion());
    }

    /** Al restablecer la contraseña por correo: se cierran todas. */
    @Transactional
    public void cerrarTodasDe(Integer idUsuario, String motivo) {
        repository.cerrarDelUsuario(idUsuario, null, motivo, LocalDateTime.now());
        notificacionService.cortarConexiones(idUsuario, null, null);
    }

    /** Dispositivo de la sesión actual, para guardarlo con los registros del control. */
    @Transactional(readOnly = true)
    public String dispositivoActual() {
        String id = SesionActual.idSesion();
        return id == null ? null : repository.findById(id).map(SesionUsuario::getDispositivo).orElse(null);
    }

    /** «Chrome en Android», «Firefox en Windows»… a partir del User-Agent. */
    public static String describir(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "Dispositivo desconocido";
        String ua = userAgent.toLowerCase(Locale.ROOT);
        String navegador;
        if (ua.contains("edg/") || ua.contains("edga/") || ua.contains("edgios/")) navegador = "Edge";
        else if (ua.contains("opr/") || ua.contains("opera")) navegador = "Opera";
        else if (ua.contains("samsungbrowser")) navegador = "Samsung Internet";
        else if (ua.contains("firefox/") || ua.contains("fxios/")) navegador = "Firefox";
        else if (ua.contains("chrome/") || ua.contains("crios/")) navegador = "Chrome";
        else if (ua.contains("safari/")) navegador = "Safari";
        else navegador = "Navegador";
        String sistema;
        if (ua.contains("android")) sistema = "Android";
        else if (ua.contains("iphone")) sistema = "iPhone";
        else if (ua.contains("ipad")) sistema = "iPad";
        else if (ua.contains("windows")) sistema = "Windows";
        else if (ua.contains("mac os") || ua.contains("macintosh")) sistema = "Mac";
        else if (ua.contains("cros")) sistema = "Chromebook";
        else if (ua.contains("linux")) sistema = "Linux";
        else sistema = null;
        return sistema == null ? navegador : navegador + " en " + sistema;
    }

    private LocalDateTime vigentesDesde(LocalDateTime ahora) {
        return ahora.minusNanos(duracionMs * 1_000_000L);
    }

    private Integer usuarioActual() {
        return usuarioRepository.findByEmail(SesionActual.email()).map(Usuario::getId)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
    }

    private static Optional<HttpServletRequest> peticion() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes a
                ? Optional.of(a.getRequest()) : Optional.empty();
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
        return ip == null ? null : ip.length() > 64 ? ip.substring(0, 64) : ip;
    }
}
