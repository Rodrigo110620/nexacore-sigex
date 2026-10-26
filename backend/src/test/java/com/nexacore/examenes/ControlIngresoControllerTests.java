package com.nexacore.examenes;

import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.services.ControlIngresoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.http.MediaType.APPLICATION_JSON;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ControlIngresoControllerTests {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ControlIngresoService service;

    @MockitoBean
    private com.nexacore.examenes.services.ExcepcionService excepcionService;

    private static final String EXCEPCION = "{\"idEstudiante\":10,\"idExamen\":20,\"idAmbiente\":0,"
            + "\"motivoInhabilitacion\":\"Deuda en biblioteca\",\"accionTomada\":\"Se le indicó acudir a administración\","
            + "\"observaciones\":\"Insistió en ingresar\"}";

    // INCI-04: la ruta se borró una vez al resolver un conflicto de fusión; estas pruebas lo detectan.
    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "CONTROL"})
    void registrarExcepcionDeNoHabilitadoGuardaLaExcepcion(String rol) throws Exception {
        mockMvc.perform(post("/control-ingresos/excepcion-no-habilitado").with(user("control@sigex.test").roles(rol))
                        .contentType(APPLICATION_JSON).content(EXCEPCION))
                .andExpect(status().isOk());
        org.mockito.Mockito.verify(excepcionService).registrarExcepcion(
                org.mockito.ArgumentMatchers.argThat(r -> r.idEstudiante() == 10 && r.idExamen() == 20
                        && "Se le indicó acudir a administración".equals(r.accionTomada())),
                org.mockito.ArgumentMatchers.eq("control@sigex.test"));
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void registrarExcepcionExigeLaAccionTomada() throws Exception {
        mockMvc.perform(post("/control-ingresos/excepcion-no-habilitado").contentType(APPLICATION_JSON)
                        .content(EXCEPCION.replace("Se le indicó acudir a administración", " ")))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(excepcionService);
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    void registrarExcepcionNoLaPermiteAUnDocenteDeOtroExamen() throws Exception {
        mockMvc.perform(post("/control-ingresos/excepcion-no-habilitado").contentType(APPLICATION_JSON).content(EXCEPCION))
                .andExpect(status().isForbidden());
        org.mockito.Mockito.verifyNoInteractions(excepcionService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "CONTROL", "DOCENTE"})
    void expulsionExigeAdmin(String rol) throws Exception {
        mockMvc.perform(post("/control-ingresos/expulsar").with(user("admin@sigex.test").roles(rol))
                        .contentType(APPLICATION_JSON).content("{\"idEstudiante\":10,\"idExamen\":20,\"motivo\":\"Uso de celular\"}"))
                .andExpect(status().is(rol.equals("ADMIN") ? 200 : 403));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void expulsionRechazaMotivoVacio() throws Exception {
        mockMvc.perform(post("/control-ingresos/expulsar").contentType(APPLICATION_JSON)
                        .content("{\"idEstudiante\":10,\"idExamen\":20,\"motivo\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    void permiteDocenteConsultarTiposDeIncidencia() throws Exception {
        when(service.listarTiposIncidencia()).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void permiteUsuarioConRolControl() throws Exception {
        when(service.listarTiposIncidencia()).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void permiteUsuarioConRolAdmin() throws Exception {
        when(service.listarTiposIncidencia()).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void consultaRegistrosDeIngresoDelExamen() throws Exception {
        when(service.consultarRegistrosExamen(20)).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/examen/20/registros"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "control@umss.edu.bo", roles = "CONTROL")
    void respondeConflictAlDenegarUnIngresoYaAutorizado() throws Exception {
        when(service.denegar(any(AutorizarIngresoRequest.class), anyString()))
                .thenThrow(new ControlIngresoException(
                        HttpStatus.CONFLICT, "No se puede denegar un ingreso que ya fue autorizado"));

        mockMvc.perform(post("/control-ingresos/denegar")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"idEstudiante":10,"idExamen":20,"observaciones":"Documento inválido",
                                 "identidadVerificada":false,"verificacionesAdicionales":[],"incidencias":[]}
                                """))
                .andExpect(status().isConflict());
    }

}
