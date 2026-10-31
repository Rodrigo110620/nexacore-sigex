package com.nexacore.examenes;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.AuditoriaService;
import com.nexacore.examenes.services.EmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La descarga del respaldo registra la auditoría fuera de una transacción: antes fallaba con
 * TransactionRequiredException y la descarga respondía 500. Sin @Transactional en la clase, a propósito.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class AuditoriaSinTransaccionTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15.10");

    @DynamicPropertySource
    static void baseDeDatos(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.locations", () -> "classpath:db/migration");
    }

    @Autowired AuditoriaService auditoriaService;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean EmailService emailService;

    @AfterEach
    void limpiarSesion() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void registraLaOperacionAunqueNoHayaUnaTransaccionAbierta() {
        Usuario admin = new Usuario();
        admin.setNombre("Admin");
        admin.setApellidos("Respaldo");
        admin.setCi("7489214");
        admin.setEmail("respaldo.admin@sigex.test");
        admin.setPassword("hash");
        admin.setEstado("activo");
        usuarioRepository.saveAndFlush(admin);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                admin.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        auditoriaService.registrar("RESPALDO_DESCARGADO", Map.of("archivo", "sigex-respaldo.sql"));

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM auditoria_operacion WHERE accion = 'RESPALDO_DESCARGADO'", Integer.class)).isEqualTo(1);
    }
}
