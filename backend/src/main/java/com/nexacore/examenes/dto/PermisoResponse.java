package com.nexacore.examenes.dto;

/** Un permiso del catálogo, agrupado por módulo. */
public record PermisoResponse(String codigo, String modulo, String descripcion,
                              /** Solo del ADMIN: no se puede asignar a un rol extra. */
                              boolean soloAdmin) {}
