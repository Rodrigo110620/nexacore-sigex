package com.nexacore.examenes.security;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * En producción no se permite que el administrador sembrado por las migraciones (V3/V5)
 * conserve su contraseña de laboratorio, que está publicada en el repositorio.
 *
 * Si la conserva, se reemplaza al arrancar por ADMIN_INITIAL_PASSWORD; si esa variable no
 * está definida, la aplicación no arranca. No se puede exigir el cambio desde la aplicación
 * porque, sin otra cuenta ADMIN, nadie podría entrar a hacerlo.
 */
@Component
@Profile("prod")
public class ContrasenaAdminSembradoCheck implements ApplicationRunner {

    static final String EMAIL_ADMIN_SEMBRADO = "admin.tis@umss.edu.bo";
    static final String CONTRASENA_SEMBRADA = "Admin123*";

    private static final Logger log = LoggerFactory.getLogger(ContrasenaAdminSembradoCheck.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String contrasenaInicial;

    public ContrasenaAdminSembradoCheck(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.security.admin-initial-password:}") String contrasenaInicial) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.contrasenaInicial = contrasenaInicial;
    }

    @Override
    public void run(ApplicationArguments args) {
        Usuario admin = usuarioRepository.findByEmail(EMAIL_ADMIN_SEMBRADO).orElse(null);
        if (admin == null || !passwordEncoder.matches(CONTRASENA_SEMBRADA, admin.getPassword())) {
            return;
        }
        if (contrasenaInicial == null || contrasenaInicial.isBlank()) {
            throw new IllegalStateException("El administrador " + EMAIL_ADMIN_SEMBRADO
                    + " conserva la contraseña de laboratorio publicada en el repositorio. "
                    + "Define ADMIN_INITIAL_PASSWORD para reemplazarla al arrancar.");
        }
        if (passwordEncoder.matches(contrasenaInicial, admin.getPassword())) {
            throw new IllegalStateException("ADMIN_INITIAL_PASSWORD no puede ser la contraseña de laboratorio.");
        }
        try {
            PasswordPolicy.validate(contrasenaInicial);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("ADMIN_INITIAL_PASSWORD no cumple la política: " + ex.getMessage(), ex);
        }
        admin.setPassword(passwordEncoder.encode(contrasenaInicial));
        usuarioRepository.save(admin);
        log.warn("Se reemplazó la contraseña de laboratorio de {} por ADMIN_INITIAL_PASSWORD. "
                + "Ya puedes quitar la variable del entorno.", EMAIL_ADMIN_SEMBRADO);
    }
}
