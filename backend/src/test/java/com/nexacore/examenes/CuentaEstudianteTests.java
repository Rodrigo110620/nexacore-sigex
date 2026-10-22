package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.services.EmailService;
import com.nexacore.examenes.services.EstudianteService;
import com.nexacore.examenes.services.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpMethod;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CTA-01: el rol ESTUDIANTE es solo para la cuenta del estudiante. No accede a la API del
 * personal y no se asigna desde la gestión de usuarios.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class CuentaEstudianteTests {

    @Autowired MockMvc mockMvc;
    @Autowired UsuarioService usuarioService;
    @Autowired RolRepository rolRepository;
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping;
    @MockBean EstudianteService estudianteService;
    @MockBean EmailService emailService;

    @BeforeEach
    void setUp() {
        for (String nombre : List.of("ADMIN", Rol.ESTUDIANTE)) {
            if (rolRepository.findByNombre(nombre).isEmpty()) {
                Rol rol = new Rol();
                rol.setNombre(nombre);
                rolRepository.save(rol);
            }
        }
        when(estudianteService.listarCarreras(1)).thenReturn(List.of());
    }

    @Test
    @WithMockUser(roles = "ESTUDIANTE")
    void elEstudianteNoAccedeALaApiDelPersonal() throws Exception {
        mockMvc.perform(get("/estudiantes/carreras").param("idFacultad", "1"))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/examenes"))
            .andExpect(status().isForbidden());
    }

    /**
     * Recorre todos los endpoints registrados: fuera de su sesión (/auth), su panel (/mi) y /health,
     * el estudiante recibe 403 en cada uno. Un endpoint nuevo del personal queda cubierto solo.
     */
    @Test
    @WithMockUser(roles = "ESTUDIANTE")
    void elEstudianteRecibe403EnTodosLosEndpointsDelPersonal() throws Exception {
        List<String> revisados = new ArrayList<>();
        List<String> abiertos = new ArrayList<>();
        for (RequestMappingInfo info : handlerMapping.getHandlerMethods().keySet()) {
            for (String patron : info.getPatternValues()) {
                if (patron.startsWith("/auth/") || patron.startsWith("/mi/") || patron.equals("/health")
                        || patron.equals("/error") || patron.contains("api-docs") || patron.contains("swagger")) {
                    continue;
                }
                String ruta = patron.replaceAll("\\{[^}]+}", "1");
                for (RequestMethod metodo : info.getMethodsCondition().getMethods()) {
                    int estado = mockMvc.perform(request(HttpMethod.valueOf(metodo.name()), ruta))
                        .andReturn().getResponse().getStatus();
                    revisados.add(metodo + " " + patron);
                    if (estado != 403) abiertos.add(metodo + " " + patron + " -> " + estado);
                }
            }
        }
        assertThat(revisados).as("endpoints revisados").hasSizeGreaterThan(40);
        assertThat(abiertos).as("endpoints del personal abiertos al estudiante").isEmpty();
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void elPersonalSigueAccediendo() throws Exception {
        mockMvc.perform(get("/estudiantes/carreras").param("idFacultad", "1"))
            .andExpect(status().isOk());
    }

    @Test
    void elSelectorDeRolesNoOfreceElRolEstudiante() {
        assertThat(usuarioService.listarRoles())
            .extracting(Rol::getNombre)
            .contains("ADMIN")
            .doesNotContain(Rol.ESTUDIANTE);
    }

    @Test
    void noSeRegistraPersonalConElRolEstudiante() {
        RegisterUserRequest request = new RegisterUserRequest(
            "Ana", "Pérez", "1234567", "ana.cuenta@umss.edu.bo", "estudiante", true, true);
        assertThatThrownBy(() -> usuarioService.registrar(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("solo para la cuenta de un estudiante");
    }
}
