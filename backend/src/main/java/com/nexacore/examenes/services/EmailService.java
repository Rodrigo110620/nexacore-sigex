package com.nexacore.examenes.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setFrom(from);
            helper.setTo(destinatario);
            helper.setSubject("SIGEX — Tus credenciales de acceso");
            helper.setText(construirHtml(nombreCompleto, destinatario, passwordTemporal), true);
            mailSender.send(mimeMessage);
            log.info("Correo de bienvenida enviado a {}", destinatario);
        } catch (MessagingException | MailException ex) {
            log.error("No se pudo enviar correo a {}: {}", destinatario, ex.getMessage());
        }
    }

    private static String construirHtml(String nombreCompleto, String email, String passwordTemporal) {
        String nombre = escapar(nombreCompleto);
        String correo = escapar(email);
        String clave = escapar(passwordTemporal);

        return """
                <!DOCTYPE html>
                <html lang="es">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;background:#F0F4FA;font-family:Arial,Helvetica,sans-serif;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#F0F4FA;padding:32px 16px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(1,17,64,0.08);">
                          <tr>
                            <td style="background:linear-gradient(135deg,#011140 0%%,#0439D9 100%%);padding:28px 32px;text-align:center;">
                              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">SIGEX</p>
                              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Sistema de Control de Ingreso a Exámenes</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:32px;">
                              <p style="margin:0 0 8px;color:#011140;font-size:18px;font-weight:700;">Hola, %s</p>
                              <p style="margin:0 0 24px;color:#4A5568;font-size:14px;line-height:1.6;">
                                Se creó tu cuenta en <strong style="color:#0439D9;">SIGEX</strong>.
                                Usa estas credenciales para iniciar sesión. Te recomendamos cambiar la contraseña después del primer acceso.
                              </p>
                              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#F8FBFF;border:1px solid #D8E3F5;border-radius:12px;">
                                <tr>
                                  <td style="padding:20px 24px;">
                                    <p style="margin:0 0 4px;color:#627A9B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Usuario (correo)</p>
                                    <p style="margin:0 0 16px;color:#011140;font-size:15px;font-weight:600;">%s</p>
                                    <p style="margin:0 0 4px;color:#627A9B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Contraseña temporal</p>
                                    <p style="margin:0;color:#0439D9;font-size:20px;font-weight:700;letter-spacing:2px;font-family:Consolas,Monaco,monospace;">%s</p>
                                  </td>
                                </tr>
                              </table>
                              <p style="margin:24px 0 0;color:#718096;font-size:12px;line-height:1.5;">
                                Si no solicitaste esta cuenta, ignora este mensaje o contacta al administrador del sistema.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:16px 32px 24px;border-top:1px solid #EDF1F7;text-align:center;">
                              <p style="margin:0;color:#9AA8BC;font-size:11px;">— Equipo NexaCore · SIGEX</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(nombre, correo, clave);
    }

    private static String escapar(String valor) {
        if (valor == null) {
            return "";
        }
        return valor
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
