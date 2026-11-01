package com.nexacore.examenes;

import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.repositories.MateriaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Búsqueda de materias sin importar tildes y asociación solo con números (código SIS o CI). */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@WithMockUser(roles = "ADMIN")
class BusquedaYAsociacionTests {

    @Autowired MockMvc mockMvc;
    @Autowired MateriaRepository materiaRepository;

    @BeforeEach
    void setUp() {
        Materia materia = new Materia();
        materia.setSigla("ZFS901");
        materia.setNombre("Física Cuántica Zeta");
        materiaRepository.saveAndFlush(materia);
    }

    @Test
    void laMateriaSeEncuentraConOSinTilde() throws Exception {
        for (String busqueda : new String[]{"fisica cuant", "física cuánt", "FÍSICA CUANT", "Fisica Cuantica Zeta", "zfs901"}) {
            mockMvc.perform(get("/materias").param("search", busqueda))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].nombre").value("Física Cuántica Zeta"));
        }
        mockMvc.perform(get("/materias").param("search", "quimica zeta"))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void alAsociarSoloSeAceptanNumeros() throws Exception {
        mockMvc.perform(post("/examenes/1/1/habilitacion").contentType("application/json")
                        .content("{\"identificador\":\"20190A725\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.identificador", containsString("Usa solo números")));

        mockMvc.perform(post("/examenes/1/1/habilitacion/lote").contentType("application/json")
                        .content("{\"identificadores\":[\"201904725\",\"12-345\"]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/examenes/1/1/habilitacion/lote").contentType("application/json")
                        .content("{\"identificadores\":[\"123\"]}"))
                .andExpect(status().isBadRequest());
    }

    // El DOCENTE asocia y cambia la habilitación solo en sus exámenes: en uno ajeno, 403 en todas las rutas.
    @Test
    @WithMockUser(username = "docente.ajeno@umss.edu", roles = "DOCENTE")
    void unDocenteNoAsociaEstudiantesEnUnExamenAjeno() throws Exception {
        mockMvc.perform(post("/examenes/1/1/habilitacion").contentType("application/json")
                        .content("{\"identificador\":\"201904725\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/examenes/1/1/habilitacion/lote").contentType("application/json")
                        .content("{\"identificadores\":[\"201904725\"]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/examenes/1/1/habilitacion/inscritos"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/examenes/1/1/habilitacion").contentType("application/json")
                        .content("{\"idsEstudiante\":[1],\"estadoHabilitacion\":\"HABILITADO\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/examenes/1/1/habilitacion/1"))
                .andExpect(status().isForbidden());
    }
}
