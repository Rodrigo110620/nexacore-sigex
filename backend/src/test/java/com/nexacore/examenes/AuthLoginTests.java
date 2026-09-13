package com.nexacore.examenes;

import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import com.nexacore.examenes.security.JwtService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de las tareas B3 (JwtService y AuthService) y B4 (POST /auth/login).
 *
 * Cubre los criterios de aceptacion de la HU AUTH-02:
 *   - Login correcto devuelve token, nombre y roles.
 *   - Credenciales incorrectas devuelven 401.
 *   - Cuenta inactiva devuelve 401 con mensaje distinto.
 *   - Datos invalidos devuelven 400 indicando los campos.
 *   - El JWT contiene el email y los roles del usuario.
 *
 * Usa el perfil "test" (H2 en memoria, Flyway desactivado), por eso el
 * usuario de prueba se crea aqui y no depende del seed V3.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class AuthLoginTests {

    private static final String EMAIL = "marcelo.b34@umss.edu.bo";
    private static final String PASSWORD = "Admin123*";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private Usuario usuario;

    /**
     * Crea un usuario activo con rol ADMIN y contrasena cifrada con BCrypt.
     * El flush + clear obliga a Hibernate a releer el usuario desde la base,
     * para que la coleccion perezosa usuarioRoles incluya el rol recien creado.
     */
    @BeforeEach
    void prepararUsuario() {
        Rol rol = new Rol();
        rol.setNombre("ADMIN");
        entityManager.persist(rol);

        usuario = new Usuario();
        usuario.setNombre("Marcelo");
        usuario.setApellidos("Vallejos");
        usuario.setCi("TEST-B34-001");
        usuario.setEmail(EMAIL);
        usuario.setPassword(passwordEncoder.encode(PASSWORD));
        usuario.setEstado("activo");
        entityManager.persist(usuario);
        entityManager.flush();

        UsuarioRolId id = new UsuarioRolId();
        id.setIdUsuario(usuario.getId());
        id.setIdRol(rol.getId());

        UsuarioRol usuarioRol = new UsuarioRol();
        usuarioRol.setId(id);
        usuarioRol.setIdUsuario(usuario);
        usuarioRol.setIdRol(rol);
        entityManager.persist(usuarioRol);

        entityManager.flush();
        entityManager.clear();
    }

    private String cuerpoLogin(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    @DisplayName("B4: login correcto devuelve 200 con token, nombre y roles")
    void loginCorrectoDevuelveToken() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoLogin(EMAIL, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.nombre").value("Marcelo Vallejos"))
                .andExpect(jsonPath("$.roles[0]").value("ADMIN"));
    }

    @Test
    @DisplayName("B4: contrasena incorrecta devuelve 401")
    void passwordIncorrectaDevuelve401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoLogin(EMAIL, "claveEquivocada")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.estado").value(401))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("B4: email inexistente devuelve 401")
    void emailInexistenteDevuelve401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoLogin("no.existe@umss.edu.bo", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.estado").value(401));
    }

    @Test
    @DisplayName("B4: cuenta inactiva devuelve 401 aunque la contrasena sea correcta")
    void usuarioInactivoDevuelve401() throws Exception {
        Usuario inactivo = entityManager.find(Usuario.class, usuario.getId());
        inactivo.setEstado("inactivo");
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoLogin(EMAIL, PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.estado").value(401))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("B4: datos invalidos devuelven 400 indicando los campos")
    void datosInvalidosDevuelven400() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoLogin("correo-sin-formato", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.errores.email").isNotEmpty())
                .andExpect(jsonPath("$.errores.password").isNotEmpty());
    }

    @Test
    @DisplayName("B3: el JWT generado es valido y contiene el email y los roles")
    void tokenContieneEmailYRoles() {
        String token = jwtService.generarToken(EMAIL, List.of("ADMIN"));

        Assertions.assertTrue(jwtService.esValido(token));
        Assertions.assertEquals(EMAIL, jwtService.extraerEmail(token));
        Assertions.assertEquals(List.of("ADMIN"), jwtService.extraerRoles(token));
    }

    @Test
    @DisplayName("B3: un token manipulado se rechaza")
    void tokenManipuladoNoEsValido() {
        String token = jwtService.generarToken(EMAIL, List.of("ADMIN"));

        Assertions.assertFalse(jwtService.esValido(token + "x"));
        Assertions.assertFalse(jwtService.esValido("token.no.valido"));
    }
}
