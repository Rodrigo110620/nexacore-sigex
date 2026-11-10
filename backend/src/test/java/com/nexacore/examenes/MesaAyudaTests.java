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
