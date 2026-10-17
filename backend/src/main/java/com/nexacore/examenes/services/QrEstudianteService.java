package com.nexacore.examenes.services;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteQrCredencial;
import com.nexacore.examenes.repositories.EstudianteQrCredencialRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

/** QR con secreto aleatorio: no se acepta el SIS solo ni se guarda el secreto en la BD. */
@Service
public class QrEstudianteService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String PREFIJO_TEMPORAL = "SIGEX3";
    private static final int NONCE_BYTES = 12;
    /** Vigencia del QR temporal del panel del estudiante; la app lo renueva antes de que venza. */
    public static final int SEGUNDOS_QR_TEMPORAL = 60;
    private final EstudianteQrCredencialRepository repository;
    private final EstudianteRepository estudianteRepository;
    private final SecretKeySpec encryptionKey;

    public QrEstudianteService(EstudianteQrCredencialRepository repository, EstudianteRepository estudianteRepository,
                               @Value("${app.security.jwt.secret}") String jwtSecret) {
        this.repository = repository;
        this.estudianteRepository = estudianteRepository;
        // Clave separada por contexto: aunque proviene del secreto de aplicación, no sirve como clave JWT.
        this.encryptionKey = new SecretKeySpec(sha256(
                ("sigex-qr-aes-gcm-v2:" + jwtSecret).getBytes(StandardCharsets.UTF_8)), "AES");
    }

    public record QrGenerado(String contenido, byte[] png) {}

    public record QrTemporal(String contenido, byte[] png, Instant expiraEn) {}

    @Transactional
    public QrGenerado crearSiNoExiste(Estudiante estudiante) {
        if (repository.existsById(estudiante.getId())) return null;
        return regenerar(estudiante);
    }

    @Transactional
    public QrGenerado regenerar(Estudiante estudiante) {
        byte[] secreto = new byte[32]; RANDOM.nextBytes(secreto);
        String credencial = Base64.getUrlEncoder().withoutPadding().encodeToString(secreto);
        EstudianteQrCredencial fila = repository.findById(estudiante.getId()).orElseGet(EstudianteQrCredencial::new);
        fila.setIdEstudiante(estudiante.getId());
        fila.setHashCredencial(hash(credencial));
        fila.setVersion(UUID.randomUUID()); fila.setRevocado(false); fila.setGeneradoEn(LocalDateTime.now());
        repository.save(fila);
        String contenido = cifrarContenido(estudiante.getCodigoSis(), credencial);
        return new QrGenerado(contenido, png(contenido));
    }

    /**
     * QR que el estudiante muestra desde su panel. No lleva la credencial (solo se guarda su hash),
     * sino el código SIS, la versión de la credencial y el vencimiento, cifrados con AES-GCM:
     * no se puede fabricar ni alterar, vence en SEGUNDOS_QR_TEMPORAL y deja de servir si la
     * credencial se revoca o se regenera. Si el estudiante aún no tiene credencial, se crea.
     */
    @Transactional
    public QrTemporal generarTemporal(Estudiante estudiante) {
        EstudianteQrCredencial fila = repository.findById(estudiante.getId())
                .filter(c -> !c.isRevocado())
                .orElse(null);
        if (fila == null) {
            regenerar(estudiante);
            fila = repository.findById(estudiante.getId()).orElseThrow();
        }
        Instant expiraEn = Instant.now().plusSeconds(SEGUNDOS_QR_TEMPORAL);
        String contenido = cifrar(PREFIJO_TEMPORAL,
                estudiante.getCodigoSis() + "." + fila.getVersion() + "." + expiraEn.getEpochSecond());
        return new QrTemporal(contenido, png(contenido), expiraEn);
    }

    @Transactional(readOnly = true)
    public String validar(String contenido) {
        if (contenido == null) throw new IllegalArgumentException("El código QR es inválido");
        if (contenido.trim().startsWith(PREFIJO_TEMPORAL + ".")) {
            return validarTemporal(contenido.trim());
        }
        String[] datos = descifrarContenido(contenido.trim());
        EstudianteQrCredencial fila = repository.findByHashCredencialAndRevocadoFalse(hash(datos[1]))
                .orElseThrow(() -> new IllegalArgumentException("El código QR es desconocido o fue revocado"));
        String sisRegistrado = estudianteRepository.findById(fila.getIdEstudiante())
                .orElseThrow(() -> new IllegalArgumentException("El estudiante del QR ya no existe"))
                .getCodigoSis();
        if (!MessageDigest.isEqual(sisRegistrado.getBytes(StandardCharsets.US_ASCII), datos[0].getBytes(StandardCharsets.US_ASCII)))
            throw new IllegalArgumentException("El código QR es inválido o fue alterado");
        return sisRegistrado;
    }

    private String validarTemporal(String contenido) {
        String[] datos;
        try {
            datos = descifrar(PREFIJO_TEMPORAL, contenido).split("\\.");
            if (datos.length != 3 || !datos[0].matches("\\d{9}")) throw new IllegalArgumentException();
        } catch (Exception e) { throw new IllegalArgumentException("El código QR es inválido o fue alterado"); }
        long expira;
        UUID version;
        try {
            version = UUID.fromString(datos[1]);
            expira = Long.parseLong(datos[2]);
        } catch (Exception e) { throw new IllegalArgumentException("El código QR es inválido o fue alterado"); }
        if (Instant.now().getEpochSecond() > expira) {
            throw new IllegalArgumentException("El código QR venció. Pide al estudiante que lo actualice en su celular");
        }
        Estudiante estudiante = estudianteRepository.findByCodigoSis(datos[0])
                .orElseThrow(() -> new IllegalArgumentException("El estudiante del QR ya no existe"));
        repository.findById(estudiante.getId())
                .filter(c -> !c.isRevocado() && version.equals(c.getVersion()))
                .orElseThrow(() -> new IllegalArgumentException("El código QR es desconocido o fue revocado"));
        return estudiante.getCodigoSis();
    }

    /** El contenido escaneable es opaco para lectores ajenos; AES-GCM además detecta modificaciones. */
    private String cifrarContenido(String sis, String credencial) {
        return cifrar("SIGEX2", sis + "." + credencial);
    }

    /** prefijo.base64(nonce + AES-GCM(texto)), con el prefijo como dato autenticado. */
    private String cifrar(String prefijo, String texto) {
        try {
            byte[] nonce = new byte[NONCE_BYTES]; RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(128, nonce));
            cipher.updateAAD(prefijo.getBytes(StandardCharsets.US_ASCII));
            byte[] cifrado = cipher.doFinal(texto.getBytes(StandardCharsets.UTF_8));
            byte[] paquete = new byte[nonce.length + cifrado.length];
            System.arraycopy(nonce, 0, paquete, 0, nonce.length);
            System.arraycopy(cifrado, 0, paquete, nonce.length, cifrado.length);
            return prefijo + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(paquete);
        } catch (Exception e) { throw new IllegalStateException("No se pudo cifrar el QR", e); }
    }

    private String descifrar(String prefijo, String contenido) throws Exception {
        String[] partes = contenido.split("\\.");
        if (partes.length != 2 || !prefijo.equals(partes[0])) throw new IllegalArgumentException();
        byte[] paquete = Base64.getUrlDecoder().decode(partes[1]);
        if (paquete.length <= NONCE_BYTES + 16) throw new IllegalArgumentException();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(128, paquete, 0, NONCE_BYTES));
        cipher.updateAAD(prefijo.getBytes(StandardCharsets.US_ASCII));
        return new String(cipher.doFinal(paquete, NONCE_BYTES, paquete.length - NONCE_BYTES), StandardCharsets.UTF_8);
    }

    private String[] descifrarContenido(String contenido) {
        try {
            String[] partes = contenido.split("\\.");
            if (partes.length != 2 || !"SIGEX2".equals(partes[0])) throw new IllegalArgumentException();
            byte[] paquete = Base64.getUrlDecoder().decode(partes[1]);
            if (paquete.length <= NONCE_BYTES + 16) throw new IllegalArgumentException();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(128, paquete, 0, NONCE_BYTES));
            cipher.updateAAD("SIGEX2".getBytes(StandardCharsets.US_ASCII));
            String[] datos = new String(cipher.doFinal(paquete, NONCE_BYTES, paquete.length - NONCE_BYTES), StandardCharsets.UTF_8).split("\\.", 2);
            if (datos.length != 2 || !datos[0].matches("\\d{9}") || datos[1].length() < 40) throw new IllegalArgumentException();
            return datos;
        } catch (Exception e) { throw new IllegalArgumentException("El código QR es inválido o fue alterado"); }
    }

    private static String hash(String value) { return java.util.HexFormat.of().formatHex(sha256(value.getBytes(StandardCharsets.UTF_8))); }

    private static byte[] sha256(byte[] value) {
        try { return MessageDigest.getInstance("SHA-256").digest(value); }
        catch (Exception e) { throw new IllegalStateException("No se pudo calcular el hash", e); }
    }

    /** Imagen limpia: el nombre no se incrusta ni visualmente ni en el contenido QR. */
    private static byte[] png(String value) {
        try {
            BitMatrix matriz = new QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, 320, 320);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matriz, "PNG", out);
            return out.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el QR", e); }
    }
}
