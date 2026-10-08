package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.dto.RegisterUserResponse;
import com.nexacore.examenes.exceptions.CiDuplicadoException;
import com.nexacore.examenes.exceptions.CorreoNoEnviadoException;
import com.nexacore.examenes.exceptions.EmailDuplicadoException;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.UsuarioRolRepository;
import com.nexacore.examenes.services.EmailService;
import com.nexacore.examenes.services.UsuarioService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Alta de usuarios: correo en minúsculas, CI duplicado con mensaje propio y
 * reversión del registro si no sale el correo con la clave temporal.
 * Sin @Transactional en la clase para probar el rollback real de registrar().
 */
@SpringBootTest
@ActiveProfiles("test")
class UsuarioRegistroTests {

    @Autowired UsuarioService usuarioService;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired UsuarioRolRepository usuarioRolRepository;
    @Autowired RolRepository rolRepository;
    @MockBean EmailService emailService;

    @BeforeEach
    void setUp() {
        if (rolRepository.findByNombre("ADMIN").isEmpty()) {
            Rol rol = new Rol();
            rol.setNombre("ADMIN");
            rolRepository.save(rol);
        }
        when(emailService.enviarPasswordTemporal(anyString(), anyString(), anyString())).thenReturn(true);
    }

    @AfterEach
    void limpiar() {
        usuarioRolRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    private static RegisterUserRequest request(String email, String ci) {
        return new RegisterUserRequest("Ana", "Pérez", ci, email, "ADMIN", true, true);
    }

    @Test
    void guardaElCorreoEnMinusculas() {
        RegisterUserResponse r = usuarioService.registrar(request("  Ana.Perez@UMSS.edu.bo ", "1234567"));
        assertThat(r.email()).isEqualTo("ana.perez@umss.edu.bo");
        assertThat(usuarioRepository.findByEmail("ana.perez@umss.edu.bo")).isPresent();
    }

    @Test
    void elMismoCorreoConOtrasMayusculasEsDuplicado() {
        usuarioService.registrar(request("ana@umss.edu.bo", "1234567"));
        assertThatThrownBy(() -> usuarioService.registrar(request("ANA@umss.edu.bo", "7654321")))
                .isInstanceOf(EmailDuplicadoException.class);
    }

    @Test
    void ciDuplicadoTieneSuPropioError() {
        usuarioService.registrar(request("ana@umss.edu.bo", "1234567"));
        assertThatThrownBy(() -> usuarioService.registrar(request("otra@umss.edu.bo", "1234567")))
                .isInstanceOf(CiDuplicadoException.class)
                .hasMessageContaining("1234567");
    }

    @Test
    void siNoSaleElCorreoNoQuedaElUsuario() {
        when(emailService.enviarPasswordTemporal(anyString(), anyString(), anyString()))
                .thenThrow(new CorreoNoEnviadoException("ana@umss.edu.bo"));
        assertThatThrownBy(() -> usuarioService.registrar(request("ana@umss.edu.bo", "1234567")))
                .isInstanceOf(CorreoNoEnviadoException.class);
        assertThat(usuarioRepository.findByEmail("ana@umss.edu.bo")).isEmpty();
    }

    @Test
    void conCorreoDeshabilitadoLoDiceEnLaRespuesta() {
        when(emailService.enviarPasswordTemporal(anyString(), anyString(), anyString())).thenReturn(false);
        RegisterUserResponse r = usuarioService.registrar(request("ana@umss.edu.bo", "1234567"));
        assertThat(r.mensaje()).contains("deshabilitado");
    }
}
