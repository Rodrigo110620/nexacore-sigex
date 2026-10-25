package com.nexacore.examenes.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.support.OpenEntityManagerInViewInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Open-in-view igual que el de Spring Boot, salvo en las notificaciones en vivo: esa petición queda
 * abierta mientras la pestaña esté abierta y retendría una conexión del pool de la base. Con unas
 * pocas pestañas el pool se agotaba y el resto de la API respondía 500.
 */
@Configuration
public class OpenInViewConfig implements WebMvcConfigurer {

    private final EntityManagerFactory entityManagerFactory;

    public OpenInViewConfig(EntityManagerFactory entityManagerFactory) {
        this.entityManagerFactory = entityManagerFactory;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        OpenEntityManagerInViewInterceptor interceptor = new OpenEntityManagerInViewInterceptor();
        interceptor.setEntityManagerFactory(entityManagerFactory);
        registry.addWebRequestInterceptor(interceptor).excludePathPatterns("/notificaciones/stream", "/mi/eventos");
    }
}
