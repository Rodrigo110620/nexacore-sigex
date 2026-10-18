package com.nexacore.examenes.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;

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

    public AuditoriaService(UsuarioRepository usuarioRepository, ObjectMapper objectMapper) {
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
    }

    /** Sin usuario en la sesión (tareas internas) no se registra nada. */
    public void registrar(String accion, Map<String, Object> detalles) {
        String email = SesionActual.email();
        if (email == null) {
            return;
        }
        Integer idUsuario = usuarioRepository.findByEmail(email).map(Usuario::getId).orElse(null);
        if (idUsuario == null) {
            return;
        }
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
    }
}
