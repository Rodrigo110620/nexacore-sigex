package com.nexacore.examenes;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.repositories.UsuarioRepository;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.lang.reflect.ParameterizedType;

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
        String encodedPassword = passwordEncoder.encode("secret");
        Assertions.assertTrue(encodedPassword.startsWith("$2"));
        Assertions.assertTrue(passwordEncoder.matches("secret", encodedPassword));
        Assertions.assertFalse(passwordEncoder.matches("incorrecta", encodedPassword));
    }

    @Test
    void usuarioDeclaraRelacionConUsuarioRol() throws NoSuchFieldException {
        OneToMany relation = Usuario.class.getDeclaredField("usuarioRoles")
            .getAnnotation(OneToMany.class);
        ManyToOne inverseRelation = UsuarioRol.class.getDeclaredField("idUsuario")
            .getAnnotation(ManyToOne.class);

        Assertions.assertNotNull(relation);
        Assertions.assertEquals("idUsuario", relation.mappedBy());
        Assertions.assertEquals(UsuarioRol.class,
            ((ParameterizedType) Usuario.class.getDeclaredField("usuarioRoles")
                .getGenericType()).getActualTypeArguments()[0]);
        Assertions.assertNotNull(inverseRelation);
    }

    @Test
    void repositoryBuscaUsuarioPorEmail() {
        Usuario usuario = new Usuario();
        usuario.setNombre("Ana");
        usuario.setApellidos("Prueba");
        usuario.setCi("TEST-B1-001");
        usuario.setEmail("ana.b1@example.test");
        usuario.setPassword("hash");
        usuario.setEstado("activo");
        usuarioRepository.saveAndFlush(usuario);

        Assertions.assertEquals(usuario.getId(), usuarioRepository.findByEmail(usuario.getEmail())
            .orElseThrow().getId());
        Assertions.assertTrue(usuarioRepository.findByEmail("no-existe@example.test").isEmpty());
    }

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(status().isOk());
    }

    @Test
    void swaggerAndOpenApiPathsArePublic() throws Exception {
        assertPublicPath(mockMvc.perform(get("/swagger-ui/index.html")).andReturn());
        assertPublicPath(mockMvc.perform(get("/v3/api-docs")).andReturn());
    }

    @Test
    void loginPathIsPublic() throws Exception {
        assertPublicPath(mockMvc.perform(post("/auth/login")).andReturn());
    }

    private void assertPublicPath(MvcResult result) {
        int status = result.getResponse().getStatus();
        Assertions.assertNotEquals(HttpStatus.UNAUTHORIZED.value(), status);
        Assertions.assertNotEquals(HttpStatus.FORBIDDEN.value(), status);
    }

    @Test
    void otherRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/private"))
            .andExpect(status().isUnauthorized());
    }
}
