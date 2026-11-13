package com.nexacore.examenes;

import com.jayway.jsonpath.JsonPath;
import com.nexacore.examenes.models.SolicitudAyuda;
import com.nexacore.examenes.repositories.SolicitudAyudaRepository;
import com.nexacore.examenes.services.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Mesa de ayuda: consulta pública (también sin sesión), notificación al ADMIN y su atención con respuesta por correo. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class MesaAyudaTests {

    @Autowired MockMvc mockMvc;
    @Autowired SolicitudAyudaRepository repository;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean EmailService emailService;

    private static final String CONSULTA = """
            {"nombre":"Ana Pérez","correo":"Ana.Perez@est.umss.edu","tipo":"ACTIVACION",
             "mensaje":"No me llega el código para activar mi cuenta."}
            """;

    @BeforeEach
    void limpiar() {
        repository.deleteAll();
    }

    @Test
    void sinSesionSeEnviaDesdeElLoginYLeAvisaAlAdmin() throws Exception {
        mockMvc.perform(post("/ayuda/solicitar").contentType("application/json").content(CONSULTA))
                .andExpect(status().isCreated());
        assertThat(repository.findAll()).singleElement().satisfies(s -> {
            assertThat(s.getOrigen()).isEqualTo("LOGIN");
            assertThat(s.getCorreo()).isEqualTo("ana.perez@est.umss.edu");
            assertThat(s.getEstado()).isEqualTo(SolicitudAyuda.PENDIENTE);
            assertThat(s.getIdUsuario()).isNull();
        });
        Integer avisos = jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE tipo = 'AYUDA'", Integer.class);
        assertThat(avisos).isEqualTo(1);
    }

    @Autowired com.nexacore.examenes.repositories.UsuarioRepository usuarioRepository;
    @Autowired com.nexacore.examenes.repositories.RolRepository rolRepository;
    @Autowired com.nexacore.examenes.repositories.UsuarioRolRepository usuarioRolRepository;
    @Autowired org.springframework.transaction.support.TransactionTemplate transaccion;

    /** Fuera de la transacción de la prueba: el aviso por correo sale al confirmarse la consulta. */
    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void cadaAdminActivoRecibeElAvisoPorCorreo() throws Exception {
        Integer[] ids = transaccion.execute(estado -> {
            var rol = rolRepository.findByNombre("ADMIN").orElseGet(() -> {
                var r = new com.nexacore.examenes.models.Rol();
                r.setNombre("ADMIN");
                return rolRepository.save(r);
            });
            var admin = new com.nexacore.examenes.models.Usuario();
            admin.setNombre("Carla"); admin.setApellidos("Mendez"); admin.setCi("9123456");
            admin.setEmail("qa.admin.ayuda@umss.edu.bo"); admin.setPassword("x"); admin.setEstado("activo");
            admin = usuarioRepository.save(admin);
            var ur = new com.nexacore.examenes.models.UsuarioRol();
            var id = new com.nexacore.examenes.models.UsuarioRolId();
            id.setIdUsuario(admin.getId());
            id.setIdRol(rol.getId());
            ur.setId(id);
            ur.setIdUsuario(admin); ur.setIdRol(rol);
            usuarioRolRepository.save(ur);
            return new Integer[]{admin.getId()};
        });
        try {
            mockMvc.perform(post("/ayuda/solicitar").contentType("application/json").content(CONSULTA)).andExpect(status().isCreated());
            org.mockito.Mockito.verify(emailService, org.mockito.Mockito.timeout(3000)).enviarAvisoAyudaAdmin(
                    eq("qa.admin.ayuda@umss.edu.bo"), eq("Carla"), eq("Ana Pérez"), eq("ana.perez@est.umss.edu"),
                    eq("Activar mi cuenta de estudiante"), contains("código"));
        } finally {
            transaccion.executeWithoutResult(estado -> {
                jdbc.update("DELETE FROM notificacion_leida WHERE id_notificacion IN (SELECT id_notificacion FROM notificacion WHERE tipo = 'AYUDA')");
                jdbc.update("DELETE FROM notificacion WHERE tipo = 'AYUDA'");
                repository.deleteAll();
                jdbc.update("DELETE FROM usuario_rol WHERE id_usuario = ?", ids[0]);
                jdbc.update("DELETE FROM usuario WHERE id_usuario = ?", ids[0]);
            });
        }
    }

    @Test
    void conSesionGuardaElRolDeQuienEscribe() throws Exception {
        mockMvc.perform(post("/ayuda/solicitar").with(user("docente@umss.edu").roles("DOCENTE"))
                        .contentType("application/json").content(CONSULTA))
                .andExpect(status().isCreated());
        assertThat(repository.findAll()).singleElement().satisfies(s -> {
            assertThat(s.getOrigen()).isEqualTo("PANEL");
            assertThat(s.getRol()).isEqualTo("DOCENTE");
        });
    }

    @Test
    void validaLosDatosYDescartaLosBots() throws Exception {
        mockMvc.perform(post("/ayuda/solicitar").contentType("application/json")
                        .content("{\"nombre\":\"A\",\"correo\":\"no-es-correo\",\"tipo\":\"X\",\"mensaje\":\"corto\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/ayuda/solicitar").contentType("application/json")
                        .content(CONSULTA.replace("}", ",\"sitio\":\"http://spam\"}")))
                .andExpect(status().isCreated());
        assertThat(repository.count()).isZero();
    }

    @Test
    void elAdminLaAtiendeYRespondePorCorreoUnaSolaVez() throws Exception {
        mockMvc.perform(post("/ayuda/solicitar").contentType("application/json").content(CONSULTA)).andExpect(status().isCreated());
        var admin = user("admin@umss.edu").roles("ADMIN");
        mockMvc.perform(get("/admin/mesa-ayuda/pendientes").with(admin)).andExpect(jsonPath("$.pendientes").value(1));
        String lista = mockMvc.perform(get("/admin/mesa-ayuda").with(admin).param("estado", "PENDIENTE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].tipo").value("ACTIVACION"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(lista, "$.contenido[0].id");

        mockMvc.perform(patch("/admin/mesa-ayuda/" + id).with(admin).contentType("application/json")
                        .content("{\"respuesta\":\"Ya te reenviamos el código; revisa tu correo no deseado.\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ATENDIDA"));
        verify(emailService).enviarRespuestaAyuda(eq("ana.perez@est.umss.edu"), eq("Ana Pérez"), anyString(), contains("reenviamos"));
        mockMvc.perform(get("/admin/mesa-ayuda/pendientes").with(admin)).andExpect(jsonPath("$.pendientes").value(0));
        mockMvc.perform(patch("/admin/mesa-ayuda/" + id).with(admin).contentType("application/json").content("{}"))
                .andExpect(status().isConflict());
    }

    @Test
    void atenderSinRespuestaNoEnviaCorreo() throws Exception {
        mockMvc.perform(post("/ayuda/solicitar").contentType("application/json").content(CONSULTA)).andExpect(status().isCreated());
        Integer id = repository.findAll().get(0).getId();
        mockMvc.perform(patch("/admin/mesa-ayuda/" + id).with(user("admin@umss.edu").roles("ADMIN"))
                        .contentType("application/json").content("{}"))
                .andExpect(status().isOk());
        verify(emailService, never()).enviarRespuestaAyuda(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void soloElAdminVeLaBandeja() throws Exception {
        mockMvc.perform(get("/admin/mesa-ayuda")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/admin/mesa-ayuda").with(user("docente@umss.edu").roles("DOCENTE"))).andExpect(status().isForbidden());
        mockMvc.perform(patch("/admin/mesa-ayuda/1").with(user("control@umss.edu").roles("CONTROL"))
                .contentType("application/json").content("{}")).andExpect(status().isForbidden());
    }
}
