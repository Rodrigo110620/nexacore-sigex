package com.nexacore.examenes;

import com.nexacore.examenes.dto.ConfirmarActivacionRequest;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.dto.SolicitarActivacionRequest;
import com.nexacore.examenes.exceptions.UsuarioNoEncontradoException;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.AuthService;
import com.nexacore.examenes.services.CuentaEstudianteService;
import com.nexacore.examenes.services.EmailService;
import com.nexacore.examenes.services.QrEstudianteService;
import com.nexacore.examenes.services.UsuarioService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CTA-01: activación de la cuenta del estudiante y su panel (/mi). El estudiante solo ve lo suyo,
 * su QR temporal lo valida el control de ingreso y su foto espera la aprobación del ADMIN.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class CuentaEstudianteFlujoTests {

    private static final String SIS = "202104010";
    private static final String CI = "7489210";
    private static final String EMAIL = "202104010@est.umss.edu";
    private static final String PASSWORD = "Clave#Segura9";
    /** JPEG mínimo: basta con la firma FF D8 FF para el control de tipo. */
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};

    @Autowired MockMvc mockMvc;
    @Autowired CuentaEstudianteService cuentaService;
    @Autowired AuthService authService;
    @Autowired UsuarioService usuarioService;
    @Autowired QrEstudianteService qrService;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired RolRepository rolRepository;
    @Autowired EntityManager entityManager;
    @Autowired com.nexacore.examenes.services.EstudianteFotoService fotoService;
    @MockBean EmailService emailService;

    @BeforeEach
    void setUp() {
        if (rolRepository.findByNombre(Rol.ESTUDIANTE).isEmpty()) {
            Rol rol = new Rol();
            rol.setNombre(Rol.ESTUDIANTE);
            rolRepository.save(rol);
        }
        Estudiante e = new Estudiante();
        e.setCodigoSis(SIS);
        e.setNombre("Ana");
        e.setApellidos("Rojas Mendoza");
        e.setCi(CI);
        e.setEmail(EMAIL);
        estudianteRepository.saveAndFlush(e);
    }

    /** Pide el código y devuelve el que se "envió" por correo. */
    private String pedirCodigo() {
        cuentaService.solicitarActivacion(new SolicitarActivacionRequest(SIS, CI, EMAIL));
        ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
        verify(emailService).enviarCodigoActivacion(eq(EMAIL), anyString(), codigo.capture(), anyInt());
        return codigo.getValue();
    }

    private void activar() {
        cuentaService.confirmarActivacion(new ConfirmarActivacionRequest(SIS, pedirCodigo(), PASSWORD, PASSWORD));
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void conDatosQueNoCoincidenNoSeEnviaCodigo() {
        cuentaService.solicitarActivacion(new SolicitarActivacionRequest(SIS, "1234567", EMAIL));
        cuentaService.solicitarActivacion(new SolicitarActivacionRequest(SIS, CI, "otra@est.umss.edu"));
        cuentaService.solicitarActivacion(new SolicitarActivacionRequest("999999999", CI, EMAIL));
        verify(emailService, never()).enviarCodigoActivacion(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void activaLaCuentaYElEstudianteIniciaSesionConRolEstudiante() {
        activar();

        Estudiante e = estudianteRepository.findByCodigoSis(SIS).orElseThrow();
        assertThat(e.getIdUsuario()).isNotNull();
        var login = authService.login(new LoginRequest(EMAIL, PASSWORD));
        assertThat(login.roles()).containsExactly(Rol.ESTUDIANTE);
    }

    @Test
    void elCodigoIncorrectoSeAgotaTrasCincoIntentos() {
        String codigo = pedirCodigo();
        String incorrecto = codigo.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> cuentaService.confirmarActivacion(
                    new ConfirmarActivacionRequest(SIS, incorrecto, PASSWORD, PASSWORD)))
                    .hasMessageContaining("incorrecto o venció");
        }
        assertThatThrownBy(() -> cuentaService.confirmarActivacion(
                new ConfirmarActivacionRequest(SIS, codigo, PASSWORD, PASSWORD)))
                .hasMessageContaining("incorrecto o venció");
    }

    @Test
    void laContrasenaNoPuedeContenerSusDatos() {
        String clave = "Ana" + SIS + "#x";
        assertThatThrownBy(() -> cuentaService.confirmarActivacion(
                new ConfirmarActivacionRequest(SIS, pedirCodigo(), clave, clave)))
                .hasMessageContaining("no puede contener");
    }

    @Test
    void laCuentaDelEstudianteNoApareceEnLaGestionDeUsuarios() {
        activar();
        Integer idUsuario = estudianteRepository.findByCodigoSis(SIS).orElseThrow().getIdUsuario();

        assertThat(usuarioService.listar(0, 100, EMAIL, null, null).contenido()).isEmpty();
        assertThat(usuarioService.obtenerEstadisticas().totalUsuarios()).isEqualTo(usuarioRepository.count() - 1);
        assertThatThrownBy(() -> usuarioService.cambiarEstado(idUsuario, false, "admin@umss.edu"))
                .isInstanceOf(UsuarioNoEncontradoException.class);
    }

    @Test
    @WithMockUser(username = EMAIL, roles = "ESTUDIANTE")
    void elPanelMuestraSusDatosConElCiEnmascarado() throws Exception {
        activar();
        mockMvc.perform(get("/mi/perfil"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.codigoSis").value(SIS))
            .andExpect(jsonPath("$.ciEnmascarado").value("••••210"))
            .andExpect(jsonPath("$.estadoMatricula").value("MATRICULADO"));
        mockMvc.perform(get("/mi/examenes"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/auth/me"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = EMAIL, roles = "ESTUDIANTE")
    void elQrTemporalLoValidaElControlDeIngreso() throws Exception {
        activar();
        String respuesta = mockMvc.perform(get("/mi/qr"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.segundosValidez").value(60))
            .andReturn().getResponse().getContentAsString();
        String contenido = respuesta.replaceAll(".*\"contenido\":\"([^\"]+)\".*", "$1");

        assertThat(contenido).startsWith("SIGEX3.");
        assertThat(qrService.validar(contenido)).isEqualTo(SIS);

        String alterado = contenido.substring(0, contenido.length() - 2)
                + (contenido.endsWith("AA") ? "BB" : "AA");
        assertThatThrownBy(() -> qrService.validar(alterado)).isInstanceOf(IllegalArgumentException.class);

        // Si se regenera la credencial (QR perdido), los QR temporales anteriores dejan de servir.
        qrService.regenerar(estudianteRepository.findByCodigoSis(SIS).orElseThrow());
        assertThatThrownBy(() -> qrService.validar(contenido))
            .hasMessageContaining("revocado");
    }

    @Test
    @WithMockUser(username = EMAIL, roles = "ESTUDIANTE")
    void laPrimeraFotoQuedaAprobadaYPideLaContrasena() throws Exception {
        activar();
        MockMultipartFile foto = new MockMultipartFile("file", "foto.jpg", "image/jpeg", JPEG);

        mockMvc.perform(multipart("/mi/foto").file(foto).param("password", "Incorrecta#1")
                .with(r -> { r.setMethod("PUT"); return r; }))
            .andExpect(status().isBadRequest());
        mockMvc.perform(multipart("/mi/foto").file(foto).param("password", PASSWORD)
                .with(r -> { r.setMethod("PUT"); return r; }))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.estado").value("APROBADA"));

        mockMvc.perform(get("/mi/perfil"))
            .andExpect(jsonPath("$.fotoUrl").exists())
            .andExpect(jsonPath("$.solicitudFoto").doesNotExist());
    }

    @Test
    @WithMockUser(username = EMAIL, roles = "ESTUDIANTE")
    void elCambioDeFotoQuedaPendiente() throws Exception {
        activar();
        Integer id = estudianteRepository.findByCodigoSis(SIS).orElseThrow().getId();
        fotoService.guardar(id, new MockMultipartFile("file", "actual.jpg", "image/jpeg", JPEG));
        MockMultipartFile nueva = new MockMultipartFile("file", "nueva.jpg", "image/jpeg", JPEG);

        mockMvc.perform(multipart("/mi/foto").file(nueva).param("password", PASSWORD)
                .with(r -> { r.setMethod("PUT"); return r; }))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.estado").value("PENDIENTE"));

        mockMvc.perform(get("/mi/perfil"))
            .andExpect(jsonPath("$.fotoUrl").exists())
            .andExpect(jsonPath("$.solicitudFoto.estado").value("PENDIENTE"));
    }

    @Test
    @WithMockUser(username = "admin@umss.edu", roles = "ADMIN")
    void elAdminApruebaLaFotoEnviada() throws Exception {
        Integer id = estudianteRepository.findByCodigoSis(SIS).orElseThrow().getId();
        mockMvc.perform(post("/estudiantes/" + id + "/foto-solicitud/aprobar"))
            .andExpect(status().isBadRequest());

        fotoService.guardar(id, new MockMultipartFile("file", "actual.jpg", "image/jpeg", JPEG));
        fotoService.solicitarCambio(id, new MockMultipartFile("file", "foto.jpg", "image/jpeg", JPEG));
        mockMvc.perform(get("/estudiantes/fotos-pendientes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].codigoSis").value(SIS));
        mockMvc.perform(post("/estudiantes/" + id + "/foto-solicitud/aprobar"))
            .andExpect(status().isNoContent());

        assertThat(fotoService.obtener(id)).isPresent();
        assertThat(fotoService.obtenerSolicitud(id)).isEmpty();
    }

    @Test
    @WithMockUser(username = "control@umss.edu", roles = "CONTROL")
    void elPersonalNoUsaElPanelDelEstudiante() throws Exception {
        mockMvc.perform(get("/mi/perfil"))
            .andExpect(status().isForbidden());
    }

    @Test
    void laActivacionEsPublica() throws Exception {
        mockMvc.perform(post("/auth/estudiante/activacion/solicitar").contentType("application/json")
                .content("{\"codigoSis\":\"" + SIS + "\",\"ci\":\"1111111\",\"email\":\"" + EMAIL + "\"}"))
            .andExpect(status().isAccepted());
    }

    @Test
    @WithMockUser(username = EMAIL, roles = "ESTUDIANTE")
    void alCambiarSuContrasenaTampocoPuedeUsarSusDatos() throws Exception {
        activar();
        mockMvc.perform(put("/auth/cambiar-password").contentType("application/json").content("""
                {"passwordActual":"%s","passwordNueva":"Ana#%s","passwordConfirmacion":"Ana#%s"}
                """.formatted(PASSWORD, SIS, SIS)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.mensaje").value("La contraseña no puede contener tu nombre, tu código SIS ni tu CI."));

        mockMvc.perform(put("/auth/cambiar-password").contentType("application/json").content("""
                {"passwordActual":"%s","passwordNueva":"Otra#Clave77","passwordConfirmacion":"Otra#Clave77"}
                """.formatted(PASSWORD)))
            .andExpect(status().isOk());
    }
}
