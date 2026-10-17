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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
