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
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de las tareas B1 (GET /usuarios paginado, solo ADMIN)
 * y B2 (busqueda y filtros sobre ese mismo endpoint).
 *
 * Cubre el checklist de B1:
 *   - Estructura de PageResponse (contenido, pagina, tamano, totales).
 *   - El password nunca aparece en la respuesta.
 *   - Paginacion con size por defecto 10 y ajuste de valores fuera de rango.
 *   - Orden por nombre ascendente.
 *   - Rol como texto, o "SIN_ROL" si el usuario no tiene ninguno.
 *   - 401 sin autenticacion y 403 con un rol distinto de ADMIN.
 *
 * Cubre el checklist de B2:
 *   - search parcial en nombre, apellidos, email y CI, sin distinguir mayusculas.
 *   - Filtros por rol y por estado.
 *   - Filtros combinados y busqueda sin coincidencias.
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
     *
     *   nombre  apellidos      email                           ci       rol      estado
     *   Zoe     Quispe Luna    zoe.quispe@umss.edu.bo          7845123  DOCENTE  activo
     *   Ana     Rojas Vidal    ana.rojas@umss.edu.bo           6512340  ADMIN    activo
     *   Marco   Torrez Silva   marco.torrez@umss.edu.bo        9011223  CONTROL  inactivo
     *   Bruno   Flores Paz     bruno.flores@umss.edu.bo        5566778  (ninguno) activo
     *   Diego   Choque Rios    diego.choque@est.umss.edu.bo    4433221  CONTROL  activo
     *   Carla   Mendez Soliz   carla.mendez@est.umss.edu.bo    3322110  DOCENTE  inactivo
     *
     * Los textos se eligieron para que cada busqueda de B2 tenga un resultado
     * unico y conocido. Antes limpia las tablas, porque otras clases de test
     * que comparten el mismo contexto (y la misma H2) pueden haber confirmado usuarios.
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

            crearUsuario("Zoe", "Quispe Luna", "zoe.quispe@umss.edu.bo", "7845123", "activo", roles.get("DOCENTE"));
            crearUsuario("Ana", "Rojas Vidal", "ana.rojas@umss.edu.bo", "6512340", "activo", roles.get("ADMIN"));
            crearUsuario("Marco", "Torrez Silva", "marco.torrez@umss.edu.bo", "9011223", "inactivo", roles.get("CONTROL"));
            crearUsuario("Bruno", "Flores Paz", "bruno.flores@umss.edu.bo", "5566778", "activo", null);
            crearUsuario("Diego", "Choque Rios", "diego.choque@est.umss.edu.bo", "4433221", "activo", roles.get("CONTROL"));
            crearUsuario("Carla", "Mendez Soliz", "carla.mendez@est.umss.edu.bo", "3322110", "inactivo", roles.get("DOCENTE"));
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

    /** Crea un usuario y, si se indica, le asigna el rol. */
    private void crearUsuario(String nombre, String apellidos, String email, String ci, String estado, Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre(nombre);
        usuario.setApellidos(apellidos);
        usuario.setCi(ci);
        usuario.setEmail(email);
        usuario.setPassword(HASH_PASSWORD);
        usuario.setEstado(estado);
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
                .andExpect(jsonPath("$.contenido[0].apellidos").value("Rojas Vidal"))
                .andExpect(jsonPath("$.contenido[0].email").value("ana.rojas@umss.edu.bo"))
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

    // ---------------------------------------------------------------------
    // B2: busqueda y filtros
    // ---------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: search por nombre parcial devuelve solo las coincidencias")
    void buscaPorNombreParcial() throws Exception {
        mockMvc.perform(get("/usuarios").param("search", "arc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Marco")))
                .andExpect(jsonPath("$.totalRegistros").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: search por apellidos parcial")
    void buscaPorApellidosParcial() throws Exception {
        mockMvc.perform(get("/usuarios").param("search", "vida"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Ana")))
                .andExpect(jsonPath("$.totalRegistros").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: search por email parcial")
    void buscaPorEmail() throws Exception {
        mockMvc.perform(get("/usuarios").param("search", "@est.umss"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].email")
                        .value(contains("carla.mendez@est.umss.edu.bo", "diego.choque@est.umss.edu.bo")))
                .andExpect(jsonPath("$.totalRegistros").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: search por CI parcial")
    void buscaPorCi() throws Exception {
        mockMvc.perform(get("/usuarios").param("search", "4433"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Diego")))
                .andExpect(jsonPath("$.totalRegistros").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: la busqueda no distingue mayusculas de minusculas")
    void busquedaInsensibleAMayusculas() throws Exception {
        for (String texto : new String[]{"QUISPE", "quispe", "QuIsPe"}) {
            mockMvc.perform(get("/usuarios").param("search", texto))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Zoe")))
                    .andExpect(jsonPath("$.totalRegistros").value(1));
        }
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: filtro por rol ADMIN")
    void filtraPorRolAdmin() throws Exception {
        mockMvc.perform(get("/usuarios").param("rol", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Ana")))
                .andExpect(jsonPath("$.contenido[*].rol").value(contains("ADMIN")))
                .andExpect(jsonPath("$.totalRegistros").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: filtro por rol DOCENTE")
    void filtraPorRolDocente() throws Exception {
        mockMvc.perform(get("/usuarios").param("rol", "DOCENTE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Carla", "Zoe")))
                .andExpect(jsonPath("$.contenido[*].rol").value(contains("DOCENTE", "DOCENTE")))
                .andExpect(jsonPath("$.totalRegistros").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: filtro por rol CONTROL")
    void filtraPorRolControl() throws Exception {
        mockMvc.perform(get("/usuarios").param("rol", "CONTROL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Diego", "Marco")))
                .andExpect(jsonPath("$.contenido[*].rol").value(contains("CONTROL", "CONTROL")))
                .andExpect(jsonPath("$.totalRegistros").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: filtro por estado activo, con totales correctos al paginar")
    void filtraPorEstadoActivo() throws Exception {
        mockMvc.perform(get("/usuarios").param("estado", "activo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Ana", "Bruno", "Diego", "Zoe")))
                .andExpect(jsonPath("$.totalRegistros").value(4));

        mockMvc.perform(get("/usuarios").param("estado", "activo").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Ana", "Bruno")))
                .andExpect(jsonPath("$.totalRegistros").value(4))
                .andExpect(jsonPath("$.totalPaginas").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: filtro por estado inactivo")
    void filtraPorEstadoInactivo() throws Exception {
        mockMvc.perform(get("/usuarios").param("estado", "inactivo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Carla", "Marco")))
                .andExpect(jsonPath("$.contenido[*].estado").value(contains("inactivo", "inactivo")))
                .andExpect(jsonPath("$.totalRegistros").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: dos filtros combinados se aplican a la vez")
    void combinaDosFiltros() throws Exception {
        // DOCENTE hay dos (Carla y Zoe), pero solo Zoe esta activa
        mockMvc.perform(get("/usuarios").param("rol", "DOCENTE").param("estado", "activo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Zoe")))
                .andExpect(jsonPath("$.totalRegistros").value(1));

        // "@est.umss" encuentra a Carla y Diego, pero solo Diego es CONTROL
        mockMvc.perform(get("/usuarios").param("search", "@est.umss").param("rol", "CONTROL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Diego")))
                .andExpect(jsonPath("$.totalRegistros").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: los tres filtros combinados se aplican a la vez")
    void combinaTresFiltros() throws Exception {
        // "@umss.edu" deja fuera a Diego y Carla; CONTROL deja solo a Marco, que es inactivo
        mockMvc.perform(get("/usuarios")
                        .param("search", "@umss.edu")
                        .param("rol", "CONTROL")
                        .param("estado", "inactivo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[*].nombre").value(contains("Marco")))
                .andExpect(jsonPath("$.totalRegistros").value(1));

        // Cambiando solo el estado ya no queda nadie: el estado tambien se aplica
        mockMvc.perform(get("/usuarios")
                        .param("search", "@umss.edu")
                        .param("rol", "CONTROL")
                        .param("estado", "activo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido", hasSize(0)))
                .andExpect(jsonPath("$.totalRegistros").value(0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: busqueda sin coincidencias devuelve lista vacia y totalRegistros 0")
    void busquedaSinCoincidencias() throws Exception {
        mockMvc.perform(get("/usuarios").param("search", "noexiste"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido", hasSize(0)))
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.totalRegistros").value(0))
                .andExpect(jsonPath("$.totalPaginas").value(0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: parametros vacios o en blanco no aplican ningun filtro")
    void parametrosVaciosNoFiltran() throws Exception {
        mockMvc.perform(get("/usuarios").param("search", "   ").param("rol", "").param("estado", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRegistros").value(6));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("B2: los caracteres % y _ se buscan literalmente, no como comodines")
    void comodinesLikeSeBuscanLiteralmente() throws Exception {
        for (String comodin : new String[]{"%", "_"}) {
            mockMvc.perform(get("/usuarios").param("search", comodin))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalRegistros").value(0));
        }
    }

    private Integer idDe(String email) {
        return transaction.execute(estado -> entityManager
                .createQuery("SELECT u.id FROM Usuario u WHERE u.email = :email", Integer.class)
                .setParameter("email", email)
                .getSingleResult());
    }

    private Usuario leer(String email) {
        return transaction.execute(estado -> entityManager
                .createQuery("SELECT u FROM Usuario u WHERE u.email = :email", Usuario.class)
                .setParameter("email", email)
                .getSingleResult());
    }

    @Test
    @WithMockUser(username = "ana.rojas@umss.edu.bo", roles = "ADMIN")
    @DisplayName("IMP-04: bloquear deja al usuario inactivo")
    void bloquearDejaInactivo() throws Exception {
        mockMvc.perform(patch("/usuarios/" + idDe("zoe.quispe@umss.edu.bo") + "/estado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activo\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("inactivo"));
        Assertions.assertEquals("inactivo", leer("zoe.quispe@umss.edu.bo").getEstado());
    }

    @Test
    @WithMockUser(username = "ana.rojas@umss.edu.bo", roles = "ADMIN")
    @DisplayName("IMP-04: desbloquear activa al usuario y levanta el bloqueo por intentos fallidos")
    void desbloquearActivaYLevantaBloqueo() throws Exception {
        transaction.executeWithoutResult(estado -> {
            Usuario marco = entityManager
                    .createQuery("SELECT u FROM Usuario u WHERE u.email = :email", Usuario.class)
                    .setParameter("email", "marco.torrez@umss.edu.bo")
                    .getSingleResult();
            marco.setBloqueadoHasta(LocalDateTime.now().plusMinutes(10));
            marco.setIntentosFallidos(2);
        });

        mockMvc.perform(patch("/usuarios/" + idDe("marco.torrez@umss.edu.bo") + "/estado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activo\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("activo"))
                .andExpect(jsonPath("$.bloqueadoHasta").doesNotExist());

        Usuario marco = leer("marco.torrez@umss.edu.bo");
        Assertions.assertNull(marco.getBloqueadoHasta());
        Assertions.assertEquals(0, marco.getIntentosFallidos());
    }

    @Test
    @WithMockUser(username = "ana.rojas@umss.edu.bo", roles = "ADMIN")
    @DisplayName("IMP-04: un ADMIN no puede bloquear su propia cuenta")
    void adminNoPuedeBloquearse() throws Exception {
        mockMvc.perform(patch("/usuarios/" + idDe("ana.rojas@umss.edu.bo") + "/estado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activo\":false}"))
                .andExpect(status().isBadRequest());
        Assertions.assertEquals("activo", leer("ana.rojas@umss.edu.bo").getEstado());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("IMP-04: cambiar el estado de un usuario inexistente devuelve 404")
    void cambiarEstadoInexistenteDevuelve404() throws Exception {
        mockMvc.perform(patch("/usuarios/999999/estado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activo\":false}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    @DisplayName("IMP-04: solo ADMIN puede bloquear usuarios")
    void docenteNoPuedeBloquear() throws Exception {
        mockMvc.perform(patch("/usuarios/" + idDe("zoe.quispe@umss.edu.bo") + "/estado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activo\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("IMP-03: exportar CSV respeta los filtros, ordena por nombre y no expone el password")
    void exportarCsvRespetaFiltros() throws Exception {
        String csv = mockMvc.perform(get("/usuarios/exportar.csv").param("estado", "activo"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("usuarios.csv")))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        String[] lineas = csv.replace("\uFEFF", "").strip().split("\n");
        Assertions.assertEquals("id;nombre;apellidos;ci;email;rol;estado", lineas[0]);
        Assertions.assertEquals(5, lineas.length, "encabezado + 4 usuarios activos");
        Assertions.assertTrue(lineas[1].contains(";Ana;"));
        Assertions.assertTrue(lineas[4].contains(";Zoe;"));
        Assertions.assertFalse(csv.contains(HASH_PASSWORD));
        Assertions.assertFalse(csv.contains("inactivo"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Editar un usuario inexistente devuelve 404, no 500")
    void editarInexistenteDevuelve404() throws Exception {
        mockMvc.perform(put("/usuarios/999999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Ana\",\"apellidos\":\"Rojas\",\"ci\":\"6512340\","
                                + "\"email\":\"ana.nueva@est.umss.edu\",\"rol\":\"ADMIN\",\"activo\":true}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    @DisplayName("Importar usuarios es solo para ADMIN")
    void importarSoloAdmin() throws Exception {
        mockMvc.perform(multipart("/usuarios/importar")
                        .file(new MockMultipartFile("file", "usuarios.csv", "text/csv",
                                "nombre,apellidos,ci,email,rol\n".getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Importar usuarios registra las filas válidas e informa las demás")
    void importarRegistraFilasValidas() throws Exception {
        String csv = "nombre;apellidos;ci;email;rol\n"
                + "Elena;Prado Villa;7123456;elena.prado@est.umss.edu;CONTROL\n"
                + "Ana;Rojas Vidal;6512340;ana.rojas@umss.edu.bo;ADMIN\n";
        mockMvc.perform(multipart("/usuarios/importar")
                        .file(new MockMultipartFile("file", "usuarios.csv", "text/csv",
                                csv.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insertados").value(1))
                .andExpect(jsonPath("$.ignorados").value(1))
                .andExpect(jsonPath("$.errores[0]").value(org.hamcrest.Matchers.containsString("Fila 3")));

        Usuario elena = leer("elena.prado@est.umss.edu");
        Assertions.assertEquals("activo", elena.getEstado());
        String rol = transaction.execute(e -> entityManager
                .createQuery("SELECT r.nombre FROM UsuarioRol ur JOIN ur.idRol r WHERE ur.idUsuario.email = :m", String.class)
                .setParameter("m", "elena.prado@est.umss.edu")
                .getSingleResult());
        Assertions.assertEquals("CONTROL", rol);
    }
}
