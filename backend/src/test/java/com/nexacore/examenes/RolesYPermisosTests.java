package com.nexacore.examenes;

import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.security.Permiso;
import com.nexacore.examenes.security.Permisos;
import com.nexacore.examenes.services.IntentoIngresoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Roles configurables: ADMIN, DOCENTE y CONTROL tienen permisos fijos (los de siempre); un rol extra
 * (p. ej. AUXILIAR) solo puede hacer lo que tiene marcado, y nunca gestionar usuarios ni roles.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class RolesYPermisosTests {

    @Autowired MockMvc mockMvc;
    @Autowired RolRepository rolRepository;
    @MockitoBean IntentoIngresoService intentoIngresoService;

    @BeforeEach
    void rolesDelSistema() {
        for (String nombre : List.of("ADMIN", "DOCENTE", "CONTROL")) {
            if (rolRepository.findByNombre(nombre).isEmpty()) {
                Rol r = new Rol();
                r.setNombre(nombre);
                rolRepository.save(r);
            }
        }
        when(intentoIngresoService.reporte(any(), anyInt(), anyInt()))
                .thenReturn(new com.nexacore.examenes.dto.PageResponse<>(List.of(), 0, 20, 0, 0));
    }

    @Test
    void losRolesDelSistemaConservanSusPermisosDeSiempre() {
        assertThat(Permisos.deRoles(List.of("ADMIN"))).containsAll(Permisos.todos());
        assertThat(Permisos.deRoles(List.of("DOCENTE"))).containsExactlyInAnyOrder(
                "EXAMENES_VER_PROPIOS", "EXAMENES_GESTIONAR_PROPIOS", "HABILITACION_VER", "HABILITACION_GESTIONAR_PROPIOS",
                "CONTROL_INGRESO_PROPIOS", "EXPULSAR_PROPIOS", "ESTUDIANTES_VER", "ESTUDIANTES_GESTIONAR", "FOTOS_REPORTAR");
        assertThat(Permisos.deRoles(List.of("CONTROL"))).containsExactlyInAnyOrder(
                "EXAMENES_VER_TODOS", "HABILITACION_VER", "CONTROL_INGRESO_TODOS", "ESTUDIANTES_VER", "FOTOS_REPORTAR",
                "NOTIFICACIONES_TODAS");
        assertThat(Set.of(Permiso.values())).allSatisfy(p ->
                assertThat(p.soloAdmin()).isEqualTo(p == Permiso.USUARIOS_GESTIONAR || p == Permiso.ROLES_GESTIONAR));
    }

    @Test
    void unRolExtraSoloHaceLoQueTieneMarcado() throws Exception {
        // Sin el rol creado, AUXILIAR no tiene ningún permiso.
        mockMvc.perform(get("/intentos-ingreso/reporte").with(user("aux@sigex.test").roles("AUXILIAR")))
                .andExpect(status().isForbidden());

        String creado = mockMvc.perform(post("/roles").with(user("admin@sigex.test").roles("ADMIN")).contentType("application/json")
                        .content("{\"nombre\":\"AUXILIAR\",\"descripcion\":\"Apoya al control en la puerta\",\"permisos\":[\"REPORTES_VER\",\"ESTUDIANTES_VER\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.delSistema").value(false))
                .andReturn().getResponse().getContentAsString();
        int id = com.jayway.jsonpath.JsonPath.read(creado, "$.id");

        mockMvc.perform(get("/intentos-ingreso/reporte").with(user("aux@sigex.test").roles("AUXILIAR")))
                .andExpect(status().isOk());
        // Lo que no tiene marcado sigue prohibido.
        mockMvc.perform(get("/usuarios").with(user("aux@sigex.test").roles("AUXILIAR"))).andExpect(status().isForbidden());

        // Al quitarle el permiso deja de poder.
        mockMvc.perform(put("/roles/" + id).with(user("admin@sigex.test").roles("ADMIN")).contentType("application/json")
                        .content("{\"descripcion\":\"Apoya al control en la puerta\",\"permisos\":[\"ESTUDIANTES_VER\"]}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/intentos-ingreso/reporte").with(user("aux@sigex.test").roles("AUXILIAR")))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/roles/" + id).with(user("admin@sigex.test").roles("ADMIN"))).andExpect(status().isNoContent());
    }

    @Test
    void unRolExtraNoPuedeGestionarUsuariosNiRoles() throws Exception {
        mockMvc.perform(post("/roles").with(user("admin@sigex.test").roles("ADMIN")).contentType("application/json")
                        .content("{\"nombre\":\"SUPERVISOR\",\"descripcion\":\"Supervisa el control\",\"permisos\":[\"USUARIOS_GESTIONAR\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value(org.hamcrest.Matchers.containsString("solo del ADMIN")));
    }

    @Test
    void losRolesDelSistemaNoSeEditanNiSeBorranYSoloElAdminGestionaRoles() throws Exception {
        Integer idDocente = rolRepository.findByNombre("DOCENTE").orElseThrow().getId();
        mockMvc.perform(put("/roles/" + idDocente).with(user("admin@sigex.test").roles("ADMIN")).contentType("application/json")
                        .content("{\"descripcion\":\"Cambio no permitido\",\"permisos\":[\"REPORTES_VER\"]}"))
                .andExpect(status().isConflict());
        mockMvc.perform(delete("/roles/" + idDocente).with(user("admin@sigex.test").roles("ADMIN"))).andExpect(status().isConflict());
        mockMvc.perform(post("/roles").with(user("admin@sigex.test").roles("ADMIN")).contentType("application/json")
                        .content("{\"nombre\":\"DOCENTE\",\"descripcion\":\"Duplicado del sistema\",\"permisos\":[\"REPORTES_VER\"]}"))
                .andExpect(status().isConflict());
        for (String rol : List.of("DOCENTE", "CONTROL")) {
            mockMvc.perform(get("/roles").with(user("x@sigex.test").roles(rol))).andExpect(status().isForbidden());
        }
        mockMvc.perform(get("/roles").with(user("admin@sigex.test").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nombre").value("ADMIN"))
                .andExpect(jsonPath("$[0].delSistema").value(true));
    }
}
