package com.nexacore.examenes;

import com.nexacore.examenes.repositories.UsuarioRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifica que el contexto de Spring Boot levanta correctamente.
 * Usa el perfil {@code test} (H2 en memoria) para no depender de PostgreSQL en CI.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ExamenesApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Test
    void contextLoads() {
        Assertions.assertNotNull(passwordEncoder);
        Assertions.assertNotNull(usuarioRepository);
        Assertions.assertTrue(passwordEncoder.matches("secret", passwordEncoder.encode("secret")));
    }

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(status().isOk());
    }

    @Test
    void loginPathIsNotRejectedBySecurity() throws Exception {
        mockMvc.perform(post("/auth/login"))
            .andExpect(result -> Assertions.assertNotEquals(
                HttpStatus.UNAUTHORIZED.value(),
                result.getResponse().getStatus()));
    }

    @Test
    void otherRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/private"))
            .andExpect(status().isForbidden());
    }
}
