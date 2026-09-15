package com.nexacore.examenes;

import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de la tarea B1: GET /usuarios paginado (solo ADMIN).
 *
 * Cubre el checklist de B1:
 *   - Estructura de PageResponse (contenido, pagina, tamano, totales).
 *   - El password nunca aparece en la respuesta.
 *   - Paginacion con size por defecto 10 y ajuste de valores fuera de rango.
 *   - Orden por nombre ascendente.
 *   - Rol como texto, o "SIN_ROL" si el usuario no tiene ninguno.
 *   - 401 sin autenticacion y 403 con un rol distinto de ADMIN.
 *
 * A proposito esta clase NO es @Transactional y desactiva open-in-view:
 * si el test abriera su propia transaccion, o si OSIV mantuviera la sesion
 * abierta durante la peticion, la coleccion LAZY usuarioRoles se cargaria
 * igual aunque UsuarioService.listar() perdiera su @Transactional, y el
 * LazyInitializationException quedaria oculto. Por eso los datos se
 * confirman con TransactionTemplate y se borran a mano en cada test.
 */
@SpringBootTest(properties = "spring.jpa.open-in-view=false")
@ActiveProfiles("test")
@AutoConfigureMockMvc
class UsuarioListadoTests {

    private static final String HASH_PASSWORD = "$2a$10$hashDePruebaQueNoDebeAparecerEnElJson";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transaction;

    /**
     * Inserta 6 usuarios en orden desordenado a proposito:
     * Zoe, Ana, Marco, Bruno, Diego, Carla. Bruno queda sin rol.
     *
     * Antes limpia las tablas, porque otras clases de test que comparten
     * el mismo contexto (y la misma H2) pueden haber confirmado usuarios.
     */
    @BeforeEach
    void prepararUsuarios() {
        transaction = new TransactionTemplate(transactionManager);
        limpiarTablas();

        transaction.executeWithoutResult(estado -> {
            Map<String, Rol> roles = new HashMap<>();
            for (String nombre : new String[]{"ADMIN", "DOCENTE", "CONTROL"}) {
                Rol rol = new Rol();
                rol.setNombre(nombre);
                entityManager.persist(rol);
                roles.put(nombre, rol);
            }

            crearUsuario("Zoe", roles.get("DOCENTE"));
            crearUsuario("Ana", roles.get("ADMIN"));
            crearUsuario("Marco", roles.get("CONTROL"));
            crearUsuario("Bruno", null);
            crearUsuario("Diego", roles.get("CONTROL"));
            crearUsuario("Carla", roles.get("DOCENTE"));
        });
    }

    @AfterEach
    void borrarUsuarios() {
        limpiarTablas();
    }

    private void limpiarTablas() {
        transaction.executeWithoutResult(estado -> {
            entityManager.createQuery("DELETE FROM UsuarioRol").executeUpdate();
            entityManager.createQuery("DELETE FROM Usuario").executeUpdate();
            entityManager.createQuery("DELETE FROM Rol").executeUpdate();
        });
    }

    /** Crea un usuario activo y, si se indica, le asigna el rol. */
    private void crearUsuario(String nombre, Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre(nombre);
        usuario.setApellidos("Prueba");
        usuario.setCi("TEST-B1-" + nombre.toUpperCase());
        usuario.setEmail(nombre.toLowerCase() + ".b1@umss.edu.bo");
        usuario.setPassword(HASH_PASSWORD);
        usuario.setEstado("activo");
        entityManager.persist(usuario);
        entityManager.flush();

        if (rol == null) {
            return;
        }

        UsuarioRolId id = new UsuarioRolId();
        id.setIdUsuario(usuario.getId());
        id.setIdRol(rol.getId());

        UsuarioRol usuarioRol = new UsuarioRol();
        usuarioRol.setId(id);
        usuarioRol.setIdUsuario(usuario);
        usuarioRol.setIdRol(rol);
        entityManager.persist(usuarioRol);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B1: devuelve la pagina con contenido, pagina, tamano y totales (size por defecto 10)")
    void devuelveEstructuraDePagina() throws Exception {
        mockMvc.perform(get("/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido", hasSize(6)))
                .andExpect(jsonPath("$.contenido[0].id").isNumber())
                .andExpect(jsonPath("$.contenido[0].nombre").value("Ana"))
                .andExpect(jsonPath("$.contenido[0].apellidos").value("Prueba"))
                .andExpect(jsonPath("$.contenido[0].email").value("ana.b1@umss.edu.bo"))
                .andExpect(jsonPath("$.contenido[0].rol").value("ADMIN"))
                .andExpect(jsonPath("$.contenido[0].estado").value("activo"))
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.tamano").value(10))
                .andExpect(jsonPath("$.totalRegistros").value(6))
                .andExpect(jsonPath("$.totalPaginas").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B1: el JSON no expone el password de ningun usuario")
    void noExponePassword() throws Exception {
        String cuerpo = mockMvc.perform(get("/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].password").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Assertions.assertFalse(cuerpo.contains("password"));
        Assertions.assertFalse(cuerpo.contains(HASH_PASSWORD));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B1: con size=4 devuelve como maximo 4 usuarios y los totales correctos")
    void paginaConSize4() throws Exception {
        mockMvc.perform(get("/usuarios").param("size", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido", hasSize(4)))
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.tamano").value(4))
                .andExpect(jsonPath("$.totalRegistros").value(6))
                .andExpect(jsonPath("$.totalPaginas").value(2));

        mockMvc.perform(get("/usuarios").param("page", "1").param("size", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido", hasSize(2)))
                .andExpect(jsonPath("$.pagina").value(1))
                .andExpect(jsonPath("$.totalRegistros").value(6))
                .andExpect(jsonPath("$.totalPaginas").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B1: valores fuera de rango se ajustan (size maximo 100, page minimo 0, size minimo 1)")
    void ajustaParametrosFueraDeRango() throws Exception {
        mockMvc.perform(get("/usuarios").param("size", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tamano").value(100))
                .andExpect(jsonPath("$.contenido", hasSize(6)))
                .andExpect(jsonPath("$.totalPaginas").value(1));

        mockMvc.perform(get("/usuarios").param("page", "-3").param("size", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.tamano").value(1))
                .andExpect(jsonPath("$.contenido", hasSize(1)))
                .andExpect(jsonPath("$.totalRegistros").value(6))
                .andExpect(jsonPath("$.totalPaginas").value(6));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B1: los usuarios vienen ordenados por nombre ascendente")
    void ordenaPorNombreAscendente() throws Exception {
        mockMvc.perform(get("/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre")
                        .value(contains("Ana", "Bruno", "Carla", "Diego", "Marco", "Zoe")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B1: cada usuario trae su rol como texto, o SIN_ROL si no tiene")
    void devuelveRolComoTexto() throws Exception {
        mockMvc.perform(get("/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].rol")
                        .value(contains("ADMIN", "SIN_ROL", "DOCENTE", "CONTROL", "CONTROL", "DOCENTE")))
                .andExpect(jsonPath("$.contenido[?(@.nombre == 'Bruno')].rol").value(contains("SIN_ROL")));
    }

    @Test
    @DisplayName("B1: sin autenticacion devuelve 401")
    void sinAutenticacionDevuelve401() throws Exception {
        mockMvc.perform(get("/usuarios"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    @DisplayName("B1: con rol DOCENTE devuelve 403")
    void rolDocenteDevuelve403() throws Exception {
        mockMvc.perform(get("/usuarios"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.estado").value(403))
                .andExpect(jsonPath("$.contenido").doesNotExist());
    }
}
