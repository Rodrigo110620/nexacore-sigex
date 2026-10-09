package com.nexacore.examenes.services;

import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenAula;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
import org.springframework.stereotype.Service;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Reparte a los estudiantes de un examen entre sus aulas: orden alfabético (apellidos y nombre)
 * llenando el aula principal hasta su aforo, luego la siguiente, y así. No se guarda: se calcula
 * siempre con los datos actuales, así que asociar a alguien puede mover a los que van después.
 * Los NO habilitados no ocupan lugar. Con una sola aula sin aforo registrado, entran todos.
 */
@Service
public class RepartoAulasService {

    /** Aula del examen en el orden en que se llena (0 = principal). */
    public record Aula(Integer idAmbiente, String nombre, Integer capacidad, int orden) {}

    /** Estudiante a ubicar; noHabilitado indica que no rinde el examen. */
    public record Candidato(Integer idEstudiante, String apellidos, String nombre, boolean noHabilitado) {}

    /**
     * aulaPorEstudiante: aula de cada ubicado. sinAula: estudiantes que no entraron por falta de aforo.
     * asignados: cuántos van a cada aula (por idAmbiente), en el orden de las aulas.
     */
    public record Reparto(List<Aula> aulas, Map<Integer, Aula> aulaPorEstudiante,
                          List<Integer> sinAula, Map<Integer, Integer> asignados) {

        public Aula aulaDe(Integer idEstudiante) {
            return aulaPorEstudiante.get(idEstudiante);
        }
    }

    private final ExamenAulaRepository examenAulaRepository;

    public RepartoAulasService(ExamenAulaRepository examenAulaRepository) {
        this.examenAulaRepository = examenAulaRepository;
    }

    /** Aula principal y adicionales del examen, en el orden en que se llenan. */
    public List<Aula> aulasDe(Examen examen) {
        List<Aula> aulas = new ArrayList<>();
        Ambiente principal = examen.getAmbiente();
        aulas.add(principal != null
                ? new Aula(principal.getId(), principal.getNombre(), principal.getCapacidad(), 0)
                : new Aula(examen.getIdAmbiente(), null, null, 0));
        for (ExamenAula ea : examenAulaRepository.adicionalesDe(examen.getId().getIdExamen())) {
            Ambiente a = ea.getAmbiente();
            aulas.add(new Aula(a.getId(), a.getNombre(), a.getCapacidad(), ea.getOrden()));
        }
        return aulas;
    }

    /** Reparto con los asociados del examen (asistencia_examen). */
    public Reparto repartir(Examen examen, List<AsistenciaExamen> asistencias) {
        List<Candidato> candidatos = asistencias.stream().map(a -> {
            Estudiante e = a.getEstudiante();
            return new Candidato(e.getId(), e.getApellidos(), e.getNombre(), Boolean.FALSE.equals(a.getHabilitado()));
        }).toList();
        return calcular(aulasDe(examen), candidatos);
    }

    /** Lógica pura del reparto: sin base de datos, para poder probarla directamente. */
    public static Reparto calcular(List<Aula> aulas, List<Candidato> candidatos) {
        Collator collator = Collator.getInstance(Locale.forLanguageTag("es"));
        collator.setStrength(Collator.SECONDARY);
        List<Candidato> ordenados = candidatos.stream()
                .filter(c -> !c.noHabilitado())
                .sorted(Comparator
                        .comparing((Candidato c) -> texto(c.apellidos()), collator)
                        .thenComparing(c -> texto(c.nombre()), collator)
                        .thenComparing(Candidato::idEstudiante))
                .toList();

        Map<Integer, Aula> aulaPorEstudiante = new HashMap<>();
        Map<Integer, Integer> asignados = new LinkedHashMap<>();
        aulas.forEach(a -> asignados.put(a.idAmbiente(), 0));
        List<Integer> sinAula = new ArrayList<>();
        boolean unicaSinAforo = aulas.size() == 1 && aulas.get(0).capacidad() == null;

        int indiceAula = 0;
        for (Candidato c : ordenados) {
            // Con varias aulas, una sin aforo no recibe a nadie: no se sabe cuántos caben.
            while (indiceAula < aulas.size() && !unicaSinAforo
                    && asignados.get(aulas.get(indiceAula).idAmbiente()) >= cupo(aulas.get(indiceAula))) {
                indiceAula++;
            }
            if (indiceAula >= aulas.size()) {
                sinAula.add(c.idEstudiante());
                continue;
            }
            Aula aula = aulas.get(indiceAula);
            aulaPorEstudiante.put(c.idEstudiante(), aula);
            asignados.merge(aula.idAmbiente(), 1, Integer::sum);
        }
        return new Reparto(aulas, aulaPorEstudiante, sinAula, asignados);
    }

    private static int cupo(Aula aula) {
        return aula.capacidad() == null ? 0 : aula.capacidad();
    }

    private static String texto(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
