package com.nexacore.examenes.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter
@Entity
@Table(name = "estudiante_qr_credencial")
public class EstudianteQrCredencial {
    @Id @Column(name = "id_estudiante") private Integer idEstudiante;
    @Column(name = "hash_credencial", nullable = false, unique = true, length = 64) private String hashCredencial;
    @Column(nullable = false) private UUID version;
    @Column(nullable = false) private boolean revocado;
    @Column(name = "generado_en", nullable = false) private LocalDateTime generadoEn;
}
