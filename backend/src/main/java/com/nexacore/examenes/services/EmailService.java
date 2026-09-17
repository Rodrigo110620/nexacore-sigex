package com.nexacore.examenes.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Envía correos vía SMTP (Mailtrap en desarrollo, Gmail/dominio en producción).
 * Si MAIL_ENABLED=false o faltan credenciales, no envía y no rompe el registro.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;
    private final String username;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.enabled:true}") boolean enabled,
            @Value("${app.mail.from:noreply@sigex.local}") String from,
            @Value("${spring.mail.username:}") String username) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.username = username;
    }

    /**
     * Envía la contraseña temporal al correo del usuario recién registrado.
     * Fallos de SMTP se registran pero no se propagan (el usuario ya quedó creado).
     */
    public void enviarPasswordTemporal(String destinatario, String nombreCompleto, String passwordTemporal) {
        if (!enabled) {
            log.debug("Correo deshabilitado (MAIL_ENABLED=false); no se envía a {}", destinatario);
            return;
        }
        if (!StringUtils.hasText(username)) {
            log.warn("MAIL_USERNAME vacío: no se envía correo a {}", destinatario);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(destinatario);
            message.setSubject("SIGEX — Credenciales de acceso");
            message.setText(
                    "Hola " + nombreCompleto + ",\n\n"
                            + "Se creó tu cuenta en SIGEX.\n\n"
                            + "Usuario (email): " + destinatario + "\n"
                            + "Contraseña temporal: " + passwordTemporal + "\n\n"
                            + "Te recomendamos cambiarla al iniciar sesión.\n\n"
                            + "— Equipo SIGEX\n"
            );
            mailSender.send(message);
            log.info("Correo de bienvenida enviado a {}", destinatario);
        } catch (MailException ex) {
            log.error("No se pudo enviar correo a {}: {}", destinatario, ex.getMessage());
        }
    }
}
