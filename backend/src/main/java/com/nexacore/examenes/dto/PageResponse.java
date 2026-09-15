package com.nexacore.examenes.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Respuesta paginada genérica, reutilizable por cualquier listado.
 *
 * Evita serializar directamente el Page de Spring Data, cuyo JSON
 * incluye campos internos (pageable, sort...) que el frontend no necesita.
 *
 * @param contenido      elementos de la página actual
 * @param pagina         número de página, empezando en 0
 * @param tamano         cantidad máxima de elementos por página
 * @param totalRegistros total de elementos en todas las páginas
 * @param totalPaginas   total de páginas disponibles
 */
public record PageResponse<T>(
        List<T> contenido,
        int pagina,
        int tamano,
        long totalRegistros,
        int totalPaginas
) {

    /** Construye la respuesta a partir de un Page de Spring Data. */
    public static <T> PageResponse<T> de(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}
