package com.nexacore.examenes.services;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.repositories.ExamenControlRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.dto.PersonalControlResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/** Unidad: asignar personal de control sin conflictos de horario. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExamenControlServiceTests {

    private static final int EXAMEN = 50;
    private static final int OTRO_EXAMEN = 51;
    private static final int USUARIO_CONFLICTO = 10;
    private static final int USUARIO_LIBRE = 11;
    private static final LocalDate FECHA = LocalDate.of(2026, 12, 1);

    @Mock ExamenRepository examenRepository;
    @Mock ExamenControlRepository controlRepository;
    @Mock NamedParameterJdbcTemplate jdbc;
    ExamenControlService service;

    @BeforeEach
    void preparar() {
        service = new ExamenControlService(jdbc, controlRepository, examenRepository,
                org.mockito.Mockito.mock(com.nexacore.examenes.services.NotificacionService.class));
        // Cualquier id de usuario pedido se considera personal de control activo (rol CONTROL).
        // Devuelve un elemento para que validos.size() coincida con pedidos.size() (un usuario por prueba).
        lenient().when(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class), any(Class.class)))
                .thenReturn(List.of(1));
        // delExamen del servicio usa jdbc.query; devolver lista vacía para no depender de la BD.
        lenient().when(jdbc.query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.of());
    }

    private Examen examenConHorario(int idExamen, LocalTime inicio, int duracion) {
        ExamenId id = new ExamenId();
        id.setIdExamen(idExamen);
        id.setIdParalelo(1);
        Examen e = new Examen();
        e.setId(id);
        e.setFecha(FECHA);
        e.setHoraInicio(inicio);
        e.setDuracionMinutos(duracion);
        e.setEstado("programado");
        return e;
    }

    @Test
    void asignarRechazaPersonalConConflictoDeHorario() {
        Examen examen = examenConHorario(EXAMEN, LocalTime.of(9, 0), 60);
        Examen otro = examenConHorario(OTRO_EXAMEN, LocalTime.of(9, 0), 60);
        when(examenRepository.existsByIdIdExamen(EXAMEN)).thenReturn(true);
        when(examenRepository.findFirstByIdIdExamen(EXAMEN)).thenReturn(Optional.of(examen));
        when(examenRepository.findFirstByIdIdExamen(OTRO_EXAMEN)).thenReturn(Optional.of(otro));
        when(controlRepository.examenesDe(USUARIO_CONFLICTO)).thenReturn(List.of(OTRO_EXAMEN));
        when(controlRepository.saveAllAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));


        assertThatThrownBy(() -> service.asignar(EXAMEN, List.of(USUARIO_CONFLICTO)))
                .isInstanceOf(ControlIngresoException.class)
                .hasMessageContaining("ya tiene un examen el");
    }

    @Test
    void asignarPermitePersonalSinConflicto() {
        Examen examen = examenConHorario(EXAMEN, LocalTime.of(9, 0), 60);
        when(examenRepository.existsByIdIdExamen(EXAMEN)).thenReturn(true);
        when(examenRepository.findFirstByIdIdExamen(EXAMEN)).thenReturn(Optional.of(examen));
        when(controlRepository.examenesDe(USUARIO_LIBRE)).thenReturn(List.of());
        when(controlRepository.saveAllAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));


        List<PersonalControlResponse> resultado = service.asignar(EXAMEN, List.of(USUARIO_LIBRE));
        assertThat(resultado).isNotNull();
    }

    @Test
    void asignarPermiteMismoPersonalMismaFechaSinSolapamiento() {
        Examen examen = examenConHorario(EXAMEN, LocalTime.of(9, 0), 60);     // 09:00-10:00
        Examen otro = examenConHorario(OTRO_EXAMEN, LocalTime.of(11, 0), 60); // 11:00-12:00, mismo día
        when(examenRepository.existsByIdIdExamen(EXAMEN)).thenReturn(true);
        when(examenRepository.findFirstByIdIdExamen(EXAMEN)).thenReturn(Optional.of(examen));
        when(examenRepository.findFirstByIdIdExamen(OTRO_EXAMEN)).thenReturn(Optional.of(otro));
        when(controlRepository.examenesDe(USUARIO_CONFLICTO)).thenReturn(List.of(OTRO_EXAMEN));
        when(controlRepository.saveAllAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));


        List<PersonalControlResponse> resultado = service.asignar(EXAMEN, List.of(USUARIO_CONFLICTO));
        assertThat(resultado).isNotNull();
    }

    @Test
    void asignarPermiteMismoPersonalDiferenteFecha() {
        Examen examen = examenConHorario(EXAMEN, LocalTime.of(9, 0), 60);
        Examen otro = examenConHorario(OTRO_EXAMEN, LocalTime.of(9, 0), 60);
        otro.setFecha(FECHA.plusDays(1)); // mismo horario, otro día
        when(examenRepository.existsByIdIdExamen(EXAMEN)).thenReturn(true);
        when(examenRepository.findFirstByIdIdExamen(EXAMEN)).thenReturn(Optional.of(examen));
        when(examenRepository.findFirstByIdIdExamen(OTRO_EXAMEN)).thenReturn(Optional.of(otro));
        when(controlRepository.examenesDe(USUARIO_CONFLICTO)).thenReturn(List.of(OTRO_EXAMEN));
        when(controlRepository.saveAllAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));


        List<PersonalControlResponse> resultado = service.asignar(EXAMEN, List.of(USUARIO_CONFLICTO));
        assertThat(resultado).isNotNull();
    }

    @Test
    void asignarExcluyeElPropioExamenAlReasignar() {
        Examen examen = examenConHorario(EXAMEN, LocalTime.of(9, 0), 60);
        // El usuario ya está asignado a este mismo examen: se está reasignando, no debe chocar consigo mismo.
        when(examenRepository.existsByIdIdExamen(EXAMEN)).thenReturn(true);
        when(examenRepository.findFirstByIdIdExamen(EXAMEN)).thenReturn(Optional.of(examen));
        when(controlRepository.examenesDe(USUARIO_LIBRE)).thenReturn(List.of(EXAMEN));
        when(controlRepository.saveAllAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));


        List<PersonalControlResponse> resultado = service.asignar(EXAMEN, List.of(USUARIO_LIBRE));
        assertThat(resultado).isNotNull();
    }
}
