package com.nexacore.examenes.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.AulaExamenResponse;
import com.nexacore.examenes.dto.CrearExamenRequest;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.dto.NormaParticularRequest;
import com.nexacore.examenes.exceptions.ConflictoExamenException;
import com.nexacore.examenes.exceptions.ExamenNoEncontradoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Docente;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenAula;
import com.nexacore.examenes.models.ExamenAulaId;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.models.Paralelo;
import com.nexacore.examenes.models.ParaleloId;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.DocenteRepository;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.repositories.ParaleloRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexacore.examenes.utils.ValidacionPalabras;
import java.text.Normalizer;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Comparator;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class ExamenService {

    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final MateriaRepository materiaRepository;
    private final DocenteRepository docenteRepository;
    private final ParaleloRepository paraleloRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final AsistenciaExamenRepository asistenciaExamenRepository;
    private final ObjectMapper objectMapper;
    private final ExamenAulaRepository examenAulaRepository;

    private static final Set<String> PALABRAS_VACIAS = Set.of(
            "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E", "EN", "AL", "PARA", "POR", "CON");

    @PersistenceContext
    private EntityManager entityManager;

    public ExamenService(
            ExamenRepository examenRepository,
            AmbienteRepository ambienteRepository,
            MateriaRepository materiaRepository,
            DocenteRepository docenteRepository,
            ParaleloRepository paraleloRepository,
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            AsistenciaExamenRepository asistenciaExamenRepository,
            ObjectMapper objectMapper,
            ExamenAulaRepository examenAulaRepository) {
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.materiaRepository = materiaRepository;
        this.docenteRepository = docenteRepository;
        this.paraleloRepository = paraleloRepository;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.asistenciaExamenRepository = asistenciaExamenRepository;
        this.objectMapper = objectMapper;
        this.examenAulaRepository = examenAulaRepository;
    }

    @Transactional(readOnly = true)
    public List<ExamenResponse> listar() {
        List<Examen> examenes = examenesVisibles();
        Catalogos catalogos = catalogosDe(examenes);
        return examenes.stream()
                .map(examen -> toResponse(examen, catalogos))
                .toList();
    }

    private List<Examen> examenesVisibles() {
        if (SesionActual.esSoloDocente()) {
            Integer idDocente = usuarioRepository.findByEmail(SesionActual.email())
                    .map(Usuario::getId)
                    .orElse(-1);
            return examenRepository.findByIdDocenteOrderByFechaDescHoraInicioDesc(idDocente);
        }
        return examenRepository.findAllByOrderByFechaDescHoraInicioDesc();
    }

    /** Un DOCENTE no puede crear un examen en representación de otro docente. */
    private Docente resolverDocenteParaRegistro(CrearExamenRequest request) {
        if (SesionActual.esSoloDocente()) {
            Integer idDocente = usuarioRepository.findByEmail(SesionActual.email())
                    .map(Usuario::getId)
                    .orElseThrow(() -> new IllegalArgumentException("No se encontró el docente autenticado."));
            return docenteRepository.findById(idDocente)
                    .orElseThrow(() -> new IllegalArgumentException("El usuario autenticado no está registrado como DOCENTE."));
        }
        return resolverDocente(request.idDocente(), request.docente().trim());
    }
    @Transactional
    public ExamenResponse crear(CrearExamenRequest request) {
        // Bloqueo del ambiente hasta el commit: dos registros simultáneos no pueden pasar a la vez
        // la validación de horario. Un mismo docente sí puede tener exámenes a la misma hora en
        // aulas distintas (varias materias o paralelos); lo que no se repite es el aula.
        Ambiente ambiente = ambienteRepository.bloquear(request.idAmbiente())
                .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe"));

        validarNoPasado(request.fecha(), request.horaInicio());
        validarSinConflicto(request.idAmbiente(), request.fecha(), request.horaInicio(), request.duracionMinutos(),
                null);

        Materia materia = resolverMateria(request.idMateria(), request.asignatura().trim());
        Docente docente = resolverDocenteParaRegistro(request);
        List<Ambiente> adicionales = validarAulasAdicionales(ambiente, request.idAmbientesAdicionales(),
                request.fecha(), request.horaInicio(), request.duracionMinutos(), null);
        Paralelo paralelo = resolverParalelo(materia, docente);

        Integer idExamen = ((Number) entityManager
                .createNativeQuery("SELECT nextval('examen_id_examen_seq')")
                .getSingleResult()).intValue();

        ExamenId examenId = new ExamenId();
        examenId.setIdExamen(idExamen);
        examenId.setIdParalelo(paralelo.getId().getIdParalelo());

        Examen examen = new Examen();
        examen.setId(examenId);
        examen.setIdMateria(materia.getId());
        examen.setIdDocente(docente.getIdUsuario());
        examen.setFecha(request.fecha());
        examen.setHoraInicio(request.horaInicio());
        examen.setDuracionMinutos(request.duracionMinutos());
        examen.setIdAmbiente(ambiente.getId());
        examen.setEstado("programado");
        examen.setModoReparto(modoReparto(request.modoReparto(), Examen.MODO_ALFABETICO));
        validarNormasNuevas(request.normasGenerales(), request.normasParticulares(), NormasGuardadas.VACIAS, null);
        examen.setNormas(serializarNormas(new NormasGuardadas(
                listaSegura(request.normasGenerales()), listaSegura(request.normasParticulares()),
                List.of(), List.of())));

        Examen guardado = examenRepository.save(examen);
        guardarAulasAdicionales(idExamen, adicionales);
        registrarAuditoria("EXAMEN_CREADO", Map.of(
                "idExamen", guardado.getId().getIdExamen(),
                "idParalelo", guardado.getId().getIdParalelo(),
                "examen", resumen(guardado)));
        return toResponse(guardado);
    }

    @Transactional
    public ExamenResponse actualizar(Integer idExamen, Integer idParalelo, ActualizarExamenRequest request) {
        ExamenId examenId = new ExamenId();
        examenId.setIdExamen(idExamen);
        examenId.setIdParalelo(idParalelo);

        Examen examen = examenRepository.findById(examenId)
                .orElseThrow(() -> new ExamenNoEncontradoException(idExamen));

        Ambiente ambiente = ambienteRepository.bloquear(request.idAmbiente())
                .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe"));

        boolean cambiaHorario = !request.fecha().equals(examen.getFecha())
                || !request.horaInicio().equals(examen.getHoraInicio());
        if (cambiaHorario) {
            validarNoPasado(request.fecha(), request.horaInicio());
        }

        // Validar conflicto excluyendo el propio examen
        validarSinConflicto(
                request.idAmbiente(), request.fecha(), request.horaInicio(), request.duracionMinutos(), idExamen);

        Materia materia = resolverMateria(request.idMateria(), request.asignatura().trim());
        Docente docente = resolverDocente(request.idDocente(), request.docente().trim());
        // null conserva las aulas adicionales que ya tenía; igual se revalidan con el nuevo horario.
        List<Integer> idsAdicionales = request.idAmbientesAdicionales() != null
                ? request.idAmbientesAdicionales()
                : examenAulaRepository.adicionalesDe(idExamen).stream().map(ea -> ea.getId().getIdAmbiente()).toList();
        List<Ambiente> adicionales = validarAulasAdicionales(ambiente, idsAdicionales,
                request.fecha(), request.horaInicio(), request.duracionMinutos(), idExamen);

        Map<String, Object> antes = resumen(examen);
        NormasGuardadas previas = leerNormas(examen.getNormas());
        validarNormasNuevas(request.normasGenerales(), request.normasParticulares(), previas, examen);
        String normas = serializarNormas(combinarEliminadas(previas, request));

        boolean cambiaParalelo = !materia.getId().equals(examen.getIdMateria())
                || !docente.getIdUsuario().equals(examen.getIdDocente());
        if (cambiaParalelo) {
            examen = moverAParalelo(examen, resolverParalelo(materia, docente));
        }

        examen.setFecha(request.fecha());
        examen.setHoraInicio(request.horaInicio());
        examen.setDuracionMinutos(request.duracionMinutos());
        examen.setIdAmbiente(ambiente.getId());
        examen.setNormas(normas);
        examen.setModoReparto(modoReparto(request.modoReparto(), examen.getModoReparto()));

        Examen guardado = examenRepository.save(examen);
        guardarAulasAdicionales(idExamen, adicionales);
        registrarAuditoria("EXAMEN_MODIFICADO", Map.of(
                "idExamen", idExamen,
                "idParaleloAnterior", idParalelo,
                "idParalelo", guardado.getId().getIdParalelo(),
                "antes", antes,
                "despues", resumen(guardado)));
        return toResponse(guardado);
    }

    /**
     * id_paralelo forma parte de la PK del examen y de la FK compuesta a paralelo
     * (id_paralelo, id_materia, id_docente), así que cambiar asignatura o docente
     * exige mover el examen al paralelo correspondiente.
     */
    private Examen moverAParalelo(Examen examen, Paralelo destino) {
        Integer idExamen = examen.getId().getIdExamen();
        Integer idParaleloActual = examen.getId().getIdParalelo();
        Number dependientes = (Number) entityManager.createNativeQuery("""
                SELECT (SELECT COUNT(*) FROM public.asistencia_examen WHERE id_examen = :e AND id_paralelo = :p)
                     + (SELECT COUNT(*) FROM public.intento_ingreso WHERE id_examen = :e AND id_paralelo = :p)
                     + (SELECT COUNT(*) FROM public.registro_control_ingreso WHERE id_examen = :e AND id_paralelo = :p)
                     + (SELECT COUNT(*) FROM public.incidencia WHERE id_examen = :e AND id_paralelo = :p)
                """)
                .setParameter("e", idExamen)
                .setParameter("p", idParaleloActual)
                .getSingleResult();
        if (dependientes.longValue() > 0) {
            throw new ConflictoExamenException(
                    "No se puede cambiar la asignatura o el docente: el examen ya tiene estudiantes habilitados "
                            + "o registros de ingreso. Registra un examen nuevo para la otra asignatura.");
        }

        ParaleloId destinoId = destino.getId();
        entityManager.flush();
        entityManager.detach(examen);
        entityManager.createNativeQuery("""
                UPDATE public.examen
                   SET id_paralelo = :np, id_materia = :m, id_docente = :d
                 WHERE id_examen = :e AND id_paralelo = :p
                """)
                .setParameter("np", destinoId.getIdParalelo())
                .setParameter("m", destinoId.getIdMateria())
                .setParameter("d", destinoId.getIdDocente())
                .setParameter("e", idExamen)
                .setParameter("p", idParaleloActual)
                .executeUpdate();

        ExamenId nuevoId = new ExamenId();
        nuevoId.setIdExamen(idExamen);
        nuevoId.setIdParalelo(destinoId.getIdParalelo());
        return examenRepository.findById(nuevoId)
                .orElseThrow(() -> new IllegalStateException("No se pudo mover el examen al nuevo paralelo"));
    }

    @Transactional
    public void cancelar(Integer idExamen, Integer idParalelo) {
        ExamenId examenId = new ExamenId();
        examenId.setIdExamen(idExamen);
        examenId.setIdParalelo(idParalelo);

        Examen examen = examenRepository.findById(examenId)
                .orElseThrow(() -> new ExamenNoEncontradoException(idExamen));
        String estadoAnterior = examen.getEstado();
        examen.setEstado("cancelado");
        examenRepository.save(examen);
        registrarAuditoria("EXAMEN_CANCELADO", Map.of(
                "idExamen", idExamen,
                "idParalelo", idParalelo,
                "estadoAnterior", estadoAnterior == null ? "" : estadoAnterior));
    }

    /** idExamenExcluido: el propio examen al editar (id_examen es único), o null al crear. */
    private void validarSinConflicto(
            Integer idAmbiente, java.time.LocalDate fecha, LocalTime inicio, int duracionMinutos,
            Integer idExamenExcluido) {
        Examen otro = primerSolapado(examenRepository.findByAmbienteAndFecha(idAmbiente, fecha),
                inicio, duracionMinutos, idExamenExcluido);
        if (otro != null) {
            String nombre = ambienteRepository.findById(idAmbiente).map(Ambiente::getNombre).orElse("indicado");
            throw new ConflictoExamenException(
                    "El ambiente " + nombre + " ya tiene un examen el " + fecha
                            + " entre " + otro.getHoraInicio() + " y " + finDe(otro)
                            + ". Elige otro horario o ambiente.");
        }
    }

    static final int MAX_AULAS_ADICIONALES = 9;

    /** ALFABETICO o LLEGADA; null deja el valor por defecto (al crear) o el que ya tenía (al editar). */
    private static String modoReparto(String valor, String porDefecto) {
        if (valor == null || valor.isBlank()) {
            return porDefecto == null ? Examen.MODO_ALFABETICO : porDefecto;
        }
        String modo = valor.trim().toUpperCase(Locale.ROOT);
        if (!modo.equals(Examen.MODO_ALFABETICO) && !modo.equals(Examen.MODO_LLEGADA)) {
            throw new IllegalArgumentException("El reparto debe ser por orden alfabético o por orden de llegada.");
        }
        return modo;
    }

    /**
     * Aulas que se suman a la principal, en el orden recibido. No pueden repetirse ni estar ocupadas
     * a esa hora, y si hay más de una aula todas necesitan aforo: el reparto llena cada una hasta su aforo.
     */
    private List<Ambiente> validarAulasAdicionales(
            Ambiente principal, List<Integer> ids, java.time.LocalDate fecha, LocalTime inicio, int duracionMinutos,
            Integer idExamenExcluido) {
        List<Integer> lista = listaSegura(ids);
        if (lista.size() > MAX_AULAS_ADICIONALES) {
            throw new IllegalArgumentException(
                    "Un examen admite hasta " + MAX_AULAS_ADICIONALES + " aulas adicionales.");
        }
        Set<Integer> vistos = new HashSet<>(Set.of(principal.getId()));
        for (Integer id : lista) {
            if (id == null || !vistos.add(id)) {
                throw new IllegalArgumentException("Cada aula del examen debe ser distinta.");
            }
        }
        // Bloqueo en orden de id (igual que en crear) para que dos registros no se crucen.
        Map<Integer, Ambiente> bloqueados = new HashMap<>();
        for (Integer id : lista.stream().sorted().toList()) {
            bloqueados.put(id, ambienteRepository.bloquear(id)
                    .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe")));
        }
        List<Ambiente> aulas = lista.stream().map(bloqueados::get).toList();
        for (Ambiente aula : aulas) {
            validarSinConflicto(aula.getId(), fecha, inicio, duracionMinutos, idExamenExcluido);
        }
        if (!aulas.isEmpty()) {
            List<String> sinAforo = Stream.concat(Stream.of(principal), aulas.stream())
                    .filter(a -> a.getCapacidad() == null)
                    .map(Ambiente::getNombre)
                    .toList();
            if (!sinAforo.isEmpty()) {
                throw new IllegalArgumentException("Para repartir a los estudiantes en varias aulas, registra el aforo de: "
                        + String.join(", ", sinAforo) + ".");
            }
        }
        return aulas;
    }

    private void guardarAulasAdicionales(Integer idExamen, List<Ambiente> aulas) {
        examenAulaRepository.eliminarDe(idExamen);
        List<ExamenAula> filas = new ArrayList<>();
        for (int i = 0; i < aulas.size(); i++) {
            ExamenAula fila = new ExamenAula();
            fila.setId(new ExamenAulaId(idExamen, aulas.get(i).getId()));
            fila.setOrden((short) (i + 1));
            // La relación no se inserta (insertable = false), pero queda en caché tras guardar: sin ella,
            // la respuesta lee estas mismas filas con el aula en null y falla al armar la lista de aulas.
            fila.setAmbiente(aulas.get(i));
            filas.add(fila);
        }
        examenAulaRepository.saveAll(filas);
    }

    private static Examen primerSolapado(
            List<Examen> examenes, LocalTime inicio, int duracionMinutos, Integer idExamenExcluido) {
        LocalTime fin = inicio.plusMinutes(duracionMinutos);
        for (Examen otro : examenes) {
            if (otro.getId().getIdExamen().equals(idExamenExcluido)) {
                continue;
            }
            if (inicio.isBefore(finDe(otro)) && otro.getHoraInicio().isBefore(fin)) {
                return otro;
            }
        }
        return null;
    }

    private static LocalTime finDe(Examen examen) {
        return examen.getHoraInicio().plusMinutes(examen.getDuracionMinutos());
    }

    private void validarNoPasado(java.time.LocalDate fecha, LocalTime horaInicio) {
        java.time.LocalDate hoy = java.time.LocalDate.now();
        if (fecha.isBefore(hoy)) {
            throw new IllegalArgumentException("No se permite registrar un examen con fecha anterior a hoy.");
        }
        if (fecha.isEqual(hoy) && horaInicio.isBefore(LocalTime.now().withSecond(0).withNano(0))) {
            throw new IllegalArgumentException("Para hoy, la hora de inicio no puede ser anterior a la hora actual.");
        }
    }

    private Materia resolverMateria(Integer idMateria, String nombre) {
        if (idMateria != null) {
            return materiaRepository.findById(idMateria)
                    .map(this::corregirSiglaSiEsNombre)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "La asignatura seleccionada no existe en el catálogo institucional."));
        }
        String texto = nombre == null ? "" : nombre.trim();
        return materiaRepository.findByNombreIgnoreCase(texto)
                .or(() -> materiaRepository.findBySiglaIgnoreCase(texto))
                .map(this::corregirSiglaSiEsNombre)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No se encontró una asignatura en el catálogo institucional: " + texto
                                + ". Selecciona una sugerencia válida."));
    }

    private Materia corregirSiglaSiEsNombre(Materia materia) {
        if (!siglaEsNombreConcatenado(materia.getSigla(), materia.getNombre())) {
            return materia;
        }
        materia.setSigla(siglaUnicaDesdeNombre(materia.getNombre()));
        return materiaRepository.save(materia);
    }

    private boolean siglaEsNombreConcatenado(String sigla, String nombre) {
        if (sigla == null || sigla.isBlank() || sigla.contains("-")) {
            return false;
        }

        String compacta = compactar(sigla);
        if (compacta.length() <= 4) {
            return false;
        }
        String compactaNombre = compactar(nombre);
        return compactaNombre.startsWith(compacta)
                || compacta.startsWith(compactaNombre.substring(0, Math.min(8, compactaNombre.length())));
    }

    private String siglaUnicaDesdeNombre(String nombre) {
        String prefijo = prefijoDesdeNombre(nombre);
        int n = 101;
        String candidata = prefijo + "-" + n;
        while (materiaRepository.findBySiglaIgnoreCase(candidata).isPresent()) {
            n++;
            candidata = prefijo + "-" + n;
        }
        return candidata;
    }

    private String prefijoDesdeNombre(String nombre) {
        String normalizado = Normalizer.normalize(nombre, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9\\s]", " ");
        List<String> palabras = new ArrayList<>();
        for (String palabra : normalizado.trim().split("\\s+")) {
            if (palabra.isBlank() || PALABRAS_VACIAS.contains(palabra) || esNivel(palabra)) {
                continue;
            }
            palabras.add(palabra);
        }
        if (palabras.isEmpty()) {
            return "MAT";
        }
        if (palabras.size() == 1) {
            String unica = palabras.get(0);
            return unica.length() >= 3 ? unica.substring(0, 3) : unica;
        }
        StringBuilder iniciales = new StringBuilder();
        for (String palabra : palabras) {
            iniciales.append(palabra.charAt(0));
        }
        if (iniciales.length() >= 3) {
            return iniciales.substring(0, 3);
        }
        String ultima = palabras.get(palabras.size() - 1);
        for (int i = 1; i < ultima.length() && iniciales.length() < 3; i++) {
            iniciales.append(ultima.charAt(i));
        }
        String primera = palabras.get(0);
        for (int i = 1; i < primera.length() && iniciales.length() < 3; i++) {
            iniciales.append(primera.charAt(i));
        }
        return iniciales.toString();
    }

    private boolean esNivel(String palabra) {
        return palabra.matches("I|II|III|IV|V|VI|VII|VIII|IX|X") || palabra.matches("\\d+");
    }

    private String compactar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "");
    }

    /**
     * Solo un docente del catálogo y activo. Sin id (exámenes antiguos) se acepta únicamente
     * una coincidencia exacta del nombre completo, nunca un texto parcial o inventado.
     */
    private Docente resolverDocente(Integer idDocente, String texto) {
        Docente docente;
        if (idDocente != null) {
            docente = docenteRepository.findById(idDocente)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "El docente seleccionado no está registrado como DOCENTE."));
        } else {
            List<Docente> matches = docenteRepository.findByNombreCompleto(texto == null ? "" : texto.trim());
            if (matches.size() != 1) {
                throw new IllegalArgumentException(
                        "Selecciona un docente de las sugerencias del catálogo institucional.");
            }
            docente = matches.get(0);
        }
        String estado = docente.getUsuario() == null ? null : docente.getUsuario().getEstado();
        if (estado != null && !estado.equalsIgnoreCase("activo")) {
            throw new IllegalArgumentException("El docente seleccionado no está habilitado.");
        }
        return docente;
    }

    private Paralelo resolverParalelo(Materia materia, Docente docente) {
        return paraleloRepository
                .findFirstByMateriaAndDocente(materia.getId(), docente.getIdUsuario())
                .orElseGet(() -> {
                    Integer idParalelo = ((Number) entityManager
                            .createNativeQuery("SELECT nextval('paralelo_id_paralelo_seq')")
                            .getSingleResult()).intValue();
                    ParaleloId pid = new ParaleloId();
                    pid.setIdParalelo(idParalelo);
                    pid.setIdMateria(materia.getId());
                    pid.setIdDocente(docente.getIdUsuario());
                    Paralelo p = new Paralelo();
                    p.setId(pid);
                    p.setMateria(materia);
                    p.setDocente(docente);
                    p.setNombreGrupo("G1");
                    return paraleloRepository.save(p);
                });
    }

    /** Normas activas más las eliminadas lógicamente, que se conservan como historial. */
    private record NormasGuardadas(
            List<String> generales,
            List<NormaParticularRequest> particulares,
            List<String> generalesEliminadas,
            List<NormaParticularRequest> particularesEliminadas) {
        static final NormasGuardadas VACIAS = new NormasGuardadas(List.of(), List.of(), List.of(), List.of());
    }

    private static final int NORMA_MIN = 10;
    private static final int NORMA_MAX = 150;
    private static final Pattern LETRA = Pattern.compile("\\p{L}");
    /** Letras (con tildes y ñ), números, espacios y puntuación básica: "CI: original y vigente", "30 minutos". */
    private static final Pattern NORMA_CARACTERES = Pattern.compile("[\\p{L}0-9 .,;:()¿?¡!\"'/%\\-]+");
    /** Un mismo fragmento corto repetido sin sentido: "ababababab", "jajajajaja", "1212121212". */
    private static final Pattern PATRON_REPETIDO = Pattern.compile("(?i)(.{1,3})\\1{3,}");

    private static <T> List<T> listaSegura(List<T> lista) {
        return lista == null ? List.of() : lista;
    }

    private NormasGuardadas leerNormas(String json) {
        if (json == null || json.isBlank()) {
            return NormasGuardadas.VACIAS;
        }
        try {
            Map<String, Object> map = objectMapper.readValue(json, new TypeReference<>() {});
            return new NormasGuardadas(
                    textos(map.get("generales")),
                    particulares(map.get("particulares")),
                    textos(map.get("generalesEliminadas")),
                    particulares(map.get("particularesEliminadas")));
        } catch (JsonProcessingException e) {
            return new NormasGuardadas(List.of(json), List.of(), List.of(), List.of());
        }
    }

    private static List<String> textos(Object valor) {
        return valor instanceof List<?> list ? list.stream().map(String::valueOf).toList() : List.of();
    }

    private List<NormaParticularRequest> particulares(Object valor) {
        return valor == null ? List.of() : objectMapper.convertValue(valor, new TypeReference<>() {});
    }

    private String serializarNormas(NormasGuardadas normas) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("generales", normas.generales());
        payload.put("particulares", normas.particulares());
        payload.put("generalesEliminadas", normas.generalesEliminadas());
        payload.put("particularesEliminadas", normas.particularesEliminadas());
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("No se pudieron guardar las normas");
        }
    }

    /**
     * Solo se registran como eliminadas las normas que estaban guardadas; las que se agregaron
     * y quitaron en la misma edición nunca existieron en la base de datos.
     */
    private NormasGuardadas combinarEliminadas(NormasGuardadas previas, ActualizarExamenRequest request) {
        List<String> generalesEliminadas = new ArrayList<>(previas.generalesEliminadas());
        for (String texto : listaSegura(request.normasGeneralesEliminadas())) {
            if (previas.generales().contains(texto)) {
                generalesEliminadas.add(texto);
            }
        }
        List<NormaParticularRequest> particularesEliminadas = new ArrayList<>(previas.particularesEliminadas());
        for (NormaParticularRequest norma : listaSegura(request.normasParticularesEliminadas())) {
            if (previas.particulares().contains(norma)) {
                particularesEliminadas.add(norma);
            }
        }
        return new NormasGuardadas(
                listaSegura(request.normasGenerales()),
                listaSegura(request.normasParticulares()),
                generalesEliminadas,
                particularesEliminadas);
    }

    /**
     * Las normas ya guardadas no se revalidan, para no bloquear la edición de exámenes
     * registrados antes de estas reglas.
     */
    /** examen es null al registrar; al editar sirve para exigir que el estudiante siga habilitado. */
    private void validarNormasNuevas(
            List<String> generales, List<NormaParticularRequest> particulares, NormasGuardadas previas,
            Examen examen) {
        Set<String> vistas = new HashSet<>();
        for (String texto : listaSegura(generales)) {
            if (!previas.generales().contains(texto)) {
                validarTextoNorma(texto, "general");
            }
            if (texto != null && !vistas.add(texto.trim().toLowerCase())) {
                throw new IllegalArgumentException("La norma general \"" + texto + "\" está repetida.");
            }
        }
        Set<String> vistasParticulares = new HashSet<>();
        for (NormaParticularRequest norma : listaSegura(particulares)) {
            if (norma.estudiante() == null || norma.estudiante().isBlank()) {
                throw new IllegalArgumentException("Cada norma particular debe indicar el estudiante.");
            }
            if (!previas.particulares().contains(norma)) {
                validarTextoNorma(norma.texto(), "particular");
                validarEstudianteDeNorma(norma, examen);
            }
            String clave = norma.estudiante().trim().toLowerCase() + "|" + norma.texto().trim().toLowerCase();
            if (!vistasParticulares.add(clave)) {
                throw new IllegalArgumentException(
                        "La norma particular \"" + norma.texto() + "\" está repetida para " + norma.estudiante() + ".");
            }
        }
    }

    private static void validarTextoNorma(String texto, String tipo) {
        String prefijo = "Norma " + tipo + ": ";
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException(prefijo + "no puede estar vacía.");
        }
        if (!texto.equals(texto.strip())) {
            throw new IllegalArgumentException(prefijo + "no se permiten espacios al inicio ni al final.");
        }
        if (texto.matches("(?s).*\\s{2,}.*")) {
            throw new IllegalArgumentException(prefijo + "no se permiten espacios dobles.");
        }
        if (texto.length() < NORMA_MIN || texto.length() > NORMA_MAX) {
            throw new IllegalArgumentException(
                    prefijo + "debe tener entre " + NORMA_MIN + " y " + NORMA_MAX + " caracteres.");
        }
        if (texto.matches("[\\d\\s]+")) {
            throw new IllegalArgumentException(prefijo + "no puede contener solo números.");
        }
        if (!LETRA.matcher(texto).find()) {
            throw new IllegalArgumentException(prefijo + "debe contener texto descriptivo.");
        }
        if (!NORMA_CARACTERES.matcher(texto).matches()) {
            throw new IllegalArgumentException(prefijo + "contiene caracteres no permitidos.");
        }
        String compacto = texto.replaceAll("\\s", "");
        if (compacto.matches("(?i)(.)\\1+")) {
            throw new IllegalArgumentException(prefijo + "no puede ser un mismo carácter repetido.");
        }
        if (PATRON_REPETIDO.matcher(compacto).matches()) {
            throw new IllegalArgumentException(prefijo + "no puede ser un patrón repetitivo sin significado.");
        }
        String garabato = ValidacionPalabras.primerGarabato(texto);
        if (garabato != null) {
            throw new IllegalArgumentException(
                    prefijo + "\"" + garabato + "\" no parece una palabra. Escribe la norma con palabras reales.");
        }
    }

    /**
     * La norma particular nueva debe apuntar a un estudiante del registro. Al editar, además,
     * debe estar asociado al examen y no estar marcado como NO habilitado.
     */
    private void validarEstudianteDeNorma(NormaParticularRequest norma, Examen examen) {
        Integer idEstudiante = norma.idEstudiante();
        if (idEstudiante == null || !estudianteRepository.existsById(idEstudiante)) {
            throw new IllegalArgumentException(
                    "Norma particular: selecciona un estudiante registrado (" + norma.estudiante() + ").");
        }
        if (examen == null) {
            return;
        }
        List<AsistenciaExamen> asistencia = asistenciaExamenRepository.buscarDelExamen(
                examen.getId().getIdExamen(), examen.getId().getIdParalelo(), Set.of(idEstudiante));
        if (asistencia.isEmpty() || Boolean.FALSE.equals(asistencia.get(0).getHabilitado())) {
            throw new IllegalArgumentException(
                    "Norma particular: " + norma.estudiante() + " no está habilitado para este examen.");
        }
    }

    private Map<String, Object> resumen(Examen examen) {
        Map<String, Object> datos = new HashMap<>();
        datos.put("idMateria", examen.getIdMateria());
        datos.put("idDocente", examen.getIdDocente());
        datos.put("idAmbiente", examen.getIdAmbiente());
        datos.put("fecha", String.valueOf(examen.getFecha()));
        datos.put("horaInicio", String.valueOf(examen.getHoraInicio()));
        datos.put("duracionMinutos", examen.getDuracionMinutos());
        datos.put("estado", examen.getEstado());
        datos.put("normas", examen.getNormas());
        datos.put("modoReparto", examen.getModoReparto());
        return datos;
    }

    private void registrarAuditoria(String accion, Map<String, Object> detalles) {
        String email = SesionActual.email();
        if (email == null) {
            return;
        }
        Integer idUsuario = usuarioRepository.findByEmail(email).map(Usuario::getId).orElse(null);
        if (idUsuario == null) {
            return;
        }
        String json;
        try {
            json = objectMapper.writeValueAsString(detalles);
        } catch (JsonProcessingException e) {
            json = String.valueOf(detalles);
        }
        entityManager.createNativeQuery(
                        "INSERT INTO public.auditoria_operacion (id_usuario, accion, detalles) VALUES (:u, :a, :d)")
                .setParameter("u", idUsuario)
                .setParameter("a", accion)
                .setParameter("d", json)
                .executeUpdate();
    }

    /** Materias, nombres de docente y de ambiente de un grupo de exámenes, leídos en una consulta por tabla. */
    private record Catalogos(
            Map<Integer, Materia> materias,
            Map<Integer, String> docentes,
            Map<Integer, Ambiente> ambientes,
            Map<Integer, List<ExamenAula>> adicionales) {
    }

    private Catalogos catalogosDe(Collection<Examen> examenes) {
        Set<Integer> idsMateria = new HashSet<>();
        Set<Integer> idsDocente = new HashSet<>();
        Set<Integer> idsAmbiente = new HashSet<>();
        for (Examen examen : examenes) {
            idsMateria.add(examen.getIdMateria());
            idsDocente.add(examen.getIdDocente());
            idsAmbiente.add(examen.getIdAmbiente());
        }
        Map<Integer, Materia> materias = new HashMap<>();
        for (Materia materia : materiaRepository.findAllById(idsMateria)) {
            materias.put(materia.getId(), corregirSiglaSiEsNombre(materia));
        }
        Map<Integer, String> docentes = new HashMap<>();
        for (Docente docente : docenteRepository.findAllConUsuario(idsDocente)) {
            docentes.put(docente.getIdUsuario(),
                    docente.getUsuario().getNombre() + " " + docente.getUsuario().getApellidos());
        }
        Map<Integer, Ambiente> ambientes = new HashMap<>();
        for (Ambiente ambiente : ambienteRepository.findAllById(idsAmbiente)) {
            ambientes.put(ambiente.getId(), ambiente);
        }
        Set<Integer> idsExamen = examenes.stream().map(e -> e.getId().getIdExamen()).collect(Collectors.toSet());
        Map<Integer, List<ExamenAula>> adicionales = idsExamen.isEmpty() ? Map.of()
                : examenAulaRepository.adicionalesDe(idsExamen).stream()
                        .collect(Collectors.groupingBy(ea -> ea.getId().getIdExamen()));
        return new Catalogos(materias, docentes, ambientes, adicionales);
    }

    private ExamenResponse toResponse(Examen examen) {
        return toResponse(examen, catalogosDe(List.of(examen)));
    }

    private ExamenResponse toResponse(Examen examen, Catalogos catalogos) {
        NormasGuardadas normas = leerNormas(examen.getNormas());
        List<String> generales = normas.generales();
        List<NormaParticularRequest> particulares = normas.particulares();

        Materia materia = catalogos.materias().get(examen.getIdMateria());
        String asignatura = materia != null ? materia.getNombre() : "—";
        String sigla = materia != null ? materia.getSigla() : "—";
        String docenteNombre = catalogos.docentes().getOrDefault(examen.getIdDocente(), "—");
        Ambiente ambiente = catalogos.ambientes().get(examen.getIdAmbiente());
        String ambienteNombre = ambiente != null ? ambiente.getNombre() : "—";
        String ambienteUbicacion = ambiente != null ? ambiente.getUbicacion() : null;
        List<AulaExamenResponse> aulas = new ArrayList<>();
        aulas.add(new AulaExamenResponse(examen.getIdAmbiente(), ambienteNombre,
                ambiente != null ? ambiente.getCapacidad() : null, 0));
        catalogos.adicionales().getOrDefault(examen.getId().getIdExamen(), List.of()).stream()
                .sorted(Comparator.comparing(ExamenAula::getOrden))
                .forEach(ea -> aulas.add(new AulaExamenResponse(ea.getAmbiente().getId(),
                        ea.getAmbiente().getNombre(), ea.getAmbiente().getCapacidad(), ea.getOrden())));

        return new ExamenResponse(
                examen.getId().getIdExamen(),
                examen.getId().getIdParalelo(),
                asignatura,
                sigla,
                docenteNombre,
                examen.getFecha(),
                examen.getHoraInicio(),
                examen.getDuracionMinutos(),
                examen.getIdAmbiente(),
                ambienteNombre,
                ambienteUbicacion,
                examen.getEstado(),
                generales,
                particulares,
                examen.getIdMateria(),
                examen.getIdDocente(),
                aulas,
                examen.getModoReparto());
    }
}
