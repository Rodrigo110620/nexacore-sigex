package com.nexacore.examenes;

import com.nexacore.examenes.repositories.EstudianteRepository;

import com.nexacore.examenes.models.Estudiante;

import com.nexacore.examenes.models.Notificacion;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.NotificacionRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.NotificacionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

/**
 * Notificaciones en vivo (SSE): un reporte nuevo llega al instante a las conexiones abiertas del
 * personal que debe verlo. Sin @Transactional: el envío ocurre al confirmar la transacción.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class NotificacionEnVivoTests {

    private static final String ADMIN = "admin.envivo@umss.edu";
    private static final String DOCENTE = "docente.envivo@umss.edu";
    private static final String CONTROL = "control.envivo@umss.edu";

    @Autowired MockMvc mockMvc;
    @Autowired NotificacionService notificacionService;
    @Autowired NotificacionRepository notificacionRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired com.nexacore.examenes.repositories.NotificacionLeidaRepository leidaRepository;
    @Autowired com.nexacore.examenes.repositories.NotificacionLimpiezaRepository limpiezaRepository;

    private final List<Integer> usuarios = new ArrayList<>();
    private final List<Integer> estudiantes = new ArrayList<>();

    @BeforeEach
    void setUp() {
        usuarios.add(usuario(ADMIN, "7700001"));
        usuarios.add(usuario(DOCENTE, "7700002"));
        usuarios.add(usuario(CONTROL, "7700003"));
    }

    @AfterEach
    void limpiar() {
        leidaRepository.deleteAll();
        limpiezaRepository.deleteAll();
        notificacionRepository.deleteAll();
        estudianteRepository.deleteAllById(estudiantes);
        usuarioRepository.deleteAllById(usuarios);
    }

    @Test
    void elReporteLlegaEnVivoAlAdminPeroNoAQuienLoHizoNiAlDocenteAjeno() throws Exception {
        MockHttpServletResponse admin = abrir(ADMIN, "ADMIN");
        MockHttpServletResponse docente = abrir(DOCENTE, "DOCENTE");
        MockHttpServletResponse control = abrir(CONTROL, "CONTROL");

        notificacionService.publicar(Notificacion.FOTO_REPORTADA, "Foto reportada: Luis", "No se parece",
                null, null, "/dashboard/estudiantes/fotos", CONTROL);

        assertThat(admin.getContentAsString())
                .contains("event:conectado")
                .contains("event:notificacion")
                .contains("\"titulo\":\"Foto reportada: Luis\"");
        // El reporte no es de un examen suyo: el docente no lo recibe.
        assertThat(docente.getContentAsString()).contains("event:conectado").doesNotContain("event:notificacion");
        // Quien reportó tampoco.
        assertThat(control.getContentAsString()).doesNotContain("event:notificacion");
    }

    @Test
    void losCambiosLleganAlPersonalYAlEstudianteSoloLosSuyos() throws Exception {
        String emailEstudiante = "201900001@est.umss.edu";
        Integer idUsuarioEstudiante = usuario(emailEstudiante, "7700004");
        usuarios.add(idUsuarioEstudiante);
        Estudiante e = new Estudiante();
        e.setCodigoSis("201900001");
        e.setNombre("Eva");
        e.setApellidos("Prueba");
        e.setCi("7700004");
        e.setEmail(emailEstudiante);
        e.setIdUsuario(idUsuarioEstudiante);
        Integer idEstudiante = estudianteRepository.saveAndFlush(e).getId();
        estudiantes.add(idEstudiante);

        MockHttpServletResponse control = abrir(CONTROL, "CONTROL");
        MockHttpServletResponse estudiante = mockMvc.perform(get("/mi/eventos").with(user(emailEstudiante).roles("ESTUDIANTE")))
                .andExpect(request().asyncStarted())
                .andReturn().getResponse();

        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, 99, idEstudiante + 1000);
        assertThat(control.getContentAsString()).contains("event:cambio").contains("\"tipo\":\"INGRESO\"");
        // El ingreso de otro estudiante no le llega.
        assertThat(estudiante.getContentAsString()).contains("event:conectado").doesNotContain("event:cambio");

        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, 99, idEstudiante);
        assertThat(estudiante.getContentAsString()).contains("event:cambio")
                .contains("\"idEstudiante\":" + idEstudiante);

        // El estudiante no recibe las notificaciones del personal.
        notificacionService.publicar(Notificacion.FOTO_REPORTADA, "Foto reportada: Eva", null, null, idEstudiante, null, CONTROL);
        assertThat(estudiante.getContentAsString()).doesNotContain("event:notificacion");
    }

    @Test
    void cadaUnoLimpiaSusNotificacionesSinBorrarselasALosDemas() throws Exception {
        notificacionService.publicar(Notificacion.EXPULSION, "Expulsión: Ana", null, null, null, null, DOCENTE);
        notificacionService.publicar(Notificacion.INGRESO_MANUAL, "Ingreso manual: Beto", null, null, null, null, DOCENTE);
        Integer idPrimera = notificacionRepository.findAll().stream()
                .filter(n -> n.getTitulo().equals("Expulsión: Ana")).findFirst().orElseThrow().getId();

        // Quitar una: solo desaparece para quien la quitó.
        mockMvc.perform(delete("/notificaciones/" + idPrimera).with(user(ADMIN).roles("ADMIN")))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/notificaciones").with(user(ADMIN).roles("ADMIN")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].titulo").value("Ingreso manual: Beto"));
        mockMvc.perform(get("/notificaciones").with(user(CONTROL).roles("CONTROL")))
                .andExpect(jsonPath("$.length()").value(2));

        // Limpiar todas: la lista queda vacía, pero las nuevas siguen llegando.
        mockMvc.perform(delete("/notificaciones").with(user(ADMIN).roles("ADMIN")))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/notificaciones").with(user(ADMIN).roles("ADMIN")))
                .andExpect(jsonPath("$.length()").value(0));
        notificacionService.publicar(Notificacion.EXCEPCION_NO_HABILITADO, "Excepción: Carla", null, null, null, null, DOCENTE);
        mockMvc.perform(get("/notificaciones").with(user(ADMIN).roles("ADMIN")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].titulo").value("Excepción: Carla"));
        // El control no limpió nada: sigue viendo las tres.
        mockMvc.perform(get("/notificaciones").with(user(CONTROL).roles("CONTROL")))
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void elDocenteNoPuedeQuitarUnaNotificacionDeUnExamenAjeno() throws Exception {
        notificacionService.publicar(Notificacion.FOTO_REPORTADA, "Foto reportada: Luis", null, null, null, null, CONTROL);
        Integer id = notificacionRepository.findAll().get(0).getId();
        mockMvc.perform(delete("/notificaciones/" + id).with(user(DOCENTE).roles("DOCENTE")))
                .andExpect(status().isForbidden());
    }

    private MockHttpServletResponse abrir(String email, String rol) throws Exception {
        return mockMvc.perform(get("/notificaciones/stream").with(user(email).roles(rol)))
                .andExpect(request().asyncStarted())
                .andReturn().getResponse();
    }

    private Integer usuario(String email, String ci) {
        Usuario u = new Usuario();
        u.setNombre("Prueba");
        u.setApellidos("En Vivo");
        u.setCi(ci);
        u.setEmail(email);
        u.setPassword("x");
        u.setEstado("activo");
        return usuarioRepository.saveAndFlush(u).getId();
    }
}
