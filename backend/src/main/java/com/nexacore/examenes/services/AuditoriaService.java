package com.nexacore.examenes.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Deja constancia en auditoria_operacion de quién hizo una operación, cuándo (la fecha la pone la
 * base) y con qué datos. Se usa dentro de la transacción de la operación auditada.
 */
@Service
public class AuditoriaService {

    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    /** Avisa en vivo al historial de operaciones abierto (perezoso: NotificacionService usa muchos servicios). */
    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.beans.factory.ObjectProvider<NotificacionService> notificaciones;

    /** Clave/valor para registrar(), sin los valores nulos (Map.of no los admite). */
    public static Map<String, Object> datos(Object... claveValor) {
        Map<String, Object> mapa = new java.util.LinkedHashMap<>();
        for (int i = 0; i + 1 < claveValor.length; i += 2) {
            if (claveValor[i + 1] != null) mapa.put(String.valueOf(claveValor[i]), claveValor[i + 1]);
        }
        return mapa;
    }

    public AuditoriaService(UsuarioRepository usuarioRepository, ObjectMapper objectMapper) {
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Registra a nombre de un usuario aunque no haya sesión: p. ej. el estudiante que activa su cuenta (lo hace sin
     * sesión; al terminar, su usuario ya existe).
     */
    @Transactional
    public void registrarComo(Integer idUsuario, String accion, Map<String, Object> detalles) {
        if (idUsuario == null) {
            return;
        }
        insertar(idUsuario, accion, detalles);
    }

    /**
     * Sin usuario en la sesión (tareas internas) no se registra nada. Se suma a la transacción de la
     * operación auditada; si se llama fuera de una (p. ej. la descarga del respaldo), abre la suya.
     */
    @Transactional
    public void registrar(String accion, Map<String, Object> detalles) {
        String email = SesionActual.email();
        if (email == null) {
            return;
        }
        Integer idUsuario = usuarioRepository.findByEmail(email).map(Usuario::getId).orElse(null);
        if (idUsuario == null) {
            return;
        }
        insertar(idUsuario, accion, detalles);
    }

    private void insertar(Integer idUsuario, String accion, Map<String, Object> detalles) {
        String json;
        try {
            json = objectMapper.writeValueAsString(detalles);
        } catch (JsonProcessingException e) {
            json = String.valueOf(detalles);
        }
        entityManager.createNativeQuery(
                        "INSERT INTO public.auditoria_operacion (id_usuario, accion, detalles) VALUES (:u, :a, :d)")
                .setParameter("u", idUsuario)
                .setParameter("a", accion)
                .setParameter("d", json)
                .executeUpdate();
        // El historial de operaciones abierto se actualiza solo, al confirmarse la operación.
        NotificacionService avisos = notificaciones == null ? null : notificaciones.getIfAvailable();
        if (avisos != null) avisos.emitirCambio("AUDITORIA", null, null);
    }
}
