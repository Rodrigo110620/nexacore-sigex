package com.nexacore.examenes.dto;

/** Un grupo (paralelo) de una materia con cuántos estudiantes inscritos tiene. */
public record GrupoResponse(Integer idParalelo, String nombreGrupo, long inscritos) {}
