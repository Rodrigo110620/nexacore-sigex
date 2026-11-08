package com.nexacore.examenes;

import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.repositories.AmbienteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * BUG 1 (QA): el docente registra el aforo de un aula que no lo tiene al programar su examen, sin depender
 * del ADMIN. Cambiar un aforo ya registrado sigue siendo del ADMIN: afecta el reparto de otros exámenes.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AforoAmbienteTests {

    @Autowired MockMvc mockMvc;
    @Autowired AmbienteRepository ambienteRepository;

    private Integer aulaSinAforo(String nombre) {
        Ambiente a = new Ambiente();
        a.setNombre(nombre);
        a.setUbicacion("Edificio nuevo");
        return ambienteRepository.saveAndFlush(a).getId();
    }

    private org.springframework.test.web.servlet.ResultActions aforo(Integer id, int capacidad, String rol) throws Exception {
        return mockMvc.perform(patch("/ambientes/" + id + "/aforo").with(user(rol.toLowerCase() + "@umss.edu").roles(rol))
                .contentType("application/json").content("{\"capacidad\":" + capacidad + "}"));
    }

    @Test
    void elDocenteRegistraElAforoQueFaltaPeroNoCambiaUnoRegistrado() throws Exception {
        Integer id = aulaSinAforo("AULA-AFORO-1");
        aforo(id, 40, "DOCENTE").andExpect(status().isOk()).andExpect(jsonPath("$.capacidad").value(40));
        // Volver a mandar el mismo aforo no es un cambio.
        aforo(id, 40, "DOCENTE").andExpect(status().isOk());
        aforo(id, 25, "DOCENTE").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("El aforo de AULA-AFORO-1 ya está registrado (40). Para cambiarlo, pide al administrador."));
        assertThat(ambienteRepository.findById(id).orElseThrow().getCapacidad()).isEqualTo(40);

        aforo(id, 25, "ADMIN").andExpect(status().isOk()).andExpect(jsonPath("$.capacidad").value(25));
    }

    @Test
    void elControlNoRegistraAforos() throws Exception {
        aforo(aulaSinAforo("AULA-AFORO-2"), 30, "CONTROL").andExpect(status().isForbidden());
    }
}
