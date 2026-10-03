package com.nexacore.examenes;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.ContrasenaAdminSembradoCheck;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** En prod, el admin sembrado no puede quedar con la contraseña publicada en el repositorio. */
@ExtendWith(MockitoExtension.class)
class ContrasenaAdminSembradoCheckTests {

    private static final String EMAIL = "admin.tis@umss.edu.bo";
    private static final PasswordEncoder ENCODER = new BCryptPasswordEncoder(4);

    @Mock UsuarioRepository usuarioRepository;

    @Test
    void reemplazaLaContrasenaSembradaPorLaDelEntorno() {
        Usuario admin = adminCon("Admin123*");
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(admin));

        check("Produccion#2026").run(null);

        assertThat(ENCODER.matches("Produccion#2026", admin.getPassword())).isTrue();
        verify(usuarioRepository).save(admin);
    }

    @Test
    void noArrancaSiConservaLaContrasenaSembradaYNoHayReemplazo() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(adminCon("Admin123*")));

        assertThatThrownBy(() -> check("").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_INITIAL_PASSWORD");
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void rechazaUnReemplazoQueNoCumpleLaPolitica() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(adminCon("Admin123*")));

        assertThatThrownBy(() -> check("corta").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("política");
        assertThatThrownBy(() -> check("Admin123*").run(null))
                .isInstanceOf(IllegalStateException.class);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void noHaceNadaSiLaContrasenaYaFueCambiada() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(adminCon("OtraClave#99")));

        check("").run(null);

        verify(usuarioRepository, never()).save(any());
    }

    private ContrasenaAdminSembradoCheck check(String contrasenaInicial) {
        return new ContrasenaAdminSembradoCheck(usuarioRepository, ENCODER, contrasenaInicial);
    }

    private static Usuario adminCon(String contrasena) {
        Usuario admin = new Usuario();
        admin.setEmail(EMAIL);
        admin.setPassword(ENCODER.encode(contrasena));
        return admin;
    }
}
