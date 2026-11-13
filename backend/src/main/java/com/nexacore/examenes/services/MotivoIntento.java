package com.nexacore.examenes.services;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Clasifica el motivo guardado de un intento de ingreso incorrecto y lo deja legible. Lo usan el reporte de intentos y
 * el inicio del ADMIN, para que ambos hablen igual:
 * <ul>
 *   <li>«Ambiente incorrecto: se presentó en el aula 660; aula asignada: 607» → Aula incorrecta (660, debía 607).</li>
 *   <li>«Intento ingresar no habilitado ### Motivo: X | Acción tomada: Y | Observaciones: Z» (excepción) →
 *       No habilitado: X, con la acción y las observaciones como detalle.</li>
 *   <li>Cualquier otro (lo escribe el control al identificar a alguien que no está en el examen) → No inscrito en la
 *       materia, con su texto como detalle.</li>
 * </ul>
 */
public final class MotivoIntento {
    private MotivoIntento() {}

    public static final String NO_INSCRITO = "NO_CORRESPONDE";
    public static final String AULA_INCORRECTA = "AULA_INCORRECTA";
    public static final String NO_HABILITADO = "NO_HABILITADO";

    static final String MARCA_AULA = "Ambiente incorrecto";
    static final String MARCA_NO_HABILITADO = "Intento ingresar no habilitado ###";
    private static final Pattern AULAS = Pattern.compile("aula\\s+([^;]+?)\\s*;\\s*aula asignada:\\s*(.+?)\\s*$", Pattern.CASE_INSENSITIVE);

    /** tipo (NO_CORRESPONDE, AULA_INCORRECTA o NO_HABILITADO), la etiqueta corta y el detalle (puede ser null). */
    public record Clasificacion(String tipo, String etiqueta, String detalle) {}

    public static Clasificacion de(String motivo) {
        String m = motivo == null ? "" : motivo.strip();
        if (m.startsWith(MARCA_AULA)) {
            Matcher a = AULAS.matcher(m);
            return new Clasificacion(AULA_INCORRECTA,
                    a.find() ? "Aula incorrecta (" + a.group(1).strip() + ", debía " + a.group(2).strip() + ")" : "Aula incorrecta", null);
        }
        if (m.startsWith(MARCA_NO_HABILITADO)) {
            Map<String, String> partes = partes(m.substring(MARCA_NO_HABILITADO.length()));
            String porque = partes.get("Motivo");
            StringBuilder detalle = new StringBuilder();
            if (partes.containsKey("Acción tomada")) detalle.append("Acción tomada: ").append(partes.get("Acción tomada"));
            if (partes.containsKey("Observaciones")) {
                if (!detalle.isEmpty()) detalle.append(" · ");
                detalle.append("Observaciones: ").append(partes.get("Observaciones"));
            }
            return new Clasificacion(NO_HABILITADO, porque == null || porque.isBlank() ? "No habilitado" : "No habilitado: " + porque,
                    detalle.isEmpty() ? null : detalle.toString());
        }
        return new Clasificacion(NO_INSCRITO, "No inscrito en la materia", m.isEmpty() ? null : m);
    }

    /** «Motivo: X | Acción tomada: Y» → {Motivo=X, Acción tomada=Y}. */
    private static Map<String, String> partes(String texto) {
        Map<String, String> mapa = new LinkedHashMap<>();
        for (String parte : texto.split("\\|")) {
            int dos = parte.indexOf(':');
            if (dos > 0) mapa.put(parte.substring(0, dos).strip(), parte.substring(dos + 1).strip());
        }
        return mapa;
    }
}
