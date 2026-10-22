package com.nexacore.examenes;

import com.nexacore.examenes.dto.ConfirmarActivacionRequest;
import com.nexacore.examenes.dto.SolicitarActivacionRequest;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.CuentaEstudianteService;
import com.nexacore.examenes.services.EmailService;
import com.nexacore.examenes.services.EstudianteFotoService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CTA-02: el personal de control reporta una foto que no coincide, el estudiante vuelve a escanear
 * su rostro y la administración revisa la nueva foto (o descarta el reporte).
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class ReporteFotoFlujoTests {

    private static final String SIS = "202003215";
    private static final String CI = "6512340";
    private static final String EMAIL = "202003215@est.umss.edu";
    private static final String PASSWORD = "Clave#Segura9";
    private static final String CONTROL = "control.reporte@umss.edu";
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};
    private static final String REPORTE = """
            {"motivo":"NO_SE_PARECE","detalle":"La persona que se presentó no se parece a la foto registrada."}
            """;

    @Autowired MockMvc mockMvc;
    @Autowired CuentaEstudianteService cuentaService;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired RolRepository rolRepository;
    @Autowired EstudianteFotoService fotoService;
    @Autowired EntityManager entityManager;
    @MockBean EmailService emailService;

    private Integer idEstudiante;

    @BeforeEach
    void setUp() {
        if (rolRepository.findByNombre(Rol.ESTUDIANTE).isEmpty()) {
            Rol rol = new Rol();
            rol.setNombre(Rol.ESTUDIANTE);
            rolRepository.save(rol);
        }
        Estudiante e = new Estudiante();
        e.setCodigoSis(SIS);
        e.setNombre("Luis");
        e.setApellidos("Fernández Quiroga");
        e.setCi(CI);
        e.setEmail(EMAIL);
        idEstudiante = estudianteRepository.saveAndFlush(e).getId();

        Usuario control = new Usuario();
        control.setNombre("Carla");
        control.setApellidos("Méndez");
        control.setCi("4455667");
        control.setEmail(CONTROL);
        control.setPassword("x");
        control.setEstado("activo");
        usuarioRepository.saveAndFlush(control);

        cuentaService.solicitarActivacion(new SolicitarActivacionRequest(SIS, CI, EMAIL));
        ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
        verify(emailService).enviarCodigoActivacion(eq(EMAIL), anyString(), codigo.capture(), anyInt());
        cuentaService.confirmarActivacion(new ConfirmarActivacionRequest(SIS, codigo.getValue(), PASSWORD, PASSWORD));
        entityManager.flush();
        entityManager.clear();
    }

    private static RequestPostProcessor estudiante() {
        return user(EMAIL).roles("ESTUDIANTE");
    }

    private static RequestPostProcessor control() {
        return user(CONTROL).roles("CONTROL");
    }

    private static RequestPostProcessor admin() {
        return user("admin@umss.edu").roles("ADMIN");
    }

    private void fotoAprobada() {
        fotoService.guardar(idEstudiante, new MockMultipartFile("file", "actual.jpg", "image/jpeg", JPEG));
    }

    private void reportar() throws Exception {
        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes").with(control())
                        .contentType("application/json").content(REPORTE))
                .andExpect(status().isCreated());
    }

    private void enviarFotoNueva() throws Exception {
        mockMvc.perform(multipart("/mi/foto").file(new MockMultipartFile("file", "nueva.jpg", "image/jpeg", JPEG))
                        .param("password", PASSWORD).with(estudiante())
                        .with(r -> { r.setMethod("PUT"); return r; }))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    @Test
    void reportarPideAlEstudianteVolverAEscanearYLaNuevaFotoVaARevision() throws Exception {
        fotoAprobada();
        reportar();

        // Reportar de nuevo la misma foto no duplica la revisión.
        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes").with(control())
                        .contentType("application/json").content(REPORTE))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/mi/perfil").with(estudiante()))
                .andExpect(jsonPath("$.fotoUrl").exists())
                .andExpect(jsonPath("$.fotoReportada").value(true));

        // Antes de que la reemplace, la administración ya ve el reporte esperando la foto.
        mockMvc.perform(get("/estudiantes/fotos-pendientes").with(admin()))
                .andExpect(jsonPath("$[0].origen").value("REPORTE"))
                .andExpect(jsonPath("$[0].estado").value("ESPERANDO_FOTO"))
                .andExpect(jsonPath("$[0].reporte.motivo").value("NO_SE_PARECE"))
                .andExpect(jsonPath("$[0].reporte.reportadoPor").value("Carla Méndez"));

        enviarFotoNueva();
        mockMvc.perform(get("/mi/perfil").with(estudiante()))
                .andExpect(jsonPath("$.fotoReportada").value(false))
                .andExpect(jsonPath("$.solicitudFoto.estado").value("PENDIENTE"));
        mockMvc.perform(get("/estudiantes/fotos-pendientes").with(admin()))
                .andExpect(jsonPath("$[0].estado").value("PENDIENTE"))
                .andExpect(jsonPath("$[0].fotoUrl").value("/estudiantes/" + idEstudiante + "/foto-solicitud"))
                .andExpect(jsonPath("$[0].fotoActualUrl").value("/estudiantes/" + idEstudiante + "/foto"));

        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto-solicitud/aprobar").with(admin()))
                .andExpect(status().isNoContent());
        assertThat(fotoService.reporteAbierto(idEstudiante)).isEmpty();
        mockMvc.perform(get("/estudiantes/fotos-pendientes").with(admin()))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void siSeRechazaLaNuevaFotoElEstudianteDebeEscanearOtraVez() throws Exception {
        fotoAprobada();
        reportar();
        enviarFotoNueva();

        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto-solicitud/rechazar").with(admin())
                        .contentType("application/json").content("{\"motivo\":\"No es la misma persona\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/mi/perfil").with(estudiante()))
                .andExpect(jsonPath("$.fotoReportada").value(true))
                .andExpect(jsonPath("$.solicitudFoto.estado").value("RECHAZADA"));
        assertThat(fotoService.reporteAbierto(idEstudiante)).isPresent();
    }

    @Test
    void laAdministracionPuedeDescartarElReporteSiLaFotoEsCorrecta() throws Exception {
        fotoAprobada();
        reportar();

        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes/descartar").with(admin()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/mi/perfil").with(estudiante()))
                .andExpect(jsonPath("$.fotoReportada").value(false));
        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes/descartar").with(admin()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void noSePuedeReportarSinFotoNiSinMotivo() throws Exception {
        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes").with(control())
                        .contentType("application/json").content(REPORTE))
                .andExpect(status().isBadRequest());

        fotoAprobada();
        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes").with(control())
                        .contentType("application/json").content("{\"detalle\":\"sin motivo\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void soloElPersonalReportaYSoloElAdminRevisa() throws Exception {
        fotoAprobada();
        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes").with(estudiante())
                        .contentType("application/json").content(REPORTE))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/estudiantes/fotos-pendientes").with(control()))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/estudiantes/" + idEstudiante + "/foto/reportes/descartar").with(control()))
                .andExpect(status().isForbidden());
    }
}
