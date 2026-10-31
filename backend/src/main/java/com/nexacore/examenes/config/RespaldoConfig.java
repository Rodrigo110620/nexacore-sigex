package com.nexacore.examenes.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Habilita el respaldo automático de la base (RespaldoService#respaldoProgramado). */
@Configuration
@EnableScheduling
public class RespaldoConfig {
}
